'use strict';

/* Controllers */

angular.module('qcmffvl.controllers', [])

.controller('MainCtrl', function($scope, API, $location, $timeout, $http, $filter, dialogs, deviceDetector) {

    $scope.main = {
        category: {
            options: [ "Parapente" ],
            checked: "Parapente"
        },
        level: {
            options: [ "Brevet Initial", "Brevet de Pilote", "Brevet de Pilote Confirmé"],
            checked: "Brevet de Pilote"
        },
        nbquestions: {
        	options: [ "10", "30", "60", "90", "Toutes" ],
        	checked: "30"
        },
        typeExam: {
            options: [ "Révision", "Examen papier (candidat)", "Examen papier (examinateur)" ],
            checked: "Révision"
        },
        displayLimit: 10000,
        checkAnswers: false,
        score: {
            total: 0,
            nb: 0,
            percentage: 0,
            user: 0
        },
        exam: [],
        QCMID: "",
        QCMIDUser: ""
    }
    $scope.main.search  = {
    	num_niveau: $scope.main.level.options.indexOf($scope.main.level.checked)
    }
    $scope.main.limit = $scope.main.nbquestions.checked;
    $scope.main.reloadQCM = false;
    // automatically removed by a directive when the QCM is loaded
    $scope.loading = false;
    $scope.hideNavbarButtons = false;
    $scope.browserCheckOverride = false;

    $scope.loadJSON = function() {
        $scope.loading = true;
        $timeout(function() {
            $http.get('/json/qcm2014-1.json')
            .success(function(data, status, headers, config){
                $scope.qcmOrig = angular.copy(data);
                $scope.generateQCM($scope.main.QCMID);
            })
            .error(function() {
                var dlg = dialogs.error('Erreur','Impossible de charger le JSON');
                dlg.result();
            });
        }, 100);
    }

    $scope.optionsToArray = function() {
        var opt = [];
        opt[0] = $scope.main.category.options.indexOf($scope.main.category.checked)
        opt[1] = $scope.main.level.options.indexOf($scope.main.level.checked)
        opt[2] = $scope.main.nbquestions.options.indexOf($scope.main.nbquestions.checked)
        return opt;
    },
    $scope.arrayToOptions = function(opt) {
        $scope.main.category.checked = $scope.main.category.options[opt[0]];
        $scope.main.level.checked = $scope.main.level.options[opt[1]];
        $scope.main.nbquestions.checked = $scope.main.nbquestions.options[opt[2]];
    },
    $scope.generateQCM = function(QCMID) {
        $scope.loading = true;
        if (QCMID) {
            $scope.arrayToOptions(API.uncomputeID(QCMID).options);
        }
        $timeout(function() {
            $scope.qcm = angular.copy($scope.qcmOrig);
            $scope.main.QCMID = API.generateQCM($scope.qcm, $scope.optionsToArray(), QCMID);
            if ($scope.main.exam.papierExaminateur)
                API.tickAnswers($scope.qcm);
        },300);
    },
    $scope.updateQCMID = function() {
        var num = API.uncomputeID($scope.main.QCMID).num;
        $scope.main.QCMID = API.computeID(num, $scope.optionsToArray());
    },
    $scope.reload = function() {
        var dlg = dialogs.confirm('Confirmation','Composer un nouveau questionnaire (ceci effacera vos réponses) ?');
        dlg.result.then(function(btn){
            $scope.main.QCMID = '';
        	$scope.main.reloadQCM = true;
        },function(btn){
            //cancel
        });
    }

    $scope.scoreClass = function(score) {
        if (score.percentage >= 75) {
            return "good-score";
        } else {
            return "bad-score";
        }
    }
    $scope.resetQCMDisplay = function() {
        // is unset in the directive "removeLoaderWhenReady()"
		$scope.loading = true;
		$scope.main.displayLimit = 0;
		$timeout(function() {
			$scope.main.displayLimit = 10000;
		}, 0);
        if ($scope.qcm && !$scope.main.exam.mode && $scope.main.checkAnswers) {
            API.untickAnswers($scope.qcm);
            $scope.main.checkAnswers = false;
        }
    }

    $scope.collapseNav = function() {
        $('html').trigger('click');
        $scope.navCollapsed = true;
    }

    $scope.browserChrome = function() {
        return (deviceDetector.browser == "chrome");
    }

    // show magic button when in /dev
    $scope.isDevURL = function() {
        return ($location.absUrl().indexOf("/dev") != -1);
    }

    // we are in a stable version only when a push to prod has been done
    $scope.isProdURL = function() {
        return ($location.absUrl().indexOf("sativouf.net") == -1);
    }

    $scope.gotoMainURL = function() {
        if ($location.url().indexOf("/qcm") == -1) {
            $location.url("/qcm/");
        }
    }

    $scope.resetQCMIDUser = function() {
        $scope.main.QCMIDUser = $scope.main.QCMID;
        $scope.main.formattedQCMIDUser = $filter('formatQCMID')($scope.main.QCMIDUser);
    }

    $scope.fillQCMAnswers = function() {
        $scope.main.checkAnswers = true;
        API.tickAnswers($scope.qcm);
    }

    $scope.unfillQCMAnswers = function() {
        $scope.main.checkAnswers = false;
        API.untickAnswers($scope.qcm);
    }

    $scope.toggleCheck = function(answer) {
        if ($scope.navCollapsed && !$scope.main.checkAnswers && !$scope.main.exam.papier) {
            answer.checked = !answer.checked;
        }
    }
    $scope.dialogQCMID = function() {
        var prepend = "";
        if ($scope.isDevURL())
            prepend = "/dev"
        var dlg = dialogs.create(prepend + '/dialogs/qcmid.html','QCMIDDialogCtrl',$scope.main, {size:'lg'});
                    dlg.result.then(function(name){
                    },function(){
                    });
    }

    $scope.$watch("main.reloadQCM", function(newval, oldval) {
        if (newval == true) {
            // wait for modal to close
            $timeout(function() {
                $scope.loading = true;
            }, 500);
            $timeout(function() {
                $scope.main.reloadQCM = false;
                $scope.collapseNav();
                $scope.generateQCM($scope.main.QCMID);
            },700);
        }
    })

    $scope.$watch('main.nbquestions.checked', function(newval, oldval) {
        $scope.loading = true;
        if (newval != oldval) {
            $timeout(function() {
                $scope.resetQCMDisplay();
                $scope.updateQCMID();
                var limit = $scope.main.nbquestions.checked;
                if (limit === "Toutes") {
                    limit = 10000;
                }
                $scope.main.limit = limit;
            },100);
        }
    })

    $scope.$watch('main.level.checked', function(newval, oldval) {
        $scope.loading = true;
        if (newval != oldval) {
            $timeout(function() {
                $scope.resetQCMDisplay();
                $scope.updateQCMID();
                $scope.main.search.num_niveau = $scope.main.level.options.indexOf($scope.main.level.checked);
            },100);
        }
    });

    $scope.$watch('main.typeExam.checked', function(newval, oldval) {
        if (newval != oldval) {
            $scope.main.exam = [];
            $scope.main.checkAnswers = false;
            if (newval.indexOf("Examen papier") != -1) {
                $scope.main.exam.mode = true;
                $scope.main.exam.papier = true;
            }
            if (newval == "Examen papier (candidat)") {
                $scope.main.exam.papierCandidat = true;
            } else if (newval == "Examen papier (examinateur)") {
                $scope.main.exam.papierExaminateur = true;
            }
            // back from examPapierExaminateur, we want to erase the answers ticked
            $scope.unfillQCMAnswers();
            if ($scope.main.exam.papierExaminateur) {
                API.tickAnswers($scope.qcm);
            }
            document.body.scrollTop = document.documentElement.scrollTop = 0;
        }
    });

    $scope.$watch('main.QCMID', function(newval, oldval) {
        if (newval != oldval) {
            if ($scope.main.QCMIDUser != $scope.main.QCMID) {
                $scope.resetQCMIDUser();
            }
            $scope.main.QCMIDCRC = API.crc($scope.main.QCMID);
            $scope.main.QCMIDURL = $location.absUrl() + "/" + $scope.main.QCMID;
        }
    });

    $scope.$watch('main.formattedQCMIDUser', function(newval, oldval) {
        if (newval != oldval) {
            $scope.main.QCMIDUser = $filter('removeSpaces')(newval);
            $scope.main.formattedQCMIDUser = $filter('formatQCMID')($scope.main.QCMIDUser);
        }
    });


 })

