#!/usr/bin/python3

# TODO : check if points are always set, die otherwise

import csv
import sys
import json
import datetime

csvfile  = sys.argv[1]
jsonfile = sys.argv[2]

content = {
    "questions": [],
    "version": "1.0",
    "date": datetime.datetime.now().strftime("%d/%m/%Y"),
    # Distribution :
    # 10% Matériel général (L)+ matériel PP ou D (N ou R) selon discipline
    # 20% mécavol général (E) + mécavol PP ou D (G ou H)
    # 20% pilotage général (U)+ pilotage PP ou D (W ou X)
    # 20% réglementation/cadre de pratique (S)
    # 30% météo (A)
    "catDistrib": [["L","NR"], ["E","GH"], ["E","GH"], ["U", "WX"], ["U", "WX"], ["S"], ["S"], ["A"], ["A"], ["A"]],
    "catFallback": {
        "L": [["N","R"],"E","U","S","A",["N","R","G","H","W","X"]],
        "N": ["L","E","U","S","A",["N","R","G","H","W","X"]],
        "R": ["L","E","U","S","A",["N","R","G","H","W","X"]],
        "E": [["G","H"],"E","U","S","A",["N","R","G","H","W","X"]],
        "G": ["E","L","U","S","A",["N","R","G","H","W","X"]],
        "H": ["E","L","U","S","A",["N","R","G","H","W","X"]],
        "U": [["W","X"],"E","L","S","A",["N","R","G","H","W","X"]],
        "W": ["U","E","L","S","A",["N","R","G","H","W","X"]],
        "X": ["U","E","L","S","A",["N","R","G","H","W","X"]],
        "S": ["L","E","U","A",["N","R","G","H","W","X"]],
        "A": ["L","E","U","S",["N","R","G","H","W","X"]]
    },
    "corresTable": {
        "A": [[],[],[],[]],
        "E": [[],[],[],[]],
        "L": [[],[],[],[]],
        "S": [[],[],[],[]],
        "U": [[],[],[],[]],
        "G": [[],[],[],[]],
        "N": [[],[],[],[]],
        "W": [[],[],[],[]],
        "H": [[],[],[],[]],
        "R": [[],[],[],[]],
        "X": [[],[],[],[]]
    }
}
content["ver"] = content["version"].replace("\.", "")
niveaux = ["V", "B", "M", "T"]
tmpi = 0
pratique = {
    "general": ["A","E","L","S","U"],
    "parapente": ["G", "N", "W"],
    "delta": ["H", "R", "X"]
}
index = 0
with open (jsonfile, 'w') as outfile:
    with open(csvfile) as infile:
        reader = csv.reader(infile)
        for row in reader:
            if row[0]:
                code = row[0].strip().upper()
                question = row[1]
                ans = []
                for i in range(2,9,2):
                    if row[i]:
                        ans.append({"text": row[i], "pts":row[i+1]})

                niveau_letter = code[-1]
                niveau = niveaux.index(niveau_letter)
                cat = code[0]

                if cat in pratique["general"]:
                    delta = parapente = True
                elif cat in pratique["parapente"]:
                    parapente = True
                    delta = False
                elif cat in pratique["delta"]:
                    parapente = False
                    delta = True
                content["questions"].append({"code":code, "question":question, "ans":ans, "niveau":niveau, "parapente":parapente, "delta":delta})
                content["corresTable"][cat][niveau].append(index)
                index += 1
    outfile.write(json.dumps(content))


'''

Questions météo
A
--
Mécavol général
E
--
Mécavol parapente
G
--
mécavol delta
H
--
Matériel général
L
--
Matériel parapente
N
--
Matériel Delta
R
--
Réglementation
S
--
Pilotage général
U
--
Pilotage parapente
W
--
Pilotage Delta
X
'''
