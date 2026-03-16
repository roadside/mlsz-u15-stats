import os
import re
import json
import requests
from bs4 import BeautifulSoup

BASE = "https://adatbank.mlsz.hu/league/65/0/31621/{}.html"
MATCH_URL_BASE = "https://adatbank.mlsz.hu"

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
WEB_DATA_DIR = os.path.join(PROJECT_ROOT, "web", "data")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(WEB_DATA_DIR, exist_ok=True)

OUTPUT_FILE = os.path.join(DATA_DIR, "matches.json")
WEB_OUTPUT_FILE = os.path.join(WEB_DATA_DIR, "matches.json")

PLAYED_SCORE_RE = re.compile(r"^\d+\s*-\s*\d+$")
FULL_DATE_RE = re.compile(r"^\d{4}\.\s*\d{2}\.\s*\d{2}\.$")
SHORT_DATE_RE = re.compile(r"^\d{2}[.-]\s*\d{2}\.$|^\d{2}[.-]\d{2}$")
TIME_RE = re.compile(r"^\d{1,2}:\d{2}$")
MATCH_HREF_RE = re.compile(r"^/match/")

STOP_MARKERS = {
    "Góllövő lista",
    "Sárga lapok",
    "Piros lapok",
    "Tabella",
    "Félidei tabella",
    "Hazai / Vendég",
    "Aktuális forma",
    "Kereszttabella",
}

def clean_line(text: str) -> str:
    text = text.replace("\xa0", " ")
    text = re.sub(r"【\d+†", "", text)
    text = text.replace("】", "")
    text = re.sub(r"^#+\s*", "", text)
    text = " ".join(text.split()).strip()
    return text

def normalize_lines(text: str):
    lines = []
    for raw in text.splitlines():
        line = clean_line(raw)
        if not line:
            continue
        if line == "Image":
            continue
        lines.append(line)
    return lines

def detect_status_and_score(token: str):
    lower = token.lower()
    if "halaszt" in lower:
        return None, None, "Halasztva"
    if "elmarad" in lower:
        return None, None, "Elmaradt"
    if PLAYED_SCORE_RE.fullmatch(token):
        a, b = [int(x.strip()) for x in token.split("-")]
        return a, b, "Lejátszva"
    return None, None, "Kiírva"

def extract_match_urls(soup) -> list[str]:
    """Kigyűjti a meccs-szintű URL-eket a forduló oldaláról."""
    urls = []
    for a in soup.find_all("a", href=MATCH_HREF_RE):
        href = a["href"]
        full_url = MATCH_URL_BASE + href if href.startswith("/") else href
        if full_url not in urls:
            urls.append(full_url)
    return urls

def parse_round(round_num: int):
    url = BASE.format(round_num)
    response = requests.get(url, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, "html.parser")
    text = soup.get_text("\n")
    lines = normalize_lines(text)

    # Meccs URL-ek kiszedése a linkekből
    match_urls = extract_match_urls(soup)
    print(f"  {round_num}. forduló: {len(match_urls)} match URL találva")

    try:
        start_idx = lines.index("Sorsolás")
    except ValueError:
        raise RuntimeError(f"Nincs 'Sorsolás' blokk: {round_num}")

    end_idx = len(lines)
    for i in range(start_idx + 1, len(lines)):
        if lines[i] in STOP_MARKERS:
            end_idx = i
            break

    block = lines[start_idx + 1:end_idx]

    matches = []
    match_url_idx = 0
    i = 0

    while i < len(block):
        # Lejátszott minta: home, score, away, full_date, time, venue
        if i + 5 < len(block):
            home = block[i]
            score = block[i + 1]
            away = block[i + 2]
            full_date = block[i + 3]
            time_value = block[i + 4]
            venue = block[i + 5]

            if (
                PLAYED_SCORE_RE.fullmatch(score)
                and FULL_DATE_RE.fullmatch(full_date)
                and TIME_RE.fullmatch(time_value)
            ):
                home_goals, away_goals = [int(x.strip()) for x in score.split("-")]
                match_url = match_urls[match_url_idx] if match_url_idx < len(match_urls) else None
                match_url_idx += 1

                matches.append({
                    "round": round_num,
                    "date": f"{full_date} {time_value}",
                    "home": home,
                    "away": away,
                    "home_goals": home_goals,
                    "away_goals": away_goals,
                    "status": "Lejátszva",
                    "venue": venue,
                    "source_url": url,
                    "match_url": match_url,
                })

                i += 6
                continue

        # Kiírt minta: home, short_date, time, away, full_date, time, venue
        if i + 6 < len(block):
            home = block[i]
            short_date = block[i + 1]
            short_time = block[i + 2]
            away = block[i + 3]
            full_date = block[i + 4]
            full_time = block[i + 5]
            venue = block[i + 6]

            if (
                SHORT_DATE_RE.fullmatch(short_date)
                and TIME_RE.fullmatch(short_time)
                and FULL_DATE_RE.fullmatch(full_date)
                and TIME_RE.fullmatch(full_time)
            ):
                matches.append({
                    "round": round_num,
                    "date": f"{full_date} {full_time}",
                    "home": home,
                    "away": away,
                    "home_goals": None,
                    "away_goals": None,
                    "status": "Kiírva",
                    "venue": venue,
                    "source_url": url,
                    "match_url": None,
                })

                i += 7
                continue

        # Kiírt minta időpont nélkül: home, short_date, away, full_date, venue
        if i + 4 < len(block):
            home = block[i]
            short_date = block[i + 1]
            away = block[i + 2]
            full_date = block[i + 3]
            venue = block[i + 4]

            if (
                SHORT_DATE_RE.fullmatch(short_date)
                and FULL_DATE_RE.fullmatch(full_date)
                and not PLAYED_SCORE_RE.fullmatch(away)
            ):
                matches.append({
                    "round": round_num,
                    "date": full_date,
                    "home": home,
                    "away": away,
                    "home_goals": None,
                    "away_goals": None,
                    "status": "Kiírva",
                    "venue": venue,
                    "source_url": url,
                    "match_url": None,
                })

                i += 5
                continue

        i += 1

    return matches

all_matches = []

for round_num in range(1, 23):
    round_matches = parse_round(round_num)
    print(f"{round_num}. forduló: {len(round_matches)} meccs")
    all_matches.extend(round_matches)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_matches, f, ensure_ascii=False, indent=2)

with open(WEB_OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_matches, f, ensure_ascii=False, indent=2)

print(f"Mentve: {OUTPUT_FILE}")
print(f"Mentve: {WEB_OUTPUT_FILE}")
print(f"Meccsek száma: {len(all_matches)}")