.controller('QCMCtrl', function($scope, $filter, $timeout, $routeParams, $location, dialogs, API, filterFilter) {
    $scope.questions = [];
    $scope.$parent.hideNavbarButtons = false;
    $scope.$parent.main.checkAnswers = false;
    $scope.$parent.collapseNav();

    var QCMID = $routeParams.param1;

    if (QCMID) {
        $location.path("/qcm", false);
        if (API.verifyChecksum(QCMID)) {
            // used by loadJSON()
            $scope.$parent.main.QCMID = QCMID;
        } else {
            dialogs.error('Erreur','ID QCM invalide : ' + QCMID);
        }
    }
    if ($scope.$parent.qcm) {
        $scope.$parent.generateQCM($scope.$parent.main.QCMID);
    } else {
        $scope.$parent.loadJSON();
    }

    $scope.getPoints = function(question) {
        var total = 0;
        for (var i = 0; i < question.ans.length; i++) {
            if (question.ans[i].checked) {
                total += parseInt(question.ans[i].pts);
            }
        }
        if (total < 0) {
            total = 0;
        }
        return total;
    }

    $scope.getScore = function() {
        var arr = filterFilter($scope.qcm, $scope.main.search);
        arr = $filter('limitTo')(arr, $scope.main.limit)
        var score = { user: 0, nb: 0, percentage: 0 };
        for(var i = 0; i < arr.length; i++){
            var question = arr[i];
            score.user += $scope.getPoints(question);
        }
        score.nb = i;
        score.total = i*6;
        if (score.total > 0) {
            score.percentage = Math.round(score.user / score.total * 100);
        }
        return score;
    }


    $scope.successQuestion = function(question) {
        if ($scope.main.exam.papier || !$scope.main.checkAnswers)
            return false;
        return ($scope.getPoints(question) === 6);
    }

    $scope.failedQuestion = function(question) {
        if ($scope.main.exam.papier || !$scope.main.checkAnswers)
            return false;
        return ($scope.getPoints(question) === 0);
    }

    $scope.warningQuestion = function(question) {
        if ($scope.main.exam.papier || !$scope.main.checkAnswers)
            return false;
        var points = $scope.getPoints(question);
        return (points >= 1 && points <=5);
    }

    $scope.goodAnswer = function(answer) {
        if ($scope.main.exam.papier || !$scope.main.checkAnswers)
            return false;
        return (answer.pts >= 0 && answer.checked);
    }

    $scope.badAnswer = function(answer) {
        if ($scope.main.exam.papier || !$scope.main.checkAnswers)
            return false;
        return (answer.pts < 0 && answer.checked);
    }

    $scope.goodAnswerNotChecked = function(answer) {
        if ($scope.main.exam.papier || !$scope.main.checkAnswers)
            return false;
        return (answer.pts > 0 && !answer.checked);
    }

    $scope.updateScore = function() {
        if ($scope.main.checkAnswers) {
            $scope.main.score = $scope.getScore();
        }
    }

    $scope.$watch('main.checkAnswers', function() {
        $scope.updateScore();
    })

})

