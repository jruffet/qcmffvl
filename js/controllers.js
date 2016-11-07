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
        QCMIDUser: "",
        helpQuestion: ""
    }
    $scope.main.search  = {
    	niveau: $scope.main.level.options.indexOf($scope.main.level.checked),
        parapente: true
        // delta not set here. parapente should never be set to true at the same time as delta is.
        // delta: true + parapente: true would select only the generic questions
    }
    $scope.main.limit = $scope.main.nbquestions.checked;
    // automatically removed by a directive when the QCM is loaded
    $scope.loading = true;
    $scope.hideNavbarButtons = false;
    $scope.browserCheckOverride = false;
    $scope.version = "3.1";
    $scope.qcmVersion = "1.0";
    $scope.qcmVer = $scope.qcmVersion.replace(".", "");
    $scope.qcmOptions = {};
    // wether to display help info (link to request-qcm@ffvl.fr) for a question or not

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
                dialogs.error('Erreur','<b>ID QCM invalide</b> (' + QCMID + ')</b><br/> Le questionnaire actuel a été rechargé.' + optionnalMsg);
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
            var url_prepend = "";
            if ($scope.isDevURL()) {
                url_prepend = "/dev";
            }
            $http.get(url_prepend + '/json/qcm_ffvl_' + $scope.qcmVersion + '.json')
            .success(function(data, status, headers, config){
                $scope.main.qcmDate = data.date;
                if ($scope.qcmVersion != data.version) {
                    var dlg = dialogs.error('Erreur','La version de questionnaire chargée ne correspond pas à la version annoncée par le JSON.<br/>Cette erreur ne devrait pas se produire, merci de me contacter (cf "A propos") en indiquant les informations suivantes :<br/>qcmVersion (scope) : ' + $scope.qcmVersion + '<br/>qcmVersion (qcm) : ' + data.version);
                    // dlg.result();
                } else {
                    $scope.qcmOrig = angular.copy(data.questions);
                    $scope.qcmOptions.catDistrib = data.catDistrib;
                    $scope.qcmOptions.catFallback = data.catFallback;
                    $scope.qcmOptions.corresTable = data.corresTable;
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
        $scope.main.helpQuestion = "";
        if (QCMID) {
            $scope.arrayToOptions(API.uncomputeID(QCMID).options);
        }
        $timeout(function() {
            $scope.qcm = angular.copy($scope.qcmOrig);
            $scope.main.QCMID = API.generateQCM($scope.qcm, $scope.qcmOptions, $scope.qcmVer, $scope.optionsToArray(), QCMID);

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
        $scope.main.helpQuestion = "";
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

    $scope.isAndroidApp = function() {
        return (deviceDetector.raw.userAgent.indexOf("QCMFFVL Android App") != -1);
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

    $scope.toggleCheck = function(q, answer) {
        if ($scope.navCollapsed && !$scope.main.checkAnswers && !$scope.main.exam.papier && !$scope.isHelpQuestion(q)) {
            answer.checked = !answer.checked;
        }
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
        if ($scope.main.exam.papier || !$scope.main.checkAnswers || $scope.isHelpQuestion(question))
            return false;
        return ($scope.getPoints(question) === 6);
    }

    $scope.failedQuestion = function(question) {
        if ($scope.main.exam.papier || !$scope.main.checkAnswers || $scope.isHelpQuestion(question))
            return false;
        return ($scope.getPoints(question) === 0);
    }

    $scope.warningQuestion = function(question) {
        if ($scope.main.exam.papier || !$scope.main.checkAnswers || $scope.isHelpQuestion(question))
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

    $scope.helpQuestionToggle = function(q) {
        if ($scope.navCollapsed && !$scope.main.exam.papier) {
            if ($scope.main.helpQuestion == q.code) {
                $scope.main.helpQuestion = "";
            } else {
                $scope.main.helpQuestion = q.code;
            }
        }
    }

    $scope.isHelpQuestion = function(q) {
        if (q && !$scope.main.exam.papier) {
            return (q.code == $scope.main.helpQuestion);
        } else {
            return false;
        }
    }
    $scope.resetHelpQuestion = function() {
            $scope.main.helpQuestion = "";
    }

    $scope.mailtoclick = function(q) {
        // ugly (but effective !) way of re-setting q.help, since it is toggled when clicking on the envelope (because it sits in the panel)
        $scope.resetHelpQuestion(q);
        window.location.href = "mailto:request-qcm@ffvl.fr?subject=question " + q.code + "   [QCM " + $scope.qcmVersion + " / WebApp " + $scope.version + " / QCMID " + $scope.main.QCMID + "]";
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
    // also allows access to pages when no internet access is available (i.e. android app)
    $templateCache.put('qcmid.html', '<div class="modal-header">    <h4 class="modal-title"><span class="glyphicon glyphicon-share"></span> Partage du QCM</h4></div><div class="modal-body">    <ng-form name="nameDialog" novalidate role="form">        <span class="help-block">Le numéro d\'identification "ID" identifie de manière unique un questionnaire (pratique, questions, nombre, niveau...)</span>  <span class="help-block hide-xs">Vous pouvez le modifier avec un ID valide pour charger le questionnaire correspondant.</span>      <div class="form-group qcmID" ng-class="{ \'has-error\': !verifyQCMIDUser() }">            <label class="control-label" for="course">QCM ID:</label>            <input type="text" name="ID" class="form-control" ng-model="main.formattedQCMIDUser" ng-blur="QCMIDBlur()" maxlength="22" select-on-focus>            <button type="button" class="btn btn-info btn-load-ID" ng-click="loadQCMID()" ng-disabled="!verifyQCMIDUser() || main.QCMID == main.QCMIDUser">Charger le questionnaire</button>        </div>    </ng-form>    <hr>    <span class="help-block">Pour accéder directement au questionnaire courant, vous pouvez utiliser/partager cette URL :</span>    <span class="help-block url">{{main.QCMIDURL}}</span>    <button clipboard class="btn btn-info" supported="true" text="main.QCMIDURL">Copier l\'adresse</button></div><div class="modal-footer">    <button type="button" class="btn btn-default" ng-click="ok()">Fermer</button></div>');
    $templateCache.put('about.html', "<div class=\"about\">    <div class=\"panel panel-default\">        <div class=\"panel-heading\">QCM FFVL version {{version}}</span>  -  Questionnaire officiel</div>        <div class=\"panel-body\">            Auteur : J\u00e9r\u00e9my Ruffet (<a href=\"mailto:sat@airnux.fr\">sat@airnux.fr</a>)            <br/><br/>            Cet application web est d\u00e9velopp\u00e9e b\u00e9n\u00e9volement.            <br/>            Elle est sous licence libre (cf plus bas), le code est disponible sur <a href=\"https://github.com/sativouf/qcmffvl\">https://github.com/sativouf/qcmffvl</a>.            <br/>            N'h\u00e9sitez pas \u00e0 m'envoyer des rapports de bugs, probl\u00e8mes d'affichage ou des suggestions par mail.            <br/><br/>            <b>Pour toute demande de modification du questionnaire </b>(questions / r\u00e9ponses), merci de cliquer sur la question (en mode r\u00e9vision), puis de cliquer sur l'enveloppe.            <br/><br/>            Et bien entendu, les bi\u00e8res et les mails de remerciement sont les bienvenus ! :)            <div class=\"about-category row\">                <span class=\"about-category-title col-xs-12 col-md-12 col-lg-12\"><hr/>Version Web</span>                <div class=\"about-category-part col-xs-12 col-md-12 col-lg-12\">                    La version web a \u00e9t\u00e9 con\u00e7ue pour \u00eatre multi-support (mobile / tablette / desktop) et multi-OS (Linux / Windows / MAC...).                    <br/><br/>                    La totalit\u00e9 du questionnaire n'est charg\u00e9 qu'une seule fois d'un point de vue r\u00e9seau.                    <br/>                    Cela veut dire qu'il vous suffit de charger la page sur votre mobile avant de partir, et vous pourrez vous faire d'innombrables QCMs FFVL, sans avoir jamais besoin de connexion data !                    <br/><br/>                    La version web a \u00e9t\u00e9 test\u00e9e comme fonctionnant correctement avec Chrome et Firefox.                    <br/>                    Merci d'utiliser un de ces 2 navigateurs si vous exp\u00e9rimentez des soucis.                </div>            </div>            <div class=\"about-category row\">                <span class=\"about-category-title col-xs-12 col-md-12 col-lg-12\"><hr/>Application Android</span>                <div class=\"about-category-part col-xs-12 col-md-12 col-lg-12\">                    L'application Android fait un usage intelligent du r\u00e9seau. Au lancement de l'app Android, celle-ci regarde si l'appareil a de la data activ\u00e9e et une connection internet valide, auquel cas elle t\u00e9l\u00e9charge la derni\u00e8re version web (et tout le questionnaire), sinon elle utilise la derni\u00e8re version t\u00e9l\u00e9charg\u00e9e.                    <br/>                    Cela assure une utilisation hors ligne facilit\u00e9e et une mise \u00e0 jour automatique.                    <br/><br/>                    <b>Note : Seul le mode r\u00e9vision est disponible depuis l'appli Android pour le moment.</b>                </div>            </div>        </div>    </div>    <div class=\"panel panel-default\">        <div class=\"panel-heading\">CHANGELOG</div>        <div class=\"panel-body\">            <div class=\"changelog-version row\">                <span class=\"changelog-version-title col-xs-12 col-md-12 col-lg-12\">Version 3.1</span>                <div class=\"changelog-part col-xs-12 col-md-12 col-lg-12\">                    <div class=\"changelog-title col-xs-12 col-md-12 col-lg-12\">Am\u00e9liorations / Changements</div>                    <ul class=\"changelog-content\">                        <li>Cr\u00e9ation de l'application Android, pour une meilleure exp\u00e9rience offline.</li>                    </ul>                </div>            </div>            <div class=\"changelog-version row\">                <span class=\"changelog-version-title col-xs-12 col-md-12 col-lg-12\">Version 3.0</span>                <div class=\"changelog-part col-xs-12 col-md-12 col-lg-12\">                    <div class=\"changelog-title col-xs-12 col-md-12 col-lg-12\">Am\u00e9liorations / Changements</div>                    <ul class=\"changelog-content\">                        <li>Ajout du questionnaire Delta.</li>                        <li>Possibilit\u00e9 de signaler un probl\u00e8me avec une question en cliquant sur l'encart de la question.</li>                        <li>Nouvelle r\u00e9partition des questions suivant un pourcentage par cat\u00e9gorie.</li>                        <li>Ordre al\u00e9atoire des r\u00e9ponses pour chaque question. L'ordre de tout le questionnaire (questions + r\u00e9ponses) reste cependant le m\u00eame pour un QCM ID donn\u00e9.</li>                        <li>Le QCM ID (bouton partage) est maintenant li\u00e9 \u00e0 la version de QCM, les anciens QCM IDs ne sont plus compatibles avec les versions 3.X (ou versions sup\u00e9rieures), qui int\u00e8grent cette fonctionnalit\u00e9.</li>                        <li>Retour \u00e0 un navbar collapse sur 1200px.</li>                    </ul>                </div>                <div class=\"changelog-part col-xs-12 col-md-12 col-lg-12\">                    <div class=\"changelog-title col-xs-12 col-md-12 col-lg-12\">Bugfixes</div>                    <ul class=\"changelog-content\">                        <li>Correction d'une mauvaise g\u00e9n\u00e9ration de l'URL de partage o\u00f9 l'ID pouvait \u00eatre r\u00e9p\u00e9t\u00e9 2 fois.</li>                        <li>Modification du CSS impression pour \u00e9viter un effacement al\u00e9atoire de la barre entre la question et les r\u00e9ponses.</li>                    </ul>                </div>            </div>            <div class=\"changelog-version row\">                <span class=\"changelog-version-title col-xs-12 col-md-12 col-lg-12\">Version 2.2</span>                <div class=\"changelog-part col-xs-12 col-md-12 col-lg-12\">                    <div class=\"changelog-title col-xs-12 col-md-12 col-lg-12\">Am\u00e9liorations / Changements</div>                    <ul class=\"changelog-content\">                        <li>Simplification du code couleur : si une bonne r\u00e9ponse n'est pas coch\u00e9e, alors l'afficher en gras (au lieu de orange/rouge).</li>                        <li>Ajout d'une modale pour partager le QCM ID, et permettre le chargement d'un questionnaire donn\u00e9 via une URL.</li>                    </ul>                </div>            </div>            <div class=\"changelog-version row\">                <span class=\"changelog-version-title col-xs-12 col-md-12 col-lg-12\">Version 2.1</span>                <div class=\"changelog-part col-xs-12 col-md-12 col-lg-12\">                    <div class=\"changelog-title col-xs-12 col-md-12 col-lg-12\">Am\u00e9liorations / Changements</div>                    <ul class=\"changelog-content\">                        <li>Suppression des boutons corriger / r\u00e9sultat en mode examen.</li>                        <li>Retour au d\u00e9but de la page quand le mode de questionnaire est modifi\u00e9.</li>                    </ul>                </div>            </div>            <div class=\"changelog-version row\">                <span class=\"changelog-version-title col-xs-12 col-md-12 col-lg-12\">Version 2.0</span>                <div class=\"changelog-part col-xs-12 col-md-12 col-lg-12\">                    <div class=\"changelog-title col-xs-12 col-md-12 col-lg-12\">Am\u00e9liorations / Changements</div>                    <ul class=\"changelog-content\">                        <li>Nouveau code couleur de correction plus intuitif (vert, orange, rouge, en fonction des r\u00e9ponses utilisateur)</li>                        <li>Ajout du QCM ID, qui identifie de mani\u00e8re unique un questionnaire, une cat\u00e9gorie, un niveau et un nombre de questions. Int\u00e8gre un checksum pour \u00e9viter les erreurs dans les partages d'ID.</li>                        <li>Ajout du mode examen papier (candidat / examinateur), avec CSS pour l'impression. Les questionnaires sont identifiables par leur \"code\" CRC.</li>                        <li>Affichage des boutons corriger et recharger quand la navbar est ferm\u00e9e pour les displays mobiles/tablettes.</li>                        <li>Page \"A propos\" : Ajout d'un bouton \"Retour QCM\" plus intuitif que de cliquer sur \"QCM FFVL\".</li>                        <li>R\u00e9duction de l'opacit\u00e9 du contenu quand la navbar est ouverte.</li>                    </ul>                </div>                <div class=\"changelog-part col-xs-12 col-md-12 col-lg-12\">                    <div class=\"changelog-title col-xs-12 col-md-12 col-lg-12\">Bugfixes</div>                    <ul class=\"changelog-content\">                        <li>Affichage sur la m\u00eame ligne des r\u00e9ponses et des points (apr\u00e8s correction) sur les mobiles.</li>                        <li>Collapse de la navbar \u00e0 1200px pour \u00e9viter de manger la 1ere question sur toutes les tailles (retravail de la navbar pour rentrer dans 1200 px).</li>                        <li>Checkboxs compl\u00e8tement d\u00e9sactiv\u00e9es quand la navbar est ouverte.</li>                    </ul>                </div>            </div>            <div class=\"changelog-version row\">                <span class=\"changelog-version-title col-xs-12 col-md-12 col-lg-12\">Version 1.2</span>                <div class=\"changelog-part col-xs-12 col-md-12 col-lg-12\">                    <div class=\"changelog-title col-xs-12 col-md-12 col-lg-12\">Bugfixes</div>                    <ul class=\"changelog-content\">                        <li>Changer les options en \u00e9tant dans la page \"\u00e0 propos\" redirige vers la page QCM au lieu d'afficher \"Chargement...\" au milieu de la page.</li>                    </ul>                </div>            </div>            <div class=\"changelog-version row\">                <span class=\"changelog-version-title col-xs-12 col-md-12 col-lg-12\">Version 1.1</span>                <div class=\"changelog-part col-xs-12 col-md-12 col-lg-12\">                    <div class=\"changelog-title col-xs-12 col-md-12 col-lg-12\">Am\u00e9liorations / Changements</div>                    <ul class=\"changelog-content\">                        <li>En mode smartphone/tablette, quand le formulaire est cliqu\u00e9, la barre de menu se r\u00e9duit (et rien ne se coche/d\u00e9coche)</li>                    </ul>                </div>            </div>            <div class=\"changelog-version row\">                <span class=\"changelog-version-title col-xs-12 col-md-12 col-lg-12\">Version 1.0</span>                <div class=\"changelog-part col-xs-12 col-md-12 col-lg-12\">                    <span class=\"col-xs-12 col-md-12 col-lg-12\">Premi\u00e8re version !</span>                </div>            </div>        </div>    </div>    <div class=\"panel panel-default\">        <div class=\"panel-heading\">Licence</div>        <div class=\"panel-body\">            \"THE BEER-WARE LICENSE\" (Revision 42) :            <br/><br/>            As long as you retain this notice you can do whatever you want with this stuff.            <br/>            If we meet some day, and you think this stuff is worth it, you can buy me a beer in return.            <br/><br/>            Tant que vous conservez cet avertissement, vous pouvez faire ce que vous voulez de ce truc.            <br/>            Si on se rencontre un jour et que vous pensez que ce truc vaut le coup, vous pouvez me payer une bi\u00e8re en retour.            <br/><br/>            J\u00e9r\u00e9my Ruffet        </div>    </div>    <div class=\"panel panel-default\">        <div class=\"panel-heading\">Remerciements</div>        <div class=\"panel-body\">            <div class=\"row\">                <div class=\"col-xs-12 col-md-12 col-lg-12\">                    <div class=\"about-title col-xs-12 col-md-12 col-lg-12\">Augustin</div>                    <ul class=\"about-content\">                        <li>Suggestion du nouveau code couleur (version 2.0)</li>                        <li>Suggestion du bouton \"Corriger\" dans la navbar sur mobile (version 2.0)</li>                    </ul>                </div>            </div>        </div>    </div></div>");
});

