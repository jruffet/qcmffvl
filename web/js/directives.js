'use strict';

/* Directives */


angular.module('qcmffvl.directives', []).
  directive('appVersion', ['version', function (version) {
    return function (scope, elm, attrs) {
      elm.text(version);
    };
  }])

  .directive('selectOnFocus', ['$window', function ($window) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.on('focus', function () {
          if (!$window.getSelection().toString()) {
            this.setSelectionRange(0, this.value.length)
          }
        });
      }
    };
  }]);
