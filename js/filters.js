'use strict';

/* Filters */

angular.module('qcmffvl.filters', [])
.filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    };
  }])

.filter('groupNumberByThree', function() {
    return function(input) {
        return input.replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
    }
});