.controller('SelfTestCtrl', function($scope, API) {
    $scope.$parent.loading = false;
	$scope.selftest = [];
	$scope.selftest.numitems   = 600;
	$scope.selftest.numruns    = 10000;
	$scope.selftest.showperrun = 60;

	$scope.selftest.qcm = [];
	for(var i = 1; i <= $scope.selftest.numitems; i++) {
		var obj = { question : i , ans : "x", shown : 0 };
		$scope.selftest.qcm.push(obj);
	}
//	console.log($scope.selftest.qcm);
	for(var i = 1; i <= $scope.selftest.numruns; i++){
//		console.log("run " + i );
		API.generateQCM($scope.selftest.qcm);
//		console.log($scope.selftest.qcm);
		for(var j = 0; j < $scope.main.nbquestions.checked ; j++){
			$scope.selftest.qcm[j].shown++;
		}
	}
	for(var i = 0; i < $scope.selftest.numitems; i++) {
		$scope.selftest.qcm[i].percent = (($scope.selftest.qcm[i].shown / $scope.selftest.numruns) * 100).toFixed(2);;
	}

})

.controller('AboutCtrl', function($scope) {
    $scope.$parent.navCollapsed = true;
    $scope.$parent.loading = false;
    $scope.$parent.hideNavbarButtons = true;

    document.body.scrollTop = document.documentElement.scrollTop = 0;
})

.controller('QCMIDDialogCtrl', function($scope, $modalInstance, data, API) {
    $scope.main = data;

    $scope.savedFormattedQCMIDUser = angular.copy($scope.main.formattedQCMIDUser);
    $scope.verifyQCMIDUser = function() {
        if ($scope.main.formattedQCMIDUser != $scope.savedFormattedQCMIDUser) {
            return API.verifyChecksum($scope.main.QCMIDUser);
        } else {
            return true;
        }
    }
    $scope.cancelIDChanges = function() {
        if (! $scope.verifyQCMIDUser)
            $scope.main.formattedQCMIDUser = angular.copy($scope.savedFormattedQCMIDUser);
    }
    $scope.loadQCMID = function() {
        $modalInstance.dismiss('OK');
        $scope.main.QCMID = $scope.main.QCMIDUser;
        $scope.main.reloadQCM = true;
    }
    $scope.ok = function(){
        $modalInstance.dismiss('OK');
    };
});
