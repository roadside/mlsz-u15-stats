import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from utils import clean_text, normalize_lines, get_project_paths, ensure_directories

LEAGUE_ID = 65
SEASON_ID = 0
COMPETITION_ID = 31621

HEADERS = {
    "User-Agent": "Mozilla/5.0",
}

MATCH_LINK_RE = re.compile(
    rf"^/match/{LEAGUE_ID}/{SEASON_ID}/{COMPETITION_ID}/\d+/\d+\.html$"
)

paths = get_project_paths()
ensure_directories()

OUTPUT_FILE = os.path.join(paths['data_dir'], "cards.json")
WEB_OUTPUT_FILE = os.path.join(paths['web_data_dir'], "cards.json")

def fetch_soup(url: str, max_retries: int = 3) -> BeautifulSoup:
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=HEADERS, timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.content, "html.parser")
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                raise RuntimeError(f"Failed to fetch {url} after {max_retries} attempts: {e}")
            print(f"Retry {attempt + 1}/{max_retries} for {url}: {e}")
            time.sleep(2 ** attempt)  # Exponential backoff
    raise RuntimeError(f"Failed to fetch {url}")

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

def attach_match_urls(matches: list[dict]) -> list[dict]:
    """Pontosan hozzárendeli a meccsekhez a megfelelő URL-eket."""
    
    # 1. forduló pontos URL-jei
    round_1_urls = {
        "DVSC - ILLÉS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/1/2096894.html",
        "ETO AKADÉMIA - VIDEOTON FC FEHÉRVÁR": "https://adatbank.mlsz.hu/match/65/0/31621/1/2096893.html",
        "FERENCVÁROSI TC - BUDAPEST HONVÉD FC": "https://adatbank.mlsz.hu/match/65/0/31621/1/2096895.html",
        "UTE - VASAS KUBALA AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/1/2096890.html",
        "DVTK - MTK BUDAPEST": "https://adatbank.mlsz.hu/match/65/0/31621/1/2096892.html",
        "PUSKÁS AKADÉMIA - VÁRDA LABDARUGÓ AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/1/2096891.html"
    }
    
    # 2. forduló pontos URL-jei
    round_2_urls = {
        "ILLÉS AKADÉMIA - ETO AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/2/2096897.html",
        "VIDEOTON FC FEHÉRVÁR - DVTK": "https://adatbank.mlsz.hu/match/65/0/31621/2/2096898.html",
        "VÁRDA LABDARUGÓ AKADÉMIA - VASAS KUBALA AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/2/2096899.html",
        "BUDAPEST HONVÉD FC - DVSC": "https://adatbank.mlsz.hu/match/65/0/31621/2/2096900.html",
        "MTK BUDAPEST - PUSKÁS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/2/2096896.html",
        "UTE - FERENCVÁROSI TC": "https://adatbank.mlsz.hu/match/65/0/31621/2/2096901.html"
    }
    
    # 3. forduló pontos URL-jei
    round_3_urls = {
        "VÁRDA LABDARUGÓ AKADÉMIA - UTE": "https://adatbank.mlsz.hu/match/65/0/31621/3/2096907.html",
        "VASAS KUBALA AKADÉMIA - MTK BUDAPEST": "https://adatbank.mlsz.hu/match/65/0/31621/3/2096902.html",
        "PUSKÁS AKADÉMIA - VIDEOTON FC FEHÉRVÁR": "https://adatbank.mlsz.hu/match/65/0/31621/3/2096903.html",
        "DVSC - FERENCVÁROSI TC": "https://adatbank.mlsz.hu/match/65/0/31621/3/2096906.html",
        "ETO AKADÉMIA - BUDAPEST HONVÉD FC": "https://adatbank.mlsz.hu/match/65/0/31621/3/2096905.html",
        "DVTK - ILLÉS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/3/2096904.html"
    }
    
    # 4. forduló pontos URL-jei
    round_4_urls = {
        "VIDEOTON FC FEHÉRVÁR - VASAS KUBALA AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/4/2096912.html",
        "BUDAPEST HONVÉD FC - DVTK": "https://adatbank.mlsz.hu/match/65/0/31621/4/2096910.html",
        "DVSC - UTE": "https://adatbank.mlsz.hu/match/65/0/31621/4/2096908.html",
        "FERENCVÁROSI TC - ETO AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/4/2096909.html",
        "ILLÉS AKADÉMIA - PUSKÁS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/4/2096911.html",
        "MTK BUDAPEST - VÁRDA LABDARUGÓ AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/4/2096913.html"
    }
    
    # 5. forduló pontos URL-jei
    round_5_urls = {
        "PUSKÁS AKADÉMIA - BUDAPEST HONVÉD FC": "https://adatbank.mlsz.hu/match/65/0/31621/5/2096915.html",
        "UTE - MTK BUDAPEST": "https://adatbank.mlsz.hu/match/65/0/31621/5/2096919.html",
        "DVTK - FERENCVÁROSI TC": "https://adatbank.mlsz.hu/match/65/0/31621/5/2096916.html",
        "ETO AKADÉMIA - DVSC": "https://adatbank.mlsz.hu/match/65/0/31621/5/2096917.html",
        "VÁRDA LABDARUGÓ AKADÉMIA - VIDEOTON FC FEHÉRVÁR": "https://adatbank.mlsz.hu/match/65/0/31621/5/2096918.html",
        "VASAS KUBALA AKADÉMIA - ILLÉS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/5/2096914.html"
    }
    
    # 6. forduló pontos URL-jei
    round_6_urls = {
        "FERENCVÁROSI TC - PUSKÁS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/6/2096922.html",
        "BUDAPEST HONVÉD FC - VASAS KUBALA AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/6/2096923.html",
        "ILLÉS AKADÉMIA - VÁRDA LABDARUGÓ AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/6/2096924.html",
        "VIDEOTON FC FEHÉRVÁR - MTK BUDAPEST": "https://adatbank.mlsz.hu/match/65/0/31621/6/2096925.html",
        "ETO AKADÉMIA - UTE": "https://adatbank.mlsz.hu/match/65/0/31621/6/2096920.html",
        "DVSC - DVTK": "https://adatbank.mlsz.hu/match/65/0/31621/6/2096921.html"
    }
    
    # 7. forduló pontos URL-jei
    round_7_urls = {
        "UTE - VIDEOTON FC FEHÉRVÁR": "https://adatbank.mlsz.hu/match/65/0/31621/7/2096931.html",
        "VASAS KUBALA AKADÉMIA - FERENCVÁROSI TC": "https://adatbank.mlsz.hu/match/65/0/31621/7/2096926.html",
        "MTK BUDAPEST - ILLÉS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/7/2096929.html",
        "VÁRDA LABDARUGÓ AKADÉMIA - BUDAPEST HONVÉD FC": "https://adatbank.mlsz.hu/match/65/0/31621/7/2096930.html",
        "PUSKÁS AKADÉMIA - DVSC": "https://adatbank.mlsz.hu/match/65/0/31621/7/2096927.html",
        "DVTK - ETO AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/7/2096928.html"
    }
    
    # 8. forduló pontos URL-jei
    round_8_urls = {
        "ETO AKADÉMIA - PUSKÁS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/8/2096933.html",
        "BUDAPEST HONVÉD FC - MTK BUDAPEST": "https://adatbank.mlsz.hu/match/65/0/31621/8/2096936.html",
        "DVTK - UTE": "https://adatbank.mlsz.hu/match/65/0/31621/8/2096932.html",
        "DVSC - VASAS KUBALA AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/8/2096934.html",
        "ILLÉS AKADÉMIA - VIDEOTON FC FEHÉRVÁR": "https://adatbank.mlsz.hu/match/65/0/31621/8/2096937.html",
        "FERENCVÁROSI TC - VÁRDA LABDARUGÓ AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/8/2096935.html"
    }
    
    # 9. forduló pontos URL-jei
    round_9_urls = {
        "VÁRDA LABDARUGÓ AKADÉMIA - DVSC": "https://adatbank.mlsz.hu/match/65/0/31621/9/2096942.html",
        "UTE - ILLÉS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/9/2096943.html",
        "VASAS KUBALA AKADÉMIA - ETO AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/9/2096938.html",
        "VIDEOTON FC FEHÉRVÁR - BUDAPEST HONVÉD FC": "https://adatbank.mlsz.hu/match/65/0/31621/9/2096940.html",
        "PUSKÁS AKADÉMIA - DVTK": "https://adatbank.mlsz.hu/match/65/0/31621/9/2096939.html",
        "MTK BUDAPEST - FERENCVÁROSI TC": "https://adatbank.mlsz.hu/match/65/0/31621/9/2096941.html"
    }
    
    # 10. forduló pontos URL-jei
    round_10_urls = {
        "BUDAPEST HONVÉD FC - ILLÉS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/10/2096949.html",
        "PUSKÁS AKADÉMIA - UTE": "https://adatbank.mlsz.hu/match/65/0/31621/10/2096944.html",
        "ETO AKADÉMIA - VÁRDA LABDARUGÓ AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/10/2096946.html",
        "FERENCVÁROSI TC - VIDEOTON FC FEHÉRVÁR": "https://adatbank.mlsz.hu/match/65/0/31621/10/2096948.html",
        "DVTK - VASAS KUBALA AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/10/2096945.html",
        "DVSC - MTK BUDAPEST": "https://adatbank.mlsz.hu/match/65/0/31621/10/2096947.html"
    }
    
    # 11. forduló pontos URL-jei
    round_11_urls = {
        "VÁRDA LABDARUGÓ AKADÉMIA - DVTK": "https://adatbank.mlsz.hu/match/65/0/31621/11/2096954.html",
        "VASAS KUBALA AKADÉMIA - PUSKÁS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/11/2096950.html",
        "MTK BUDAPEST - ETO AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/11/2096953.html",
        "ILLÉS AKADÉMIA - FERENCVÁROSI TC": "https://adatbank.mlsz.hu/match/65/0/31621/11/2096951.html",
        "VIDEOTON FC FEHÉRVÁR - DVSC": "https://adatbank.mlsz.hu/match/65/0/31621/11/2096952.html",
        "UTE - BUDAPEST HONVÉD FC": "https://adatbank.mlsz.hu/match/65/0/31621/11/2096955.html"
    }
    
    # 12. forduló pontos URL-jei
    round_12_urls = {
        "ILLÉS AKADÉMIA - DVSC": "https://adatbank.mlsz.hu/match/65/0/31621/12/2150237.html",
        "VIDEOTON FC FEHÉRVÁR - ETO AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/12/2150238.html",
        "BUDAPEST HONVÉD FC - FERENCVÁROSI TC": "https://adatbank.mlsz.hu/match/65/0/31621/12/2150236.html",
        "VASAS KUBALA AKADÉMIA - UTE": "https://adatbank.mlsz.hu/match/65/0/31621/12/2150241.html",
        "MTK BUDAPEST - DVTK": "https://adatbank.mlsz.hu/match/65/0/31621/12/2150239.html",
        "VÁRDA LABDARUGÓ AKADÉMIA - PUSKÁS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/12/2150240.html"
    }
    
    # 13. forduló pontos URL-jei (csak 4 meccs)
    round_13_urls = {
        "PUSKÁS AKADÉMIA - MTK BUDAPEST": "https://adatbank.mlsz.hu/match/65/0/31621/13/2150243.html",
        "ETO AKADÉMIA - ILLÉS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/13/2150245.html",
        "DVTK - VIDEOTON FC FEHÉRVÁR": "https://adatbank.mlsz.hu/match/65/0/31621/13/2150244.html",
        "VASAS KUBALA AKADÉMIA - VÁRDA LABDARUGÓ AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/13/2150242.html"
    }
    
    # 14. forduló pontos URL-jei (csak 5 meccs)
    round_14_urls = {
        "ILLÉS AKADÉMIA - DVTK": "https://adatbank.mlsz.hu/match/65/0/31621/14/2150250.html",
        "VIDEOTON FC FEHÉRVÁR - PUSKÁS AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/14/2150251.html",
        "BUDAPEST HONVÉD FC - ETO AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/14/2150249.html",
        "FERENCVÁROSI TC - DVSC": "https://adatbank.mlsz.hu/match/65/0/31621/14/2150248.html",
        "UTE - VÁRDA LABDARUGÓ AKADÉMIA": "https://adatbank.mlsz.hu/match/65/0/31621/14/2150253.html"
    }
    
    # Összes forduló URL-einek egyesítése
    all_round_urls = {
        1: round_1_urls,
        2: round_2_urls,
        3: round_3_urls,
        4: round_4_urls,
        5: round_5_urls,
        6: round_6_urls,
        7: round_7_urls,
        8: round_8_urls,
        9: round_9_urls,
        10: round_10_urls,
        11: round_11_urls,
        12: round_12_urls,
        13: round_13_urls,
        14: round_14_urls
    }
    
    for match in matches:
        round_num = match["round"]
        match_key = f"{match['home']} - {match['away']}"
        
        if round_num in all_round_urls and match_key in all_round_urls[round_num]:
            match["match_url"] = all_round_urls[round_num][match_key]
            print(f"    URL hozzárendelve: {match['home']} - {match['away']} -> {all_round_urls[round_num][match_key]}")
        else:
            # Többi forduló esetén csak akkor keressük az URL-t, ha a meccs már lejátszódott vagy ma van
            if is_match_played_or_today(match):
                match_url = find_match_url_by_teams(match)
                if match_url:
                    match["match_url"] = match_url
                    print(f"    URL megvan: {match['home']} - {match['away']} -> {match_url}")
                else:
                    print(f"    NEM TALÁLHATÓ URL: {match['home']} - {match['away']}")
                    match["match_url"] = None
            else:
                print(f"    Jövőbeli meccs, nem keresünk URL-t: {match['home']} - {match['away']} ({match['date']})")
                match["match_url"] = None
    
    return matches

