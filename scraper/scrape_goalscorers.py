import os
import re
import json
import requests
from bs4 import BeautifulSoup
from utils import clean_text, normalize_lines, get_project_paths, ensure_directories

BASE = "https://adatbank.mlsz.hu/goalshooter/65/0/31621/{}.html"
MAX_GOALSCORER_ROUND = 14

paths = get_project_paths()
ensure_directories()

OUTPUT_FILE = os.path.join(paths['data_dir'], "goalscorers.json")
WEB_OUTPUT_FILE = os.path.join(paths['web_data_dir'], "goalscorers.json")

STOP_MARKERS = {
    "Hibabejelentő",
    "Főszponzoraink",
    "Szponzoraink",
    "Kapcsolat",
    "Adatvédelem",
    "Impresszum",
}


def parse_round(round_num: int):
    url = BASE.format(round_num)
    response = requests.get(url, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, "html.parser")
    text = soup.get_text("\n")
    lines = normalize_lines(text)

    title = f"Góllövő lista - {round_num}. forduló"

    start_idx = -1
    for i, line in enumerate(lines):
        if title in line:
            start_idx = i
            break

    if start_idx == -1:
        raise RuntimeError(f"Nem található góllövőlista cím: {round_num}")

    # A fejléc széttörve van:
    # hely.
    # góllövő neve
    # gól
    # egyesület
    header_idx = -1
    for i in range(start_idx + 1, len(lines) - 3):
        if (
            lines[i].lower() == "hely."
            and lines[i + 1].lower() == "góllövő neve"
            and lines[i + 2].lower() == "gól"
            and lines[i + 3].lower() == "egyesület"
        ):
            header_idx = i
            break

    if header_idx == -1:
        print(f"\n=== DEBUG GÓLLÖVŐK {round_num}. forduló első 40 sor a cím után ===")
        for idx, line in enumerate(lines[start_idx + 1:start_idx + 41]):
            print(f"{idx}: {repr(line)}")
        print("=== DEBUG VÉGE ===\n")
        raise RuntimeError(f"Nem található góllövőlista fejléc: {round_num}")

    block = lines[header_idx + 4:]

    rows = []
    i = 0

    while i + 3 < len(block):
        if block[i] in STOP_MARKERS:
            break

        pos = block[i]
        player = block[i + 1]
        goals = block[i + 2]
        team = block[i + 3]

        if pos.isdigit() and goals.isdigit():
            rows.append({
                "round": round_num,
                "pos": pos,
                "player": player,
                "team": team,
                "goals": goals,
                "source_url": url
            })
            i += 4
            continue

        # ha már vannak sorok, és utána nem rekord jön, megállunk
        if rows:
            break

        i += 1

    return {
        "round": round_num,
        "goalscorers": rows
    }


all_rounds = []

for round_num in range(1, MAX_GOALSCORER_ROUND + 1):
    round_data = parse_round(round_num)
    print(f"{round_num}. forduló góllövők: {len(round_data['goalscorers'])}")
    all_rounds.append(round_data)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_rounds, f, ensure_ascii=False, indent=2)

with open(WEB_OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_rounds, f, ensure_ascii=False, indent=2)

print(f"Mentve: {OUTPUT_FILE}")
print(f"Mentve: {WEB_OUTPUT_FILE}")
print(f"Maximális góllövőlista forduló: {MAX_GOALSCORER_ROUND}")
print(f"Fordulók száma: {len(all_rounds)}")