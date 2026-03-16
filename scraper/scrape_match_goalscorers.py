import os
import json

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
WEB_DATA_DIR = os.path.join(PROJECT_ROOT, "web", "data")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(WEB_DATA_DIR, exist_ok=True)

GOALSCORERS_FILE = os.path.join(DATA_DIR, "goalscorers.json")
MATCHES_FILE = os.path.join(DATA_DIR, "matches.json")

OUTPUT_FILE = os.path.join(DATA_DIR, "match_goalscorers.json")
WEB_OUTPUT_FILE = os.path.join(WEB_DATA_DIR, "match_goalscorers.json")

with open(GOALSCORERS_FILE, encoding="utf-8") as f:
    all_rounds = json.load(f)

with open(MATCHES_FILE, encoding="utf-8") as f:
    all_matches = json.load(f)

# Fordulónkénti kumulatív gólok: { round -> { player -> goals } }
cumulative = {}
for round_data in sorted(all_rounds, key=lambda r: r["round"]):
    round_num = round_data["round"]
    cumulative[round_num] = {
        row["player"]: int(row["goals"])
        for row in round_data["goalscorers"]
    }

def get_goals_in_round(player: str, round_num: int) -> int:
    """Hány gólt szerzett a játékos az adott fordulóban (különbség az előző fordulóhoz képest)."""
    current = cumulative.get(round_num, {}).get(player, 0)
    prev_round = round_num - 1
    previous = cumulative.get(prev_round, {}).get(player, 0)
    diff = current - previous
    # Ha negatív (pl. adathiba), 0-t adunk vissza
    return max(diff, 0)

# Meccsek csoportosítva forduló + csapat szerint
# { (round, team) -> [match, ...] }
match_map = {}
for m in all_matches:
    if m["status"] != "Lejátszva":
        continue
    for team in [m["home"], m["away"]]:
        key = (m["round"], team)
        match_map.setdefault(key, []).append(m)

# Eredmény: minden meccshez góllövők listája
# { "round_home_away": { home_scorers: [...], away_scorers: [...] } }
result = []

played_matches = [m for m in all_matches if m["status"] == "Lejátszva"]

for m in played_matches:
    round_num = m["round"]
    home = m["home"]
    away = m["away"]

    round_data = cumulative.get(round_num, {})
    prev_round_data = cumulative.get(round_num - 1, {})

    home_scorers = []
    away_scorers = []

    for player, total_goals in round_data.items():
        prev_goals = prev_round_data.get(player, 0)
        goals_this_round = total_goals - prev_goals

        if goals_this_round <= 0:
            continue

        # Melyik csapatban szerepel a játékos?
        # Megkeressük a legfrissebb csapat-hozzárendelést a goalscorers-ből
        player_team = None
        for rd in sorted(all_rounds, key=lambda r: r["round"], reverse=True):
            for row in rd["goalscorers"]:
                if row["player"] == player:
                    player_team = row["team"]
                    break
            if player_team:
                break

        if player_team == home:
            home_scorers.append({"player": player, "goals": goals_this_round})
        elif player_team == away:
            away_scorers.append({"player": player, "goals": goals_this_round})

    # Csak ha van góllövő adat
    if home_scorers or away_scorers:
        result.append({
            "round": round_num,
            "home": home,
            "away": away,
            "home_scorers": sorted(home_scorers, key=lambda x: x["player"]),
            "away_scorers": sorted(away_scorers, key=lambda x: x["player"]),
        })

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

with open(WEB_OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Mentve: {OUTPUT_FILE}")
print(f"Meccsek góllövőkkel: {len(result)}")