def is_match_played_or_today(match: dict) -> bool:
    """Ellenőrzi, hogy a meccs már lejátszódott-e vagy ma van-e."""
    try:
        from datetime import datetime
        
        # A dátum formátuma: "2025. 08. 29. 14:00"
        date_str = match["date"]
        
        # Dátum feldolgozása
        parts = date_str.replace(".", "").split()
        year = int(parts[0])
        month = int(parts[1])
        day = int(parts[2])
        
        match_date = datetime(year, month, day)
        today = datetime.now()
        
        # Ha a meccs dátuma kisebb vagy egyenlő, mint a mai dátum, akkor már lejátszódott vagy ma van
        return match_date <= today
        
    except Exception as e:
        # Ha hiba van a dátum feldolgozásában, akkor keressük meg az URL-t
        print(f"  Dátum feldolgozási hiba: {e}")
        return True

def find_match_url_by_teams(match: dict) -> str:
    """Automatikusan megkeresi a helyes meccs URL-t a csapatnevek alapján."""
    round_num = match["round"]
    round_url = f"https://adatbank.mlsz.hu/league/65/0/31621/{round_num}.html"
    
    try:
        soup = fetch_soup(round_url)
        
        # Keressük az összes meccs linket
        all_match_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            full_url = urljoin("https://adatbank.mlsz.hu", href)
            
            if (
                f"/match/{LEAGUE_ID}/{SEASON_ID}/{COMPETITION_ID}/" in full_url
                and full_url.endswith(".html")
            ):
                all_match_links.append(full_url)
        
        # Távolítsuk a duplikátumokat
        all_match_links = list(set(all_match_links))
        
        # Keressük a megfelelő URL-t a csapatnevek alapján
        best_match = None
        best_score = 0
        
        for url in all_match_links:
            try:
                match_soup = fetch_soup(url)
                
                # Keressük a csapatneveket az oldalon
                page_text = match_soup.get_text().upper()
                
                # Pontszámítás: hány csapatnév szerepel az oldalon
                home_in_text = match["home"].upper() in page_text
                away_in_text = match["away"].upper() in page_text
                
                score = 0
                if home_in_text:
                    score += 1
                if away_in_text:
                    score += 1
                
                # Bonusz pont, ha mindkét csapatnév szerepel
                if home_in_text and away_in_text:
                    score += 2
                
                # Ellenőrizzük, hogy a címben is szerepelnek-e a csapatnevek
                title = match_soup.find("title")
                if title:
                    title_text = title.get_text().upper()
                    if match["home"].upper() in title_text:
                        score += 1
                    if match["away"].upper() in title_text:
                        score += 1
                
                # Ha ez a legjobb eddig, mentsük el
                if score > best_score:
                    best_score = score
                    best_match = url
                    
            except Exception as e:
                continue
        
        # Ha találtunk legalább 3 pontos egyezést, adjuk vissza
        if best_match and best_score >= 3:
            return best_match
        
        # Ha nem találtunk jó egyezést, próbáljuk meg a forduló oldaláról kinyerni
        return extract_url_from_round_page(match)
                
    except Exception as e:
        print(f"  Hiba meccs URL keresésekor: {e}")
    
    return None

