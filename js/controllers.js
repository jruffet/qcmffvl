'use strict';

/* Controllers */

angular.module('qcmffvl.controllers', [])

.controller('MainCtrl', function($scope, API, $location, $timeout, $http, $filter, $window, dialogs, deviceDetector) {

    $scope.main = {
        category: {
            options: [ "Parapente", "Delta" ],
            checked: "Parapente"
        },
        level: {
            options: [ "Brevet Initial", "Brevet de Pilote", "Brevet de Pilote Confirmé"],
            checked: "Brevet de Pilote"
        },
        nbquestions: {
        	options: [ "10", "30", "60", "90", "Toutes les" ],
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
        // QCMID is set by API.generateQCM(), or from QCMIDUser when loading a previous QCM
        QCMID: "",
        // QCMIDUser is set by the user, via formattedQCMIDUser
        QCMIDUser: ""
    }
    $scope.main.search  = {
    	niveau: $scope.main.level.options.indexOf($scope.main.level.checked),
        parapente: true,
        // delta not set here. parapente should never be set to true at the same time as delta is.
        // delta: true + parapente: true would select only the generic questions
    }
    $scope.main.limit = $scope.main.nbquestions.checked;
    // automatically removed by a directive when the QCM is loaded
    $scope.loading = true;
    $scope.hideNavbarButtons = false;
    $scope.browserCheckOverride = false;
    $scope.version = "3.0";
    $scope.qcmVersion = "1.0";
    $scope.qcmVer = $scope.qcmVersion.replace(".", "");

    $scope.loadQCMID = function(QCMID) {
        if (QCMID) {
            if (API.verifyChecksum(QCMID)) {
                // used by loadJSON()
                $scope.main.QCMID = QCMID;
            } else {
                var optionnalMsg = "";
                if (QCMID.length == 15) {
                    optionnalMsg = "<br/><br/>Note : Les ID QCM à 15 chiffres ne sont plus compatibles avec les versions 3.X (ou versions supérieures).";
                }
                dialogs.error('Erreur','<b>ID QCM invalide</b> (' + QCMID + ')<br/> Le questionnaire précédent a été rechargé.' + optionnalMsg);
            }
        }
        if ($scope.qcm) {
            if (QCMID) {
                $scope.loading = true;
                $timeout(function() {
                    $scope.generateQCM($scope.main.QCMID);
                },100);
            }
        } else {
            $scope.loadJSON();
        }
    }

    $scope.loadJSON = function() {
        $scope.loading = true;
        $timeout(function() {
            $http.get('/dev/json/qcm_ffvl_' + $scope.qcmVersion + '.json')
            .success(function(data, status, headers, config){
                $scope.main.qcmDate = data.date;
                if ($scope.qcmVersion != data.version) {
                    var dlg = dialogs.error('Erreur','La version de questionnaire chargée ne correspond pas à la version annoncée par le JSON.<br/>Cette erreur ne devrait pas se produire, merci de me contacter (cf "A propos") en indiquant les informations suivantes :<br/>qcmVersion (scope) : ' + $scope.qcmVersion + '<br/>qcmVersion (qcm) : ' + data.version);
                    // dlg.result();
                } else {
                    $scope.qcmOrig = angular.copy(data.questions);
                    $scope.generateQCM($scope.main.QCMID);
                }
            })
            .error(function() {
                var dlg = dialogs.error('Erreur','Impossible de charger le JSON');
                // dlg.result();
            });
        }, 100);
    },
    $scope.generateQCM = function(QCMID) {
        $scope.loading = true;
        $scope.main.checkAnswers = false;
        if (QCMID) {
            $scope.arrayToOptions(API.uncomputeID(QCMID).options);
        }
        $timeout(function() {
            $scope.qcm = angular.copy($scope.qcmOrig);
            $scope.main.QCMID = API.generateQCM($scope.qcm, $scope.qcmVer, $scope.optionsToArray(), QCMID);

            if ($scope.main.exam.papierExaminateur)
                API.tickAnswers($scope.qcm);
        },300);
    },
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
    $scope.updateQCMID = function() {
        var num = API.uncomputeID($scope.main.QCMID).num;
        $scope.main.QCMID = API.computeID(num, $scope.qcmVer, $scope.optionsToArray());
    },
    $scope.reload = function() {
        var dlg = dialogs.confirm('Confirmation','Composer un nouveau questionnaire <b>' + $scope.main.category.checked + '</b> niveau <b>' + $scope.main.level.checked + '</b> avec <b>' + $scope.main.nbquestions.checked.toLowerCase() + ' questions</b> (et effacer vos réponses) ?');
        dlg.result.then(function(btn){
            // wait for modal to close to avoid weird effects
            $timeout(function() {
                $scope.loading = true;
            }, 300);
            $timeout(function() {
                $scope.main.checkAnswers = false;
                $scope.collapseNav();
                $scope.generateQCM();
            }, 500);
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
        var dlg = dialogs.create('qcmid.html','QCMIDDialogCtrl',$scope.main,{size:"lg"});
        dlg.result.then(function(name){
            $timeout(function() {
                if ($scope.main.QCMIDUser != $scope.main.QCMID) {
                    $scope.collapseNav();
                    $scope.loading = true;
                    $scope.qcm = [];
                    $timeout(function() {
                        $scope.loadQCMID($scope.main.QCMIDUser);
                    },300);
                }
            },300);
        },function(){
        });
    }
    $scope.optionsTooLongForWidth = function() {
        if ($window.innerWidth > 992 && $window.innerWidth < 1200) {
            return ($scope.main.typeExam.checked.indexOf("Examen") != -1) || ($scope.main.nbquestions.checked.indexOf("Toutes") != -1);
        } else {
            return false;
        }
    }

    $scope.$watch('main.nbquestions.checked', function(newval, oldval) {
        $scope.loading = true;
        if (newval != oldval) {
            $timeout(function() {
                $scope.resetQCMDisplay();
                $scope.updateQCMID();
                var limit = $scope.main.nbquestions.checked;
                if (limit === "Toutes les") {
                    limit = 10000;
                }
                $scope.main.limit = limit;
            },100);
        }
    })

    $scope.$watch('main.category.checked', function(newval, oldval) {
        $scope.loading = true;
        if (newval != oldval) {
            $timeout(function() {
                $scope.resetQCMDisplay();
                $scope.updateQCMID();
                if ($scope.main.category.checked == "Parapente") {
                    $scope.main.search.parapente = true;
                    delete $scope.main.search.delta;
                } else {
                    $scope.main.search.delta = true;
                    delete $scope.main.search.parapente;
                }
            },100);
        }
    });

    $scope.$watch('main.level.checked', function(newval, oldval) {
        $scope.loading = true;
        if (newval != oldval) {
            $timeout(function() {
                $scope.resetQCMDisplay();
                $scope.updateQCMID();
                $scope.main.search.niveau = $scope.main.level.options.indexOf($scope.main.level.checked);
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
            var url = $location.absUrl().replace(/\/[0-9]+$/, "");

            $scope.main.QCMIDURL = url.replace("#/qcm","#/load") + "/" + $scope.main.QCMID;
        }
    });

    $scope.$watch('main.formattedQCMIDUser', function(newval, oldval) {
        if (newval != oldval) {
            $scope.main.QCMIDUser = $filter('removeSpaces')(newval);
            $scope.main.formattedQCMIDUser = $filter('formatQCMID')($scope.main.QCMIDUser);
        }
    });

    $scope.$watch('loading', function(newval, oldval){
        if (newval == false && $location.path().indexOf("/load") != -1) {
            $location.path("/qcm", false);
        }
    })
})

.controller('LoadCtrl', function($scope, $routeParams) {
    $scope.$parent.loadQCMID($routeParams.qcmid);
})

.controller('QCMCtrl', function($scope, $filter, $location, dialogs, API, filterFilter) {
    $scope.questions = [];
    $scope.$parent.hideNavbarButtons = false;
    $scope.$parent.main.checkAnswers = false;

    if (!$scope.$parent.qcm) {
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

.controller('QCMIDDialogCtrl', function($scope, $modalInstance, $location, data, API) {
    $scope.main = data;

    $scope.savedFormattedQCMIDUser = angular.copy($scope.main.formattedQCMIDUser);
    $scope.verifyQCMIDUser = function() {
        if ($scope.main.formattedQCMIDUser != $scope.savedFormattedQCMIDUser) {
            return API.verifyChecksum($scope.main.QCMIDUser);
        } else {
            return true;
        }
    }
    $scope.QCMIDBlur = function() {
        if (!$scope.verifyQCMIDUser())
            $scope.main.formattedQCMIDUser = angular.copy($scope.savedFormattedQCMIDUser);
    }
    $scope.loadQCMID = function() {
        $modalInstance.close();
    }
    $scope.ok = function(){
        $modalInstance.dismiss();
    };
})

.run(function($templateCache) {
    // avoid huge latency on high TTL connections
    $templateCache.put('qcmid.html', '<div class="modal-header">    <h4 class="modal-title"><span class="glyphicon glyphicon-share"></span> Partage du QCM</h4></div><div class="modal-body">    <ng-form name="nameDialog" novalidate role="form">        <span class="help-block">Le numéro d\'identification "ID" identifie de manière unique un questionnaire (pratique, questions, nombre, niveau...)</span>  <span class="help-block hide-xs">Vous pouvez le modifier avec un ID valide pour charger le questionnaire correspondant.</span>      <div class="form-group qcmID" ng-class="{ \'has-error\': !verifyQCMIDUser() }">            <label class="control-label" for="course">QCM ID:</label>            <input type="text" name="ID" class="form-control" ng-model="main.formattedQCMIDUser" ng-blur="QCMIDBlur()" maxlength="22" select-on-focus>            <button type="button" class="btn btn-info btn-load-ID" ng-click="loadQCMID()" ng-disabled="!verifyQCMIDUser() || main.QCMID == main.QCMIDUser">Charger le questionnaire</button>        </div>    </ng-form>    <hr>    <span class="help-block">Pour accéder directement au questionnaire courant, vous pouvez utiliser/partager cette URL :</span>    <span class="help-block url">{{main.QCMIDURL}}</span>    <button clipboard class="btn btn-info" supported="true" text="main.QCMIDURL">Copier l\'adresse</button></div><div class="modal-footer">    <button type="button" class="btn btn-default" ng-click="ok()">Fermer</button></div>');
});

