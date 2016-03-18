'use strict';

/* Controllers */

angular.module('qcmffvl.controllers', [])

.controller('MainCtrl', function($scope, API, $route, $http, $location, $timeout, $filter, dialogs) {

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
        // TODO: ajouter "révision" et prepend "examen"
        typeExam: {
            options: [ "Révision", "Examen papier (candidat)", "Examen papier (examinateur)" ],
            // options: [ "Révision", "Examen papier", "Examen numérique"],
            checked: "Révision"
        },
        targetExam: "Examinateur",
        displayLimit: 10000,
        checkAnswers: false,
        score: {
            total: 0,
            nb: 0,
            percentage: 0,
            user: 0
        },
        examMode: false,
        examPapier: false,
        examNumerique: false,
        examPapierCandidat: false,
        examPapierExaminateur: false,
        QCMID: "",
        QCMIDUser: ""
    }
    $scope.main.search  = {
    	num_niveau: $scope.main.level.options.indexOf($scope.main.level.checked)
    }
    $scope.main.limit = $scope.main.nbquestions.checked;
    $scope.reloadQCM = false;
    // automatically removed by a directive when the QCM is loaded
    $scope.loading = true;
    // to force the loading state, regardless of scope.loading
    $scope.forceloading = true;

    // store qcm in $parent to allow for offline usage
    if (!$scope.qcm) {
        //console.log("loading JSON");
        $http.get('/json/qcm2014-1.json')
        .success(function(data, status, headers, config){
            $scope.qcm = data;
            $scope.qcmOrig = angular.copy($scope.qcm);
            $scope.generateQCM();
        })
        .error(function() {
            var dlg = dialogs.error('Erreur','Impossible de charger le JSON');
            dlg.result();
        });
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
        $scope.forceloading = true;

        $timeout(function() {
            if (QCMID)
                $scope.arrayToOptions(API.uncomputeID(QCMID).options);
            $scope.qcm = angular.copy($scope.qcmOrig);
            $scope.main.QCMID = API.generateQCM($scope.qcm, $scope.optionsToArray(), QCMID);
        }, 500);
        $timeout(function() {
            $scope.forceloading = false;
        }, 1000);
    },
    $scope.updateQCMID = function() {
        var num = API.uncomputeID($scope.main.QCMID).num;
        $scope.main.QCMID = API.computeID(num, $scope.optionsToArray());
    },
    $scope.reload = function() {
        var dlg = dialogs.confirm('Confirmation','Composer un nouveau questionnaire (ceci effacera vos réponses) ?');
        dlg.result.then(function(btn){
        	$scope.reloadQCM = true;
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
		$scope.loading = true;
		$scope.main.displayLimit = 0;
		$timeout(function() {
			$scope.main.displayLimit = 10000;
		}, 0);
        if ($scope.qcm)
            API.untickAnswers($scope.qcm);
        $scope.main.checkAnswers = false;
    }

    $scope.collapseNav = function() {
        $('html').trigger('click');
        $scope.navCollapsed = true;
    }

    $scope.fillQCMAnswers = function() {
        $scope.main.checkAnswers = true;
        API.tickAnswers($scope.qcm);
    }

    $scope.unfillQCMAnswers = function() {
        $scope.main.checkAnswers = false;
        API.untickAnswers($scope.qcm);
    }

    $scope.updateExamVariables = function() {
        $scope.main.examMode = ($scope.main.typeExam.checked.indexOf("Examen") != -1);
        if ($scope.main.examMode) {
            $scope.main.examPapier = ($scope.main.typeExam.checked.indexOf("Examen papier") != -1);
            $scope.main.examNumerique = !$scope.main.examPapier;
            $scope.targetCandidat = ($scope.main.typeExam.checked.indexOf("candidat") != -1);
            if ($scope.targetCandidat) {
                $scope.main.targetExam = "Candidat";
            } else {
                $scope.main.targetExam = "Examinateur";
            }
            $scope.main.examPapierCandidat = ($scope.main.examPapier && $scope.targetCandidat);
            $scope.main.examPapierExaminateur = ($scope.main.examPapier && !$scope.targetCandidat);
        } else {
            $scope.main.examPapierExaminateur = $scope.main.examPapierCandidat = $scope.main.examPapier = $scope.main.examNumerique =  false;
        }
        if ($scope.qcm) {
            if ($scope.main.examPapierExaminateur) {
                $scope.fillQCMAnswers();
            } else {
                $scope.unfillQCMAnswers();
            }
        }
    }

    $scope.browserChrome = function() {
        return (navigator.appVersion.indexOf("Chrome") != -1);
    }

    $scope.verifyQCMIDUser = function() {
        return API.verifyChecksum($scope.main.QCMIDUser);
    }

    $scope.resetQCMIDUser = function() {
        $scope.main.QCMIDUser = $scope.main.QCMID;
        $scope.main.formattedQCMIDUser = $filter('formatQCMID')($scope.main.QCMIDUser);
    }

    // TODO : put that weird thing in a function, no need for a watch here ?
    $scope.$watch("reloadQCM", function(newval, oldval) {
    	if (newval) {
    		$timeout(function() {
    			$scope.reloadQCM = false;
    			$scope.resetQCMDisplay();
                $scope.collapseNav();
		    	$scope.generateQCM();
                // TODO: check if OK to disable
		        // $location.path("qcm");
		        $route.reload();
    		},500);
	    }
    })

    $scope.$watch('main.nbquestions.checked', function(newval, oldval) {
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
            $scope.updateExamVariables();
        }
    });

    $scope.$watch('main.QCMID', function(newval, oldval) {
        if (newval != oldval) {
            // reset dirtiness on form
            $scope.QCMIDUserForm.$setPristine();
            if ($scope.main.QCMIDUser != $scope.main.QCMID) {
                $scope.resetQCMIDUser();
            }
            $scope.main.QCMIDCRC = API.crc($scope.main.QCMID);
        }
    });

    $scope.$watch('main.formattedQCMIDUser', function(newval, oldval) {
        if (newval != oldval) {
            $scope.main.QCMIDUser = $filter('removeSpaces')(newval);
            $scope.main.formattedQCMIDUser = $filter('formatQCMID')($scope.main.QCMIDUser);
            if ($scope.main.QCMIDUser != $scope.main.QCMID  && API.verifyChecksum($scope.main.QCMIDUser)) {
                $scope.generateQCM($scope.main.QCMIDUser);
            }
        }
    });


 })