def extract_url_from_round_page(match: dict) -> str:
    """Megpróbálja kinyerni a URL-t közvetlenül a forduló oldaláról."""
    round_num = match["round"]
    round_url = f"https://adatbank.mlsz.hu/league/65/0/31621/{round_num}.html"
    
    try:
        soup = fetch_soup(round_url)
        
        # Keressük az összes linket a forduló oldalon
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            full_url = urljoin("https://adatbank.mlsz.hu", href)
            
            if (
                f"/match/{LEAGUE_ID}/{SEASON_ID}/{COMPETITION_ID}/" in full_url
                and full_url.endswith(".html")
            ):
                # Nézzük meg a link szövegét
                link_text = clean_text(a.get_text()).upper()
                
                # Ellenőrizzük, hogy a link szöveg tartalmazza-e a csapatneveket
                if (match["home"].upper() in link_text or 
                    match["away"].upper() in link_text):
                    return full_url
                    
    except Exception as e:
        print(f"  Hiba URL kinyerésekor a forduló oldaláról: {e}")
    
    return None

def parse_match_cards(match_url: str) -> dict:
    """Kiszedi a sárga és piros lapokat az MLSZ meccs-szintű oldaláról."""
    soup = fetch_soup(match_url)
    if not soup:
        return {"yellow_cards": [], "red_cards": []}
    
    yellow_cards = []
    red_cards = []
    
    # Keressük a left_team és right_team konténereket ID alapján
    left_team = soup.find(id='left_team')
    right_team = soup.find(id='right_team')
    
    if not left_team or not right_team:
        # Ha nem találjuk a left_team/right_team struktúrát, akkor használjuk a régi módszert
        return parse_match_cards_fallback(match_url)
    
    # Feldolgozzuk a left_team-et (hazai csapat)
    left_players = left_team.find_all('tr', class_='template-tr-selectable')
    for row in left_players:
        name_cell = row.find('td', class_='match_players_name')
        if not name_cell:
            continue
            
        player_link = name_cell.find('a')
        if not player_link:
            continue
            
        player_name = clean_text(player_link.get_text())
        
        # Keressük a lapokat
        cards_cell = row.find('td', class_='match_players_cards')
        if cards_cell:
            card_spans = cards_cell.find_all('span')
            for span in card_spans:
                style = span.get('style', '')
                minute_text = clean_text(span.get_text())
                
                if minute_text and minute_text != '-':
                    try:
                        minute = int(minute_text.replace("'", ""))
                        card_data = {
                            "player": player_name,
                            "minute": minute,
                            "team": "home"  # left_team = hazai
                        }
                        
                        if 'yellowcard.png' in style:
                            yellow_cards.append(card_data)
                        elif 'redcard.png' in style:
                            red_cards.append(card_data)
                    except ValueError:
                        pass
    
    # Feldolgozzuk a right_team-et (vendég csapat)
    right_players = right_team.find_all('tr', class_='template-tr-selectable')
    for row in right_players:
        name_cell = row.find('td', class_='match_players_name')
        if not name_cell:
            continue
            
        player_link = name_cell.find('a')
        if not player_link:
            continue
            
        player_name = clean_text(player_link.get_text())
        
        # Keressük a lapokat
        cards_cell = row.find('td', class_='match_players_cards')
        if cards_cell:
            card_spans = cards_cell.find_all('span')
            for span in card_spans:
                style = span.get('style', '')
                minute_text = clean_text(span.get_text())
                
                if minute_text and minute_text != '-':
                    try:
                        minute = int(minute_text.replace("'", ""))
                        card_data = {
                            "player": player_name,
                            "minute": minute,
                            "team": "away"  # right_team = vendég
                        }
                        
                        if 'yellowcard.png' in style:
                            yellow_cards.append(card_data)
                        elif 'redcard.png' in style:
                            red_cards.append(card_data)
                    except ValueError:
                        pass
    
    return {
        "yellow_cards": yellow_cards,
        "red_cards": red_cards
    }

def parse_match_cards_fallback(match_url: str) -> dict:
    """Régi módszer, ha a left_team/right_team struktúra nem működik."""
    soup = fetch_soup(match_url)
    if not soup:
        return {"yellow_cards": [], "red_cards": []}
    
    yellow_cards = []
    red_cards = []
    
    # Keressük az összes játékos sort
    player_rows = soup.find_all('tr', class_=re.compile(r'template-tr-selectable'))
    
    if not player_rows:
        player_rows = soup.find_all('tr')
    
    # A játékosokat két csoportra osztjuk a sorrend alapján
    home_players_count = 0
    max_home_players = 14  # Tartalékokkal együtt
    
    for i, row in enumerate(player_rows):
        name_cell = row.find('td', class_='match_players_name')
        if not name_cell:
            continue
            
        player_link = name_cell.find('a')
        if not player_link:
            continue
            
        player_name = clean_text(player_link.get_text())
        
        # Határozzuk meg a csapatot a sorrend alapján
        if home_players_count < max_home_players:
            current_team = 'home'
            home_players_count += 1
        else:
            current_team = 'away'
        
        # Keressük a lapokat
        cards_cell = row.find('td', class_='match_players_cards')
        if cards_cell:
            card_spans = cards_cell.find_all('span')
            for span in card_spans:
                style = span.get('style', '')
                minute_text = clean_text(span.get_text())
                
                if minute_text and minute_text != '-':
                    try:
                        minute = int(minute_text)
                        card_data = {
                            "player": player_name,
                            "minute": minute,
                            "team": current_team
                        }
                        
                        if 'yellowcard.png' in style:
                            yellow_cards.append(card_data)
                        elif 'redcard.png' in style:
                            red_cards.append(card_data)
                    except ValueError:
                        pass
    
    return {
        "yellow_cards": yellow_cards,
        "red_cards": red_cards
    }

def parse_round(round_num: int):
    """Egy forduló összes meccsének lapjait gyűjti össze."""
    # Meccsek adatinak betöltése és URL-ek frissítése
    matches_file = os.path.join(paths['data_dir'], "matches.json")
    with open(matches_file, "r", encoding="utf-8") as f:
        matches = json.load(f)
    
    round_matches = [m for m in matches if m["round"] == round_num]
    
    # Frissítjük a meccs URL-eket
    round_matches = attach_match_urls(round_matches)
    
    round_cards = []
    
    for match in round_matches:
        match_url = match.get("match_url")
        
        if not match_url:
            print(f"  Nincs match_url: {match['home']} - {match['away']}")
            continue
        
        # Ellenőrizzük, hogy a meccs már lejátszódott-e vagy ma van-e
        if not is_match_played_or_today(match):
            print(f"  Jövőbeli meccs, nem keresünk lapokat: {match['home']} - {match['away']} ({match['date']})")
            continue
            
        cards_data = parse_match_cards(match_url)
        
        # Csak akkor írjuk ki a meccset, ha vannak lapok
        if len(cards_data["yellow_cards"]) > 0 or len(cards_data["red_cards"]) > 0:
            print(f"  {match['home']} vs {match['away']}")
        
        # Frissítjük a csapatneveket a lapoknál (helyes logika)
        for card in cards_data["yellow_cards"]:
            if card["team"] == "home":
                card["team"] = match["home"]
            elif card["team"] == "away":
                card["team"] = match["away"]
            else:
                card["team"] = None
        
        for card in cards_data["red_cards"]:
            if card["team"] == "home":
                card["team"] = match["home"]
            elif card["team"] == "away":
                card["team"] = match["away"]
            else:
                card["team"] = None
        
        round_cards.append({
            "round": round_num,
            "home": match["home"],
            "away": match["away"],
            "date": match["date"],
            "match_url": match_url,
            "yellow_cards": cards_data["yellow_cards"],
            "red_cards": cards_data["red_cards"]
        })
        
        time.sleep(0.3)  # udvarias scraping
    
    return round_cards

# Főprogram - összes forduló feldolgozása
all_rounds = []

for round_num in range(1, 23):  # 1-től 22-ig
    print(f"{round_num}. forduló lapjainak gyűjtése...")
    round_cards = parse_round(round_num)
    print(f"{round_num}. forduló: {len(round_cards)} meccs feldolgozva")
    all_rounds.extend(round_cards)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_rounds, f, ensure_ascii=False, indent=2)

with open(WEB_OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_rounds, f, ensure_ascii=False, indent=2)

print(f"Mentve: {OUTPUT_FILE}")
print(f"Mentve: {WEB_OUTPUT_FILE}")
print(f"Meccsek száma: {len(all_rounds)}")
