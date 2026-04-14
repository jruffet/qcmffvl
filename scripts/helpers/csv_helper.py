#!/usr/bin/env python3
import argparse
import csv
import re
import sys
from typing import Callable, Dict, List, Optional
from tabulate import tabulate

DO_NOT_FORMAT = ["P12BM", "A66M", "S109V", "S110V", "S132B", "S60M", "S69M"]
CSV_HEADER = [
    "code",
    "question",
    "ans1",
    "pts1",
    "ans2",
    "pts2",
    "ans3",
    "pts3",
    "ans4",
    "pts4",
    "ans5",
    "pts5",
]
CATEGORIES = {
    "Météo": ["A"],
    "Mécavol": ["E", "G", "H"],
    "Facteurs humains": ["F"],
    "Matériel": ["L", "N", "R"],
    "Milieu naturel": ["P"],
    "Réglementation": ["S"],
    "Pilotage": ["U", "W", "X"],
}
PRATIQUES = {
    "global": ["A", "S", "F", "P", "E", "L", "U"],
    "parapente": ["G", "N", "W"],
    "delta": ["H", "R", "X"],
}
NIVEAUX = {
    "V": "BI",
    "B": "BP",
    "M": "BPC",
    "T": "Treuil",
}


def info(s: str):
    print(f"[+] {s}")


def parse_args():
    parser = argparse.ArgumentParser(prog="csv_helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # check command
    check_parser = subparsers.add_parser("check", help="Check the CSV file for inconsistencies")
    check_parser.add_argument("filename", help="CSV file to check")

    # format command
    format_parser = subparsers.add_parser("format", help="Format the CSV file")
    format_parser.add_argument("filename", help="CSV file to format")

    # stats command
    stats_parser = subparsers.add_parser("stats", help="Show statistics about the CSV file")
    stats_parser.add_argument("filename", help="CSV file to analyze")

    return parser.parse_args()


def get_question(rows: List[Dict], code: str) -> Dict:
    for row in rows:
        if row["code"] == code:
            return row
    return {}


def short_code(code: str) -> str:
    return re.match(r"(\w\d+)", code).groups()[0]


def csv_invalid_point_sum(rows: List[Dict]) -> List[Dict]:
    bad_rows: List[Dict] = []
    for row in rows:
        max_points = sum(int(v) for k, v in row.items() if "pts" in k and int(v) > 0)
        if max_points != 6:
            bad_rows.append(row)
    return bad_rows


def csv_duplicate_rows(rows: List[Dict]) -> List[Dict]:
    seen = set()
    duplicates = set()
    for row in rows:
        code = short_code(row["code"])
        if code in seen:
            duplicates.add(code)
        seen.add(code)
    return [x for x in rows if x["code"] in duplicates]


def csv_check_question_casing(rows: List[Dict]) -> List[Dict]:
    bad_rows = []
    for row in rows:
        if row["question"].endswith("?"):
            bad = False
            for i in range(1, 6):
                key = f"ans{i}"
                if key in row and not row[key][0].isupper() and not row[key][0].isdigit():
                    bad = True
                    break
            if bad:
                bad_rows.append(row)
    return bad_rows


def csv_check(rows: List[Dict]):
    ret = True

    info("Questions with max_points != 6")
    bogus = csv_invalid_point_sum(rows)
    if bogus:
        ret = False
        write_csv_to_stdout(rows=bogus)

    info("Questions with duplicate codes")
    duplicates = csv_duplicate_rows(rows)
    if duplicates:
        ret = False
        write_csv_to_stdout(rows=duplicates)

    info("Questions ending with '?' but answers don't start with capital letters")
    bad_questions = csv_check_question_casing(rows)
    if bad_questions:
        ret = False
        write_csv_to_stdout(rows=bad_questions)

    return ret


def format_first_word(s: str, formatter: Optional[Callable[[str], str]] = None):
    if not s or " " not in s:
        return s
    parts = s.split(" ", 1)

    if formatter:
        parts[0] = formatter(parts[0])
    return " ".join(parts)


def string_format(s: str) -> str:
    ret = s.rstrip()
    ret = ret.replace("’", "'")
    return ret


def csv_format(rows: List[Dict]):
    for row in rows:
        if row["code"] not in DO_NOT_FORMAT:
            row["question"] = string_format(row["question"])
            for i in range(1, 6):
                key = f"ans{i}"
                if key in row:
                    if row["question"].endswith("?"):
                        row[key] = format_first_word(row[key], formatter=str.capitalize)
                    else:
                        row[key] = format_first_word(row[key], formatter=str.lower)
                    row[key] = string_format(row[key].rstrip())
    write_csv_to_stdout(rows=rows)


def stats_to_csv(stats: Dict[str, Dict[str, Dict[str, int]]]) -> List[Dict[str, int]]:
    rows = []
    for pratique, levels in stats.items():
        for level, categories in levels.items():
            row = {"Pratique": pratique, "Brevet": level}
            row.update(categories)
            rows.append(row)
    return rows


def csv_stats(rows: List[Dict]):
    catlist = sorted(CATEGORIES)
    stats = {"Parapente": {}, "Delta": {}}

    for s in stats:
        for level in NIVEAUX.values():
            stats[s][level] = {}
            for cat in catlist:
                stats[s][level][cat] = 0

    for row in rows:
        cat_letter = row["code"][0]
        cat = [k for k, v in CATEGORIES.items() if cat_letter in v][0]
        level_letters = re.fullmatch(r"\w+\d+(\w+)", row["code"]).groups()[0]
        pratiques = []
        if cat_letter in PRATIQUES["global"] or cat_letter in PRATIQUES["parapente"]:
            pratiques.append("Parapente")
        if cat_letter in PRATIQUES["global"] or cat_letter in PRATIQUES["delta"]:
            pratiques.append("Delta")
        for pratique in pratiques:
            for letter in level_letters:
                level = NIVEAUX[letter]
                stats[pratique][level][cat] += 1

    table_data = stats_to_csv(stats)
    print(tabulate(table_data, headers="keys", tablefmt="grid"))


def load_csv(filename: str) -> List[Dict]:
    with open(filename, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, fieldnames=CSV_HEADER)
        # remove empty answers+points
        return [{k: v for k, v in row.items() if v != ""} for row in reader]


def write_csv_to_stdout(rows: List[Dict], header: Optional[List[str]] = None):
    fieldnames = header if header else CSV_HEADER
    writer = csv.DictWriter(sys.stdout, fieldnames=fieldnames, lineterminator="\n")

    if header:
        writer.writeheader()
    for row in rows:
        writer.writerow(row)


def main():
    args = parse_args()

    csv_content = load_csv(args.filename)
    if args.command == "check":
        ret = csv_check(csv_content)
        # used in CI
        sys.exit(not ret)
    elif args.command == "format":
        csv_format(csv_content)
    elif args.command == "stats":
        csv_stats(csv_content)


if __name__ == "__main__":
    main()