.controller('QCMCtrl', function($scope, $filter, $timeout, API, filterFilter) {
    $scope.main.checkAnswers = false;
    $scope.questions = [];
    $scope.$parent.resetQCMDisplay();

    $scope.toggleCheck = function(answer) {
        if ($scope.$parent.navCollapsed && !$scope.main.checkAnswers) {
            answer.checked = !answer.checked;
        }
    }

	$scope.collapseNav = function() {
		$scope.$parent.navCollapsed = true;
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
        if ($scope.main.examPapier || !$scope.main.checkAnswers)
            return false;
        return ($scope.getPoints(question) === 6);
    }

    $scope.failedQuestion = function(question) {
        if ($scope.main.examPapier || !$scope.main.checkAnswers)
            return false;
        return ($scope.getPoints(question) === 0);
    }

    $scope.warningQuestion = function(question) {
        if ($scope.main.examPapier || !$scope.main.checkAnswers)
            return false;
        var points = $scope.getPoints(question);
        return (points >= 1 && points <=5);
    }

    $scope.goodAnswer = function(answer) {
        if ($scope.main.examPapier || !$scope.main.checkAnswers)
            return false;
        return (answer.pts >= 0 && answer.checked || answer.pts <= 0 && !answer.checked);
    }

    $scope.badAnswer = function(answer) {
        if ($scope.main.examPapier || !$scope.main.checkAnswers)
            return false;
        return (answer.pts < 0 && answer.checked || answer.pts == 6 && !answer.checked);
    }

    $scope.warningAnswer = function(answer) {
        if ($scope.main.examPapier || !$scope.main.checkAnswers)
            return false;
        return (answer.pts > 0 && answer.pts < 6 && !answer.checked);
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

    document.body.scrollTop = document.documentElement.scrollTop = 0;
});
