'use strict';

/* Directives */


angular.module('qcmffvl.directives', [])
  .directive('selectOnFocus', function () {
    return {
      restrict: 'A',
      link: function (scope, element) {
        element.on('focus', function () {
          if (this.type === 'text' || this.type === 'password') {
            this.select();
          } else {
            this.setSelectionRange(0, this.value.length);
          }
        });
      }
    };
  })
