import os
import re
import json
import requests
from bs4 import BeautifulSoup

BASE = "https://adatbank.mlsz.hu/league/65/0/31621/{}.html"

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
WEB_DATA_DIR = os.path.join(PROJECT_ROOT, "web", "data")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(WEB_DATA_DIR, exist_ok=True)

OUTPUT_FILE = os.path.join(DATA_DIR, "tables.json")
WEB_OUTPUT_FILE = os.path.join(WEB_DATA_DIR, "tables.json")

FORM_RE = re.compile(r"^(GY|D|V)(?:\s+(GY|D|V))*$")
INT_RE = re.compile(r"^-?\d+$")


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
        if not line or line == "Image":
            continue
        lines.append(line)
    return lines


def parse_round(round_num: int):
    url = BASE.format(round_num)
    response = requests.get(url, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, "html.parser")
    text = soup.get_text("\n")
    lines = normalize_lines(text)

    try:
        table_start = lines.index("Tabella")
    except ValueError:
        raise RuntimeError(f"Nincs 'Tabella' blokk: {round_num}")

    # A tabella első sora ott kezdődik, ahol először jön egy helyezés: "1"
    data_start = None
    for i in range(table_start + 1, len(lines)):
        if lines[i] == "1":
            data_start = i
            break

    block = lines[data_start:]

    rows = []
    i = 0

    while i < len(block):
        # Minimum 10 elem kell a sorhoz, a forma opcionális
        if i + 9 >= len(block):
            break

        pos = block[i]
        team = block[i + 1]
        played = block[i + 2]
        won = block[i + 3]
        draw = block[i + 4]
        lost = block[i + 5]
        gf = block[i + 6]
        ga = block[i + 7]
        gd = block[i + 8]
        points = block[i + 9]

        valid_row = (
            pos.isdigit()
            and team not in {"Hazai / Vendég", "Aktuális forma", "Kereszttabella", "Félidei tabella"}
            and INT_RE.fullmatch(played)
            and INT_RE.fullmatch(won)
            and INT_RE.fullmatch(draw)
            and INT_RE.fullmatch(lost)
            and INT_RE.fullmatch(gf)
            and INT_RE.fullmatch(ga)
            and INT_RE.fullmatch(gd)
            and INT_RE.fullmatch(points)
        )

        if valid_row:
            form_list = []
            step = 10

            j = i + 10
            while j < len(block) and len(form_list) < 5:
                token = block[j].strip()

                if token in {"GY", "D", "V"}:
                    form_list.append(token)
                    j += 1
                    step += 1
                else:
                    break

            rows.append({
                "pos": pos,
                "team": team,
                "played": played,
                "won": won,
                "draw": draw,
                "lost": lost,
                "gf": gf,
                "ga": ga,
                "gd": gd,
                "points": points,
                "form": form_list,
                "source_url": url
            })

            if len(rows) == 12:
                break

            i += step
            continue

        i += 1

    return {
        "round": round_num,
        "table": rows
    }


all_tables = []

for round_num in range(1, 23):
    round_table = parse_round(round_num)
    print(f"{round_num}. forduló tabellasorok: {len(round_table['table'])}")
    all_tables.append(round_table)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_tables, f, ensure_ascii=False, indent=2)

with open(WEB_OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_tables, f, ensure_ascii=False, indent=2)

print(f"Mentve: {OUTPUT_FILE}")
print(f"Mentve: {WEB_OUTPUT_FILE}")
print(f"Fordulók száma: {len(all_tables)}")