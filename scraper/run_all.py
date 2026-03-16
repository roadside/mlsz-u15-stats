import importlib

SCRIPTS = [
    ("scrape_matches", "Meccsek"),
    ("scrape_tables", "Tabellák"),
    ("scrape_goalscorers", "Góllövőlista"),
    ("scrape_match_goals_auto", "Meccs góllövők"),
]


def run_script(module_name, label):
    print(f"\n--- {label} indítása ---")

    try:
        importlib.import_module(module_name)
        print(f"{label} kész.")
    except Exception as e:
        print(f"HIBA a {label} futásakor:")
        print(e)


def main():
    print("Adatok frissítése indul...")

    for module_name, label in SCRIPTS:
        run_script(module_name, label)

    print("\nMinden scraper lefutott.")


if __name__ == "__main__":
    main()