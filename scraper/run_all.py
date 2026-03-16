import importlib

SCRIPTS = [
    ("scrape_matches", "Meccsek"),
    ("scrape_tables", "Tabellák"),
    ("scrape_goalscorers", "Góllövőlista"),
    ("scrape_match_goals_auto", "Meccs góllövők"),
]


def run_script(module_name: str, label: str) -> None:
    print(f"[START] {label} ({module_name})")
    module = importlib.import_module(module_name)

    if hasattr(module, "main"):
        module.main()

    print(f"[OK] {label}")


def main() -> None:
    for module_name, label in SCRIPTS:
        run_script(module_name, label)

    print("Minden adat frissítve.")


if __name__ == "__main__":
    main()