'use strict';

/* Directives */


angular.module('qcmffvl.directives', [])
  .directive('selectOnFocus', ['$window', function ($window) {
    return {
      restrict: 'A',
      link: function (element) {
        element.on('focus', function () {
          if (!$window.getSelection().toString()) {
            this.setSelectionRange(0, this.value.length);
          }
        });
      }
    };
  }]);
