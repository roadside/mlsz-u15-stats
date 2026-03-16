import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
WEB_DATA_DIR = os.path.join(PROJECT_ROOT, "web", "data")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(WEB_DATA_DIR, exist_ok=True)

MATCHES_FILE = os.path.join(DATA_DIR, "matches.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "match_goalscorers.json")
WEB_OUTPUT_FILE = os.path.join(WEB_DATA_DIR, "match_goalscorers.json")


def clean(text: str) -> str:
    text = text.replace("\xa0", " ")
    text = re.sub(r"\d{1,3}'", "", text)   # eltávolítja a perceket pl. "5'"
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_match_page(match_url: str) -> dict:
    """Kiszedi a góllövőket az MLSZ meccs-szintű oldaláról HTML táblázat alapján."""
    try:
        response = requests.get(match_url, timeout=30)
        response.raise_for_status()
    except Exception as e:
        print(f"  Hiba ({match_url}): {e}")
        return {"home_scorers": [], "away_scorers": []}

    soup = BeautifulSoup(response.content, "html.parser")

    home_scorers: dict[str, int] = {}
    away_scorers: dict[str, int] = {}

    # Keressük a gól-táblázat sorait:
    # Minden sorban 3 cella: [hazai játékos | állás | vendég játékos]
    # Ha a bal cella nem üres → hazai gól, ha a jobb → vendég gól
    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 3:
            continue

        middle = cells[1].get_text(" ", strip=True)

        # Csak gól-sorokat dolgozunk fel: a középső cella "X - Y" állást tartalmaz
        if not re.match(r"^\d+\s*[-–]\s*\d+$", middle.strip()):
            continue

        left = clean(cells[0].get_text(" ", strip=True))
        right = clean(cells[-1].get_text(" ", strip=True))

        if left:
            home_scorers[left] = home_scorers.get(left, 0) + 1

        if right:
            away_scorers[right] = away_scorers.get(right, 0) + 1

    return {
        "home_scorers": [{"player": p, "goals": g} for p, g in home_scorers.items()],
        "away_scorers": [{"player": p, "goals": g} for p, g in away_scorers.items()],
    }


with open(MATCHES_FILE, encoding="utf-8") as f:
    all_matches = json.load(f)

result = []

for m in all_matches:
    if m["status"] != "Lejátszva":
        continue
    match_url = m.get("match_url")
    if not match_url:
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
