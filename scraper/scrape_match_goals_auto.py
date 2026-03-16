import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

LEAGUE_ID = 65
SEASON_ID = 0
COMPETITION_ID = 31621

HEADERS = {
    "User-Agent": "Mozilla/5.0",
}

MATCH_LINK_RE = re.compile(
    rf"^/match/{LEAGUE_ID}/{SEASON_ID}/{COMPETITION_ID}/\d+/\d+\.html$"
)

STOP_MARKERS = {
    "Sárga lapok",
    "Piros lapok",
    "Csere",
    "Játékvezetők",
    "Kispad",
    "Összeállítás",
    "Kezdőcsapat",
    "Statisztika",
    "Kapcsolódó",
    "Tabella",
    "Aktuális forma",
    "Kereszttabella",
    "Hibabejelentő",
    "Főszponzoraink",
    "Szponzoraink",
    "Kapcsolat",
    "Adatvédelem",
    "Impresszum",
}

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
WEB_DATA_DIR = os.path.join(PROJECT_ROOT, "web", "data")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(WEB_DATA_DIR, exist_ok=True)

MATCHES_FILE = os.path.join(DATA_DIR, "matches.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "match_goals.json")
WEB_OUTPUT_FILE = os.path.join(WEB_DATA_DIR, "match_goals.json")


def clean_text(text: str) -> str:
    text = text.replace("\xa0", " ")
    text = re.sub(r"【\d+†\s*", "", text)
    text = text.replace("】", "")
    text = text.replace("Image:", "")
    text = text.replace("Image", "")
    text = text.replace("⚽", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_lines(text: str) -> list[str]:
    lines: list[str] = []
    for raw in text.splitlines():
        line = clean_text(raw)
        if not line:
            continue
        lines.append(line)
    return lines


def fetch_soup(url: str) -> BeautifulSoup:
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.content, "html.parser")


def extract_match_links(round_url: str) -> list[str]:
    soup = fetch_soup(round_url)

    urls: list[str] = []
    seen: set[str] = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        full_url = urljoin("https://adatbank.mlsz.hu", href)

        if (
            f"/match/{LEAGUE_ID}/{SEASON_ID}/{COMPETITION_ID}/" in full_url
            and full_url.endswith(".html")
        ):
            if full_url not in seen:
                seen.add(full_url)
                urls.append(full_url)

    return urls


def parse_goal_line(line: str):
    line = clean_text(line)

    home_pattern = re.compile(
        r"^(?P<player>.+?)\s+(?P<minute>\d{1,3})'\s+(?P<score>\d+\s*-\s*\d+)$"
    )
    away_pattern = re.compile(
        r"^(?P<score>\d+\s*-\s*\d+)\s+(?P<minute>\d{1,3})'\s+(?P<player>.+)$"
    )

    m_home = home_pattern.match(line)
    if m_home:
        return {
            "side": "home",
            "player": m_home.group("player").strip(),
            "minute": int(m_home.group("minute")),
            "score_after": m_home.group("score").replace(" ", ""),
        }

    m_away = away_pattern.match(line)
    if m_away:
        return {
            "side": "away",
            "player": m_away.group("player").strip(),
            "minute": int(m_away.group("minute")),
            "score_after": m_away.group("score").replace(" ", ""),
        }

    return None


def parse_match_goals(match_url: str) -> tuple[list[dict], list[dict]]:
    soup = fetch_soup(match_url)

    goals_section = soup.select_one("div.goals table.data-row")
    if not goals_section:
        return [], []

    home_scorers: list[dict] = []
    away_scorers: list[dict] = []

    rows = goals_section.select("tbody tr")
    if not rows:
        rows = goals_section.select("tr")

    for row in rows:
        left_td = row.select_one("td.left_team_player")
        score_td = row.select_one("td.goals_intimes")
        right_td = row.select_one("td.right_team_player")

        if not score_td:
            continue

        score_after = clean_text(score_td.get_text(" ", strip=True)).replace(" ", "")

        # Hazai gól
        if left_td:
            player_link = left_td.select_one("a")
            minute_p = left_td.select_one("div.goals_info p")

            player = clean_text(player_link.get_text(" ", strip=True)) if player_link else ""
            minute_text = clean_text(minute_p.get_text(" ", strip=True)) if minute_p else ""

            if player and minute_text.isdigit():
                home_scorers.append({
                    "player": player,
                    "minute": int(minute_text),
                    "score_after": score_after,
                })

        # Vendég gól
        if right_td:
            player_link = right_td.select_one("a")
            minute_p = right_td.select_one("div.goals_info p")

            player = clean_text(player_link.get_text(" ", strip=True)) if player_link else ""
            minute_text = clean_text(minute_p.get_text(" ", strip=True)) if minute_p else ""

            if player and minute_text.isdigit():
                away_scorers.append({
                    "player": player,
                    "minute": int(minute_text),
                    "score_after": score_after,
                })

    return home_scorers, away_scorers


def load_matches() -> list[dict]:
    with open(MATCHES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def attach_match_urls(matches: list[dict]) -> list[dict]:
    by_round: dict[int, list[dict]] = {}

    for match in matches:
        by_round.setdefault(match["round"], []).append(match)

    for round_num, round_matches in by_round.items():
        round_url = round_matches[0]["source_url"]
        detail_urls = extract_match_links(round_url)

        if len(detail_urls) != len(round_matches):
            print(
                f"FIGYELEM: {round_num}. forduló - "
                f"matches.json: {len(round_matches)}, detail linkek: {len(detail_urls)}"
            )

        for index, match in enumerate(round_matches):
            match["match_url"] = detail_urls[index] if index < len(detail_urls) else None

    return matches


def build_output(matches: list[dict]) -> list[dict]:
    result: list[dict] = []

    for match in matches:
        match_url = match.get("match_url")

        if not match_url:
            result.append({
                "round": match["round"],
                "date": match["date"],
                "home": match["home"],
                "away": match["away"],
                "match_url": None,
                "home_scorers": [],
                "away_scorers": [],
            })
            continue

        try:
            home_scorers, away_scorers = parse_match_goals(match_url)
        except Exception as e:
            print(f"HIBA: {match_url} -> {e}")
            home_scorers, away_scorers = [], []

        result.append({
            "round": match["round"],
            "date": match["date"],
            "home": match["home"],
            "away": match["away"],
            "match_url": match_url,
            "home_scorers": home_scorers,
            "away_scorers": away_scorers,
        })

        print(
            f"{match['round']}. forduló | {match['home']} - {match['away']} | "
            f"{len(home_scorers)} hazai gól, {len(away_scorers)} vendég gól"
        )
        time.sleep(0.4)

    return result


def main():
    matches = load_matches()
    matches = attach_match_urls(matches)
    output = build_output(matches)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    with open(WEB_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Mentve: {OUTPUT_FILE}")
    print(f"Mentve: {WEB_OUTPUT_FILE}")


if __name__ == "__main__":
    main()
