'use strict';

/* Filters */

angular.module('qcmffvl.filters', [])
    .filter('formatQCMID', function () {
        return function (input) {
            if (input) {
                var ret = input.replace(/[^0-9]/g, '');
                return ret.replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
            } else {
                return "";
            }
        }
    })
    .filter('removeSpaces', function () {
        return function (input) {
            if (input)
                return input.replace(/ /g, '');
        }
    })
    .filter('qcmFilter', function () {
        return function (qcm, pratiqueType, niveauIndex, category) {
            // Pre-calculate category map to avoid long if/else chain inside the loop
            var categoryMap = {
                "Matériel": ["L", "N", "R"],
                "Mécavol": ["E", "G", "H"],
                "Pilotage": ["U", "W", "X"],
                "Réglementation": ["S"],
                "Météo": ["A"],
                "Facteurs humains": ["F"],
                "Milieu naturel": ["P"]
            };

            var targetCodes = categoryMap[category] || [];
            var isCategoryFilterActive = category && category !== "Toutes" && categoryMap.hasOwnProperty(category);
            var isNiveauFilterActive = niveauIndex !== undefined && niveauIndex !== null;
            var isPratiqueFilterActive = !!pratiqueType;

            return qcm.filter(function (question) {
                // 1. Category Check
                if (isCategoryFilterActive) {
                    if (targetCodes.indexOf(question.code[0]) === -1)
                        return false;
                }

                // 2. Niveau Check
                if (isNiveauFilterActive) {
                    if (question.niveau[niveauIndex] !== 1)
                        return false;
                }

                // 3. Pratique Check
                if (isPratiqueFilterActive) {
                    var practiceIndex = pratiqueType === 'parapente' ? 0 : 1;
                    if (question.pratique[practiceIndex] !== 1)
                        return false;
                }

                return true;
            });
        }
    });
