import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup
from utils import clean_player_name, get_project_paths, ensure_directories

paths = get_project_paths()
ensure_directories()

MATCHES_FILE = os.path.join(paths['data_dir'], "matches.json")
OUTPUT_FILE = os.path.join(paths['data_dir'], "match_goalscorers.json")
WEB_OUTPUT_FILE = os.path.join(paths['web_data_dir'], "match_goalscorers.json")




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

        left = clean_player_name(cells[0].get_text(" ", strip=True))
        right = clean_player_name(cells[-1].get_text(" ", strip=True))

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
