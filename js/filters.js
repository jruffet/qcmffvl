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

.filter('formatQCMTitle', function() {
    return function(input) {
        if (input)
            return input.replace(/Brevet de Pilote Confirmé/, 'BPC');
    }
});
