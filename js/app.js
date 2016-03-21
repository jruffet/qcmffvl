'use strict';


// Declare app level module which depends on filters, and services
angular.module('qcmffvl', [
  'ngRoute',
  'ui.bootstrap',
  'dialogs.main',
  'AngularPrint',
  'ng.deviceDetector',
  // 'pasvaz.bindonce',
  'pascalprecht.translate',
  'qcmffvl.filters',
  'qcmffvl.services',
  'qcmffvl.directives',
  'qcmffvl.controllers'
]).
config(['$routeProvider', function($routeProvider) {
  // $routeProvider.when('/view1', {templateUrl: 'partials/partial1.html', controller: 'MyCtrl1'});
  $routeProvider.when('/qcm', {templateUrl: 'partials/qcm.html', controller: 'QCMCtrl'});
  // $routeProvider.when('/exam', {templateUrl: 'partials/qcm.html', controller: 'ExamCtrl'});
  $routeProvider.when('/about', {templateUrl: 'partials/about.html', controller: 'AboutCtrl'});
  $routeProvider.when('/selftest', {templateUrl: 'partials/selftest.html', controller: 'SelfTestCtrl'});
  $routeProvider.otherwise({redirectTo: '/qcm'});
}])
.config(['dialogsProvider','$translateProvider',function(dialogsProvider,$translateProvider){
    dialogsProvider.useBackdrop('static');
    dialogsProvider.useEscClose(true);
    dialogsProvider.useCopy(false);
    dialogsProvider.setSize('sm');

    $translateProvider.translations('fr',{
        DIALOGS_CONFIRMATION: "Confirmation",
        DIALOGS_YES: "Oui",
        DIALOGS_NO: "Non",
        DIALOGS_CLOSE: "Fermer"
    });

    $translateProvider.preferredLanguage('fr');
}]);
