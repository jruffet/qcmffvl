'use strict';

/* Filters */

angular.module('qcmffvl.filters', [])
.filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    };
  }])

.filter('formatQCMID', function() {
    return function(input) {
        if (input) {
            var ret = input.replace(/[^0-9]/g, '');
            return ret.replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
        } else {
            return "";
        }
    }
})
.filter('removeSpaces', function() {
    return function(input) {
        if (input)
            return input.replace(/ /g, '');
    }
})
.filter('categoryFilter', function() {
    return function(qcm, category) {
        if (category) {
            var categoryList = [];
            if (category == "Matériel") {
                categoryList = ["L","N","R"]
            } else if (category == "Mécavol") {
                categoryList = ["E", "G", "H"]
            } else if (category == "Pilotage") {
                categoryList = ["U", "W", "X"]
            } else if (category == "Réglementation") {
                categoryList = ["S"]
            } else if (category == "Météo") {
                categoryList = ["A"]
            } else if (category.indexOf("Toutes") != -1) {
                return qcm;
            }        
            var out = [];
            angular.forEach(qcm, function(question) {
                var code = question.code[0];
                if (categoryList.indexOf(code) != -1) {
                    out.push(question);
                }
            })
            return out;
        } else {
            return qcm;
        }
    }
})
.filter('formatQCMTitle', function() {
    return function(input) {
        if (input) {
            var out = input.replace(/Brevet de Pilote Confirmé/, 'BPC');
            out = out.replace(/Brevet de Pilote/, 'BP');
            // out = out.replace(/Brevet Initial/, 'BI');
            return out;
        }
    }
});
