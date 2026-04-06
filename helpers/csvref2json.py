#!/usr/bin/env python3
# Used in CI to auto-generate JSON file

import csv
import sys
import json
import re

csvfile = sys.argv[1]
jsonfile = sys.argv[2]
version = sys.argv[3]

content = {
    "questions": {},
    "version": version,
    # Distribution :
    # 10% Matériel général (L) + Matériel parapente (N) / delta (R) selon discipline
    # 20% Mécavol général  (E) + Mécavol  parapente (G) / delta (H)
    # 20% Pilotage général (U) + Pilotage parapente (W) / delta (X)
    # 10% Réglementation / Cadre de pratique (S)
    # 20% Météo (A)
    # 10% Facteurs humains (F)
    # 10% Milieu naturel (P)
    "catDistrib": [
        ["L", "NR"],
        ["E", "GH"],
        ["E", "GH"],
        ["U", "WX"],
        ["U", "WX"],
        ["S"],
        ["A"],
        ["A"],
        ["F"],
        ["P"],
    ],
    "catFallback": {
        "L": [["N", "R"], "E", "U", "S", "A", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "N": ["L", "E", "U", "S", "A", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "R": ["L", "E", "U", "S", "A", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "E": [["G", "H"], "E", "U", "S", "A", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "G": ["E", "L", "U", "S", "A", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "H": ["E", "L", "U", "S", "A", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "U": [["W", "X"], "E", "L", "S", "A", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "W": ["U", "E", "L", "S", "A", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "X": ["U", "E", "L", "S", "A", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "S": ["L", "E", "U", "A", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "A": ["L", "E", "U", "S", "F", "P", ["N", "R", "G", "H", "W", "X"]],
        "F": ["L", "E", "U", "S", "A", "P", ["N", "R", "G", "H", "W", "X"]],
        "P": ["L", "E", "U", "S", "A", "F", ["N", "R", "G", "H", "W", "X"]],
    },
    "corresTable": {
        k: [[], [], [], []] for k in ["A", "E", "L", "S", "U", "G", "N", "W", "H", "R", "X", "F", "P"]
    },
}
niveaux = ["V", "B", "M", "T"]
code_regex = r"^([A-Z])(\d+)([A-Z]+)$"
pratique = {
    "general": ["A", "E", "L", "S", "U", "F", "P"],
    "parapente": ["G", "N", "W"],
    "delta": ["H", "R", "X"],
}

with open(jsonfile, "w") as outfile:
    with open(csvfile) as infile:
        reader = csv.reader(infile)
        for row in reader:
            code = row[0].strip().upper().replace(" ", "")
            code_group = re.match(code_regex, code)
            if not code_group:
                raise ValueError(f"Invalid code for question: {row}")

            question = row[1]
            ans = []
            # Iterate over answer pairs (text at even indices, points at next odd index)
            for i in range(2, 11, 2):
                if row[i]:
                    ans.append({"text": row[i], "pts": row[i + 1]})

            cat = code_group[1]
            if cat in pratique["general"]:
                parapente, delta = True, True
            elif cat in pratique["parapente"]:
                parapente, delta = True, False
            elif cat in pratique["delta"]:
                parapente, delta = False, True
            else:
                raise ValueError(f"Unknown category: {cat}")

            # Build niveau array [V, B, M, T] based on level letters in code
            niveau_array = [0, 0, 0, 0]
            for niveau_letter in code_group.group(3):
                niveau_idx = niveaux.index(niveau_letter)
                niveau_array[niveau_idx] = 1

            content["questions"][code] = {
                "question": question,
                "ans": ans,
                "pratique": [1 if parapente else 0, 1 if delta else 0],
                "niveau": niveau_array,
            }

            # Add to corresTable for each level this question applies to (using code)
            for niveau_letter in code_group.group(3):
                niveau_idx = niveaux.index(niveau_letter)
                content["corresTable"][cat][niveau_idx].append(code)

    outfile.write(json.dumps(content, indent=2, sort_keys=True, ensure_ascii=False))

"""
Codification des questions:
====================

X99999ABCD (Catégorie (1c), un rang numérique (0-99999), niveaux (1-4c))

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
