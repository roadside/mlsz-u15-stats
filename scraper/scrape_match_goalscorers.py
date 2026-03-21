import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from utils import clean_player_name, clean_text, get_project_paths, ensure_directories

LEAGUE_ID = 65
SEASON_ID = 0
COMPETITION_ID = 31621

HEADERS = {
    "User-Agent": "Mozilla/5.0",
}

paths = get_project_paths()
ensure_directories()

MATCHES_FILE = os.path.join(paths['data_dir'], "matches.json")
CARDS_FILE = os.path.join(paths['data_dir'], "cards.json")
OUTPUT_FILE = os.path.join(paths['data_dir'], "match_goalscorers.json")
WEB_OUTPUT_FILE = os.path.join(paths['web_data_dir'], "match_goalscorers.json")




def find_match_url_by_teams(match: dict) -> str | None:
    round_url = match.get("source_url")
    if not round_url:
        return None

    try:
        response = requests.get(round_url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            full_url = urljoin("https://adatbank.mlsz.hu", href)

            if (
                f"/match/{LEAGUE_ID}/{SEASON_ID}/{COMPETITION_ID}/" in full_url
                and full_url.endswith(".html")
            ):
                link_text = clean_text(a.get_text()).upper()
                home = match["home"].upper()
                away = match["away"].upper()

                has_home = home in link_text
                has_away = away in link_text

                if has_home and has_away:
                    return full_url

                normalized_link = re.sub(r"\s+", " ", link_text.replace("–", "-").replace("—", "-")).strip()
                exact_pair = f"{home} - {away}"
                reverse_pair = f"{away} - {home}"

                if normalized_link == exact_pair or normalized_link == reverse_pair:
                    return full_url

    except Exception as e:
        print(f"  Hiba URL kinyerésekor a forduló oldaláról: {e}")

    return None


def parse_goal_minutes(player_cell) -> list[int]:
    if not player_cell:
        return []

    minutes = []
    info_blocks = player_cell.find_all("div", class_="goals_info")
    for info in info_blocks:
        info_text = clean_text(info.get_text(" ", strip=True))
        for match in re.finditer(r"(\d{1,3})\s*'", info_text):
            try:
                minutes.append(int(match.group(1)))
            except ValueError:
                pass

    if minutes:
        return minutes

    text = clean_text(player_cell.get_text(" ", strip=True))
    for match in re.finditer(r"(\d{1,3})'", text):
        try:
            minutes.append(int(match.group(1)))
        except ValueError:
            pass

    return minutes


def build_scorer_rows(scorers: dict[str, list[int]]) -> list[dict]:
    rows = []
    for player, minutes in scorers.items():
        ordered_minutes = sorted(minutes)
        rows.append({
            "player": player,
            "goals": len(ordered_minutes),
            "minutes": ordered_minutes,
        })

    return sorted(rows, key=lambda row: (-row["goals"], row["minutes"], row["player"]))


def is_goal_icon(cell) -> bool:
    if not cell:
        return False

    html = str(cell)
    return "event_goal" in html or "event_goal_penal" in html or "goal.png" in html


def extract_goal_minutes_from_cell(cell) -> list[int]:
    if not cell:
        return []

    minutes: list[int] = []

    for span in cell.find_all("span"):
        style = span.get("style", "")
        if "event_goal" not in style and "goal.png" not in style:
            continue

        minute_text = clean_text(span.get_text(" ", strip=True))
        for match in re.finditer(r"(\d{1,3})\s*'", minute_text):
            try:
                minutes.append(int(match.group(1)))
            except ValueError:
                pass

    return minutes


def parse_timeline_goal_rows(soup: BeautifulSoup) -> dict:
    home_scorers: dict[str, list[int]] = {}
    away_scorers: dict[str, list[int]] = {}

    for row in soup.find_all("tr"):
        cards_cell = row.find("td", class_="match_players_cards")
        if not is_goal_icon(cards_cell):
            continue

        player_link = row.find("a", class_="match_players_name")
        if not player_link:
            continue

        player_name = clean_player_name(player_link.get_text(" ", strip=True))
        if not player_name:
            continue

        minutes = extract_goal_minutes_from_cell(cards_cell)
        if not minutes:
            minutes = [0]

        parent_table = row.find_parent("table")
        table_classes = parent_table.get("class", []) if parent_table else []
        table_class_text = " ".join(table_classes)

        if "left" in table_class_text:
            home_scorers.setdefault(player_name, []).extend(minutes)
            continue

        if "right" in table_class_text:
            away_scorers.setdefault(player_name, []).extend(minutes)
            continue

        previous_header = row.find_previous(["h3", "h4", "div"])
        header_text = clean_text(previous_header.get_text(" ", strip=True)).upper() if previous_header else ""

        if "DVTK" in header_text or "VENDÉG" in header_text:
            away_scorers.setdefault(player_name, []).extend(minutes)
        else:
            home_scorers.setdefault(player_name, []).extend(minutes)

    return {
        "home_scorers": build_scorer_rows(home_scorers),
        "away_scorers": build_scorer_rows(away_scorers),
    }


def parse_match_page(match_url: str) -> dict:
    """Kiszedi a góllövőket és a gólperceket az MLSZ meccs statikus goals táblájából."""
    try:
        response = requests.get(match_url, timeout=30)
        response.raise_for_status()
    except Exception as e:
        print(f"  Hiba ({match_url}): {e}")
        return {"home_scorers": [], "away_scorers": []}

    soup = BeautifulSoup(response.content, "html.parser")

    home_scorers: dict[str, list[int]] = {}
    away_scorers: dict[str, list[int]] = {}

    goals_block = soup.find("div", class_="goals")
    if goals_block:
        goals_table = goals_block.find("table")
        if goals_table:
            for row in goals_table.find_all("tr"):
                left_player_cell = row.find("td", class_="left_team_player")
                right_player_cell = row.find("td", class_="right_team_player")

                left_player = ""
                right_player = ""

                if left_player_cell:
                    left_link = left_player_cell.find("a")
                    left_player = clean_player_name(left_link.get_text(" ", strip=True) if left_link else left_player_cell.get_text(" ", strip=True))

                if right_player_cell:
                    right_link = right_player_cell.find("a")
                    right_player = clean_player_name(right_link.get_text(" ", strip=True) if right_link else right_player_cell.get_text(" ", strip=True))

                left_minutes = parse_goal_minutes(left_player_cell)
                right_minutes = parse_goal_minutes(right_player_cell)

                if left_player:
                    if left_minutes:
                        home_scorers.setdefault(left_player, []).extend(left_minutes)
                    else:
                        home_scorers.setdefault(left_player, []).append(0)

                if right_player:
                    if right_minutes:
                        away_scorers.setdefault(right_player, []).extend(right_minutes)
                    else:
                        away_scorers.setdefault(right_player, []).append(0)

    if home_scorers or away_scorers:
        return {
            "home_scorers": build_scorer_rows(home_scorers),
            "away_scorers": build_scorer_rows(away_scorers),
        }

    return parse_timeline_goal_rows(soup)


with open(MATCHES_FILE, encoding="utf-8") as f:
    all_matches = json.load(f)

cards_by_key = {}
if os.path.exists(CARDS_FILE):
    with open(CARDS_FILE, encoding="utf-8") as f:
        all_cards = json.load(f)

    for card_match in all_cards:
        key = (card_match.get("round"), card_match.get("home"), card_match.get("away"))
        if card_match.get("match_url"):
            cards_by_key[key] = card_match["match_url"]

result = []

for m in all_matches:
    if m["status"] != "Lejátszva":
        continue
    if m["round"] < 13:
        continue
    match_key = (m.get("round"), m.get("home"), m.get("away"))
    match_url = m.get("match_url") or cards_by_key.get(match_key) or find_match_url_by_teams(m)
    if not match_url:
        print(f"  Nincs meccs URL: {m['round']}. ford. {m['home']} vs {m['away']}")
        continue

    print(f"  {m['round']}. ford. {m['home']} vs {m['away']}")
    scorers = parse_match_page(match_url)

    result.append({
        "round": m["round"],
        "home": m["home"],
        "away": m["away"],
        "home_scorers": scorers["home_scorers"],
        "away_scorers": scorers["away_scorers"],
    })

    time.sleep(0.3)  # udvarias scraping

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

with open(WEB_OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Mentve: {OUTPUT_FILE}")
print(f"Meccsek feldolgozva: {len(result)}")
