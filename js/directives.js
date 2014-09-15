'use strict';

/* Directives */


angular.module('qcmffvl.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }])
.directive('removeLoaderWhenReady', function($timeout) {
  return function(scope, element, attrs) {
	    // angular.element(element).css('color','blue');
	    if (scope.$last) {
	        scope.$parent.$parent.loading = false;
	    }
  	}
});
