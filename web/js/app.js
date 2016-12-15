'use strict';


// Declare app level module which depends on filters, and services
angular.module('qcmffvl', [
  'ngRoute',
  'ngStorage',
  'ui.bootstrap',
  'dialogs.main',
  'ng.deviceDetector',
  'pascalprecht.translate',
  'angular-clipboard',
  'qcmffvl.filters',
  'qcmffvl.services',
  'qcmffvl.directives',
  'qcmffvl.controllers'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/load/:qcmid', {templateUrl: 'qcm.html', controller: 'LoadCtrl'});
  $routeProvider.when('/load/:qcmid/:typeExamNum', {templateUrl: 'qcm.html', controller: 'LoadCtrl'});
  $routeProvider.when('/qcm', {templateUrl: 'qcm.html', controller: 'QCMCtrl'});
  $routeProvider.when('/about', {templateUrl: 'about.html', controller: 'AboutCtrl'});
  $routeProvider.when('/selftest', {templateUrl: 'selftest.html', controller: 'SelfTestCtrl'});
  $routeProvider.otherwise({redirectTo: '/qcm'});
}])
.config(['dialogsProvider','$translateProvider',function(dialogsProvider,$translateProvider){
    dialogsProvider.useBackdrop('static');
    dialogsProvider.useEscClose(true);
    dialogsProvider.useCopy(false);
    dialogsProvider.setSize('md');

    $translateProvider.translations('fr',{
        DIALOGS_CONFIRMATION: "Confirmation",
        DIALOGS_YES: "Oui",
        DIALOGS_OK: "OK",
        DIALOGS_NO: "Non",
        DIALOGS_CLOSE: "Fermer"
    });

    $translateProvider.preferredLanguage('fr');
}]);
