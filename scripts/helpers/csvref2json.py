#!/usr/bin/env python3
# Used in CI to auto-generate JSON file

import csv
import sys
import json
import re


"""
Codification des questions:
====================

X99999ABCD (Catégorie (1 char), un rang numérique (N chars), niveaux (1-4 chars))

Catégories:
A: Météo
E: Mécavol général
G: Mécavol parapente
H: Mécavol delta
L: Matériel général
N: Matériel parapente
R: Matériel delta
S: Réglementation
U: Pilotage général
W: Pilotage parapente
X: Pilotage delta
F: Facteurs humains
P: Milieu naturel

Niveaux:
V: Brevet initial (Vert)
B: Brevet de pilote (Bleu)
M: Brevet de pilote confirmé (Marron)
T: Qualifications treuil (Treuil)

Exemple:
Question U12VB = Question numéro 12 concernant le pilotage général pour les brevets initial et de pilote.
"""


csvfile = sys.argv[1]
jsonfile = sys.argv[2]
version = sys.argv[3]

code_regex = r"^([A-Z])(\d+)([A-Z]+)$"

category_to_letters = {
    "Matériel": ["L", "N", "R"],
    "Mécavol": ["E", "G", "H"],
    "Pilotage": ["U", "W", "X"],
    "Réglementation": ["S"],
    "Météo": ["A"],
    "Facteurs humains": ["F"],
    "Milieu naturel": ["P"],
}
pratique_general = ["A", "E", "L", "S", "U", "F", "P"]
pratique_to_letters = {
    "Parapente": pratique_general + ["G", "N", "W"],
    "Delta": pratique_general + ["H", "R", "X"],
}
niveau_to_letter = {
    "Brevet Initial": "V",
    "Brevet de Pilote": "B",
    "Brevet de Pilote Confirmé": "M",
    "Qualification Treuil": "T",
}

content = {
    "version": version,
    # Distribution :
    # 10% Matériel général (L) + Matériel parapente (N) / delta (R) selon discipline
    # 20% Mécavol général  (E) + Mécavol  parapente (G) / delta (H)
    # 20% Pilotage général (U) + Pilotage parapente (W) / delta (X)
    # 10% Réglementation / Cadre de pratique (S)
    # 20% Météo (A)
    # 10% Facteurs humains (F)
    # 10% Milieu naturel (P)
    # Note: order is important -> will fallback to next available when exhausted (in a linked list fashion)
    "catDistrib": [
        "Matériel",
        "Mécavol",
        "Mécavol",
        "Pilotage",
        "Pilotage",
        "Réglementation",
        "Météo",
        "Météo",
        "Facteurs humains",
        "Milieu naturel",
    ],
    "questions": [],
}


with open(jsonfile, "w") as outfile:
    with open(csvfile) as infile:
        reader = csv.reader(infile)
        for row in reader:
            code = row[0]
            question = row[1]

            code_group = re.match(code_regex, code)
            if not code_group:
                raise ValueError(f"Invalid code for question: {row}")

            ans_array = []
            # Iterate over answer pairs (text at even indices, points at next odd index)
            for i in range(2, 11, 2):
                if row[i]:
                    ans_array.append({"text": row[i], "pts": int(row[i + 1])})

            first_letter = code_group[1]
            last_letters = [x for x in code_group[3]]

            content["questions"].append({
                "code": code,
                "question": question,
                "answers": ans_array,
                "activities": [x for x, y in pratique_to_letters.items() if first_letter in y],
                "categories": [x for x, y in category_to_letters.items() if first_letter in y],
                "levels": [x for x, y in niveau_to_letter.items() if y in last_letters],
            })

    outfile.write(json.dumps(content, indent=2, ensure_ascii=False))
