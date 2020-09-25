'use strict';

/* Controllers */

angular.module('qcmffvl.controllers', [])

.controller('MainCtrl', function($scope, API, $location, $timeout, $http, $filter, $window, $templateCache, $localStorage, dialogs, deviceDetector) {
    $scope.$storage = $localStorage.$default({
        conf: {
            sport: "Parapente",
            level:"Brevet de Pilote",
            nbquestions:"30",
            category:"Toutes les catégories"
        },
        answers:{}
    });

    $scope.main = {
        sport: {
            options: [ "Parapente", "Delta" ],
            checked: $scope.$storage.conf.sport
        },
        level: {
            options: [ "Brevet Initial", "Brevet de Pilote", "Brevet de Pilote Confirmé"],
            checked: $scope.$storage.conf.level
        },
        nbquestions: {
        	options: [ "10", "30", "60", "90", "Toutes les" ],
        	checked: $scope.$storage.conf.nbquestions
        },
        typeExam: {
            options: [ "Révision", "Examen papier (candidat)", "Examen papier (examinateur)" ],
            checked: "Révision"
        },
        category : {
            options: ["Toutes les catégories", "Matériel", "Mécavol", "Météo", "Pilotage", "Réglementation"],
            checked: $scope.$storage.conf.category
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
    $scope.headerExamPapierCandidat = [{
        title: "Candidat",
        items: ["Nom", "Prénom", "Club / école", "Numéro de licence"]
    },{
        title: "Examen",
        items: ["Date", "Structure organisatrice", "Points obtenus", "QCM validé (oui / non)"]
    }]
    $scope.headerExamPapierExaminateur = [{
        title: "Examinateur",
        items: ["Nom", "Prénom", "Club / école", "Numéro de licence"]
    },{
        title: "Examen",
        items: ["Date", "Structure organisatrice"]
    }]


    // automatically removed by a directive when the QCM is loaded
    $scope.loading = true;
    $scope.hideNavbarButtons = false;
    $scope.browserCheckOverride = false;
    $scope.version = "3.5.2";
    $scope.qcmVersion = "1.6";
    $scope.qcmVer = $scope.qcmVersion.replace(".", "");
    $scope.qcmOptions = {};
    // show the QCM view ?
    $scope.showQCM = true;
    $scope.main.search = {};
    $scope.main.search.niveau = $scope.main.level.options.indexOf($scope.$storage.conf.level);
    // Backward compat
    if ($scope.$storage.conf.category == "Parapente" || $scope.$storage.conf.category == "Delta") {
        $scope.$storage.conf.sport = $scope.$storage.conf.category;
        $scope.$storage.conf.category = "Toutes les catégories";
    }
    // parapente should never be set to true at the same time as delta is.
    // delta: true + parapente: true would select only the generic questions
    // TODO : remove parapente and delta attributes and make a custom filter
    if ($scope.$storage.conf.sport == "Parapente") {
        $scope.main.search.parapente = true;
    } else {
        $scope.main.search.delta = true;
    }
    // do not load all questions even if it was stored, this would be way too slow and confusing.
    if (!$.isNumeric($scope.$storage.conf.nbquestions)) {
        $scope.$storage.conf.nbquestions = 30;
    }
    $scope.main.limit = $scope.$storage.conf.nbquestions;

    // User has already set some answers in an unfinished QCM, see if he wants to go on
    if ($scope.$storage.QCMID) {
        $scope.showQCM = false;
        var dlg = dialogs.confirm('Chargement du dernier QCM','Charger le dernier questionnaire inachevé (avec vos réponses) ?');
        dlg.result.then(function(btn){
            // wait for modal to close to avoid weird effects
            $timeout(function() {
                $scope.loadQCMID($scope.$storage.QCMID, $scope.$storage.answers);
                $scope.showQCM = true;
            }, 300);
        },function(btn){
            // user wants a new QCM
            $scope.deleteStoredAnswers();
            $scope.showQCM = true;
        });
    }

    $scope.deleteStoredAnswers = function() {
        $scope.$storage.QCMID = "";
        $scope.$storage.answers = {};
    }

    $scope.printQCM = function() {
        window.print();
    }

    $scope.isAndroidApp = function() {
        return (deviceDetector.raw.userAgent.indexOf("QCMFFVL Android App") != -1);
    }

    // load specific QCM ID (+ optionnal answers)
    $scope.loadQCMID = function(QCMID, answers) {
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
                    $scope.generateQCM($scope.main.QCMID, answers);
                },100);
            }
        } else {
            $scope.loadJSON();
        }
        if (!answers) {
            $scope.deleteStoredAnswers();
        }
    }

    $scope.QCMFromJSON = function(data) {
        $scope.qcmOrig = angular.copy(data.questions);
        $scope.qcmOptions.catDistrib = data.catDistrib;
        $scope.qcmOptions.catFallback = data.catFallback;
        $scope.qcmOptions.corresTable = data.corresTable;
        $scope.generateQCM($scope.main.QCMID);
    }

    $scope.loadJSON = function() {
        $scope.loading = true;
        $timeout(function() {
            var data;
            if ($scope.isAndroidApp) {
                data = angular.fromJson($templateCache.get("qcm_ffvl_" + $scope.qcmVersion + ".json"));
                $scope.QCMFromJSON(data);
            } else {
                $http.get('/json/qcm_ffvl_' + $scope.qcmVersion + '.json')
                .success(function(data, status, headers, config){
                    $scope.main.qcmDate = data.date;
                    if ($scope.qcmVersion != data.version) {
                        var dlg = dialogs.error('Erreur','La version de questionnaire chargée ne correspond pas à la version annoncée par le JSON.<br/>Cette erreur ne devrait pas se produire, merci de me contacter (cf "Informations") en indiquant les informations suivantes :<br/>qcmVersion (scope) : ' + $scope.qcmVersion + '<br/>qcmVersion (qcm) : ' + data.version);
                        // dlg.result();
                    } else {
                        $scope.QCMFromJSON(data);
                    }
                })
                .error(function() {
                    var dlg = dialogs.error('Erreur','Impossible de charger le JSON');
                    // dlg.result();
                });
            }
        }, 100);
    }

    $scope.generateQCM = function(QCMID, answers) {
        $scope.loading = true;
        $scope.main.checkAnswers = false;
        $scope.main.helpQuestion = "";
        if (QCMID) {
            $scope.arrayToOptions(API.uncomputeID(QCMID).options);
        }
        $timeout(function() {
            $scope.qcm = angular.copy($scope.qcmOrig);
            $scope.main.QCMID = API.generateQCM($scope.qcm, $scope.qcmOptions, $scope.qcmVer, $scope.optionsToArray(), QCMID, answers);
            if ($scope.main.exam.papierExaminateur)
                API.tickAnswers($scope.qcm);
        },300);
    }

    $scope.optionsToArray = function() {
        var opt = [];
        opt[0] = $scope.main.sport.options.indexOf($scope.$storage.conf.sport);
        opt[1] = $scope.main.level.options.indexOf($scope.$storage.conf.level);
        opt[2] = $scope.main.nbquestions.options.indexOf($scope.$storage.conf.nbquestions);
        opt[3] = $scope.main.category.options.indexOf($scope.$storage.conf.category);
        return opt;
    }

    $scope.arrayToOptions = function(opt) {
        $scope.$storage.conf.sport = $scope.main.sport.options[opt[0]];
        $scope.$storage.conf.level = $scope.main.level.options[opt[1]];
        $scope.$storage.conf.nbquestions = $scope.main.nbquestions.options[opt[2]];
        $scope.$storage.conf.category = $scope.main.category.options[opt[3]];
    }

    $scope.updateQCMID = function() {
        var num = API.uncomputeID($scope.main.QCMID).num;
        $scope.main.QCMID = API.computeID(num, $scope.qcmVer, $scope.optionsToArray());
        if (Object.keys($scope.$storage.answers).length > 0)
            $scope.$storage.QCMID = $scope.main.QCMID;
    }

    $scope.reload = function() {
        var text = 'Composer un nouveau questionnaire <b>' + $scope.$storage.conf.sport + '</b> niveau <b>' + $scope.$storage.conf.level + '</b> avec <b>' + $scope.$storage.conf.nbquestions.toString().toLowerCase() + ' questions</b>'
        if ($scope.$storage.conf.category.indexOf("Toutes") == -1) {
            text += ' de la catégorie <b>' + $scope.$storage.conf.category + '</b>';
        }
        text += ' (et effacer vos réponses) ?';
        var dlg = dialogs.confirm('Confirmation', text);
        dlg.result.then(function(btn){
            // wait for modal to close to avoid weird effects
            $timeout(function() {
                $scope.loading = true;
            }, 300);
            $timeout(function() {
                $scope.main.checkAnswers = false;
                $scope.collapseNav();
                $scope.generateQCM();
                $scope.deleteStoredAnswers();
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
    $scope.resetQCMDisplay = function(mayUntickAnswers) {
        // is unset in the directive "removeLoaderWhenReady()"
		$scope.loading = true;
		$scope.main.displayLimit = 0;
        $scope.main.helpQuestion = "";
		$timeout(function() {
			$scope.main.displayLimit = 10000;
		}, 0);
        if ($scope.qcm && !$scope.main.exam.mode && $scope.main.checkAnswers && mayUntickAnswers) {
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

    $scope.ffvldialog = function(q, index) {
        $scope.q = q;
        $scope.index = index;
        var dlg = dialogs.create('ffvldialog.html','ffvldialogCtrl', $scope);
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

    $scope.warnTypeExamChange = function() {
        if ($scope.main.typeExam != "Révision" && $scope.$storage.QCMID && $scope.isOpen.typeExam) {
            var dlg = dialogs.notify('Information','Passer en mode examen effacera vos réponses.');
            dlg.result.then(function(btn){
                $timeout(function() {
                    $scope.isOpen.typeExam = true;
                }, 1);
            },function(btn){
                // cancel
            });
        }
    }

    $scope.optionsTooLongForWidth = function() {
        if ($window.innerWidth > 992 && $window.innerWidth <= 1300) {
            return ($scope.main.typeExam.checked.indexOf("Examen") != -1) || (!$.isNumeric($scope.$storage.conf.nbquestions));
        } else {
            return false;
        }
    }

    $scope.$watch('$storage.conf.nbquestions', function(newval, oldval) {
        $scope.loading = true;
        if (newval != oldval) {
            $timeout(function() {
                $scope.resetQCMDisplay(false);
                $scope.updateQCMID();
                var limit = $scope.$storage.conf.nbquestions;
                if (limit === "Toutes les") {
                    limit = 10000;
                }
                $scope.main.limit = limit;
            },100);
        }
    });

    $scope.$watch('$storage.conf.sport', function(newval, oldval) {
        $scope.loading = true;
        if (newval != oldval) {
            $timeout(function() {
                $scope.resetQCMDisplay(true);
                $scope.updateQCMID();
                if ($scope.$storage.conf.sport == "Parapente") {
                    $scope.main.search.parapente = true;
                    delete $scope.main.search.delta;
                } else {
                    $scope.main.search.delta = true;
                    delete $scope.main.search.parapente;
                }
            },100);
        }
    });

    $scope.$watch('$storage.conf.level', function(newval, oldval) {
        $scope.loading = true;
        if (newval != oldval) {
            $timeout(function() {
                $scope.resetQCMDisplay(true);
                $scope.updateQCMID();
                $scope.main.search.niveau = $scope.main.level.options.indexOf($scope.$storage.conf.level);
            },100);
        }
    });

    $scope.$watch('$storage.conf.category', function(newval, oldval) {
        $scope.loading = true;
        if (newval != oldval) {
            $scope.resetQCMDisplay(true);
            $scope.updateQCMID();
        }
    });

    $scope.$watch('main.typeExam.checked', function(newval, oldval) {
        if (newval != oldval) {
            $scope.main.exam = [];
            $scope.main.checkAnswers = false;
            if (newval.indexOf("Examen papier") != -1) {
                $scope.main.exam.mode = true;
                $scope.main.exam.papier = true;
                $scope.main.category.checked = "Toutes les catégories";
            }
            if (newval == "Examen papier (candidat)") {
                $scope.main.exam.papierCandidat = true;
                $scope.headerExamPapier = $scope.headerExamPapierCandidat;
            } else if (newval == "Examen papier (examinateur)") {
                $scope.main.exam.papierExaminateur = true;
                $scope.headerExamPapier = $scope.headerExamPapierExaminateur;
            }
            // back from examPapierExaminateur, we want to erase the answers ticked
            $scope.unfillQCMAnswers();
            $scope.deleteStoredAnswers();
            if ($scope.main.exam.papierExaminateur) {
                API.tickAnswers($scope.qcm);
            }
            document.body.scrollTop = document.documentElement.scrollTop = 0;
            $scope.main.typeExamNum = $scope.main.typeExam.options.indexOf($scope.main.typeExam.checked);
            $scope.navCollapsed = true;
        }
    });

    $scope.$watch('main.QCMID', function(newval, oldval) {
        if (newval != oldval) {
            if ($scope.main.QCMIDUser != $scope.main.QCMID) {
                $scope.resetQCMIDUser();
            }
            $scope.main.QCMIDCRC = API.crc($scope.main.QCMID);
            var baseUrl = $scope.isProdURL() ? "qcm.ffvl.fr" : "qcmffvl.sativouf.net/dev";
            $scope.main.QCMIDURL = "http://" + baseUrl + "/#/load/" + $scope.main.QCMID;
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
    });
})

.controller('LoadCtrl', function($scope, $routeParams) {
    $scope.$parent.loadQCMID($routeParams.qcmid);
    if ($routeParams.typeExamNum) {
        $scope.$parent.main.typeExam.checked = $scope.$parent.main.typeExam.options[$routeParams.typeExamNum]
    }
})

.controller('QCMCtrl', function($scope, $filter, $location, $timeout, dialogs, API, filterFilter) {
    $scope.questions = [];
    $scope.$parent.hideNavbarButtons = false;

    if (!$scope.$parent.qcm) {
        $scope.$parent.loadJSON();
    }

    $scope.categorySelected = function () {
        return ($scope.$storage.conf.category.indexOf("Toutes") == -1);
    }

    $scope.toggleCheck = function(q, answer) {
        if ($scope.navCollapsed && !$scope.main.checkAnswers && !$scope.main.exam.papier && !$scope.isHelpQuestion(q)) {
            answer.checked = !answer.checked;

            var index = null;
            for (var i=0; i<q.ans.length && !index; i++) {
                if (answer.text === q.ans[i].text) {
                    index = i;
                }
            }
            // code to store answers in local storage
            // if there are no more answers checked, then delete stored QCMID
            if (answer.checked) {
                if (!$scope.$storage.answers[q.code])
                    $scope.$storage.answers[q.code] = [];
                $scope.$storage.answers[q.code].push(index);
                $scope.$storage.QCMID = $scope.main.QCMID;
            } else {
                var i = $scope.$storage.answers[q.code].indexOf(index); 
                if (i != -1) 
                    $scope.$storage.answers[q.code].splice(i,1);
                if ($scope.$storage.answers[q.code].length == 0)
                    delete $scope.$storage.answers[q.code];
                delete $scope.$storage.QCMID;
            }
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
        arr = $filter('categoryFilter')(arr, $scope.$storage.conf.category);
        arr = $filter('limitTo')(arr, $scope.main.limit);
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

    $scope.badAnswerNotChecked = function(answer) {
        if ($scope.main.exam.papier || !$scope.main.checkAnswers)
            return false;
        return (answer.pts < 0 && !answer.checked);
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

    $scope.mailtoclick = function(q, index) {
        var text = "Merci d'utiliser cette fonctionnalité uniquement pour remonter un problème avec la question ou ses réponses (incohérence, mauvaise formulation, fautes de français...).<br/>"
                    + "Si vous souhaitez des explications, merci de vous tourner vers une école de vol libre.<br/><br/>"
                    + "Continuer ? (répondre \"oui\" va ouvrir une fenêtre de votre client mail)"
        var dlg = dialogs.confirm('Confirmation', text);
        dlg.result.then(function(btn){
            // wait for modal to close to avoid weird effects
            $timeout(function() {
                // ugly (but effective !) way of re-setting q.help, since it is toggled when clicking on the envelope (because it sits in the panel)
                $scope.resetHelpQuestion(q);
                var separator = "---------------------------------" + "\n"
                var subject = "Question " + q.code + "   " + "[QCM " + $scope.qcmVersion + " / WebApp " + $scope.version + " / QCMID " + $scope.main.QCMID + "]";
                var body = "\n\n\n" + separator +
                            "Question " + q.code + "\n" +
                            "#" + index + " du questionnaire : " + $scope.main.QCMIDURL + "\n" +
                            separator +
                            index + ". " + q.question + "\n\n";
                for (var i=0; i<q.ans.length; i++) {
                    body += "- " + q.ans[i].text + " (" + q.ans[i].pts + ")\n";
                }

                var uri = "mailto:request-qcm@ffvl.fr?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
                window.location.href = uri;
            }, 300);
        },function(btn){
            //cancel
        });

    }

    $scope.$watch('main.checkAnswers', function(newval, oldval) {
        if (oldval != newval)
            $scope.updateScore();
        if (newval == true)
            $scope.$parent.deleteStoredAnswers();
    });

})

.controller('SelfTestCtrl', function($scope, API) {
    $scope.$parent.loading = false;
    /* 
    TODO : 
        generate N QCMs (1000 ?)
        for  every setup (cat/level), show :
            - the avg place of each question
            - the percentage of question hitting top 30 and 60
    */
})

.controller('AboutCtrl', function($scope) {
    $scope.$parent.navCollapsed = true;
    $scope.$parent.loading = false;
    $scope.$parent.hideNavbarButtons = true;

    document.body.scrollTop = document.documentElement.scrollTop = 0;
})

.controller('ffvldialogCtrl', function($scope, $modalInstance, $location, data, API) {
    var q = data.q;
    $scope.q = q;
    var index = data.index;

    $scope.ok = function() {
        $modalInstance.dismiss();
    }
    $scope.questionIssue = function() {
        var mailTo = "request-qcm@ffvl.fr";
        $scope.sendMail(mailTo);
    }
    $scope.questionAskHelp = function() {
        var mailTo = "les-moniteurs-vous-repondent@ffvl.fr";
        $scope.sendMail(mailTo);
    }
    $scope.sendMail = function(mailTo) {
        var separator = "---------------------------------" + "\n"
        var subject = "Question " + q.code + "   " + "[QCM " + data.qcmVersion + " / WebApp " + data.version + " / QCMID " + data.main.QCMID + "]";
        var body = "\n\n\n" + separator +
                    "Question " + q.code + "\n" +
                    "#" + index + " du questionnaire : " + data.main.QCMIDURL + "\n" +
                    separator +
                    index + ". " + q.question + "\n\n";
        for (var i=0; i<q.ans.length; i++) {
            body += "- " + q.ans[i].text + " (" + q.ans[i].pts + ")\n";
        }

        var uri = "mailto:"+ encodeURIComponent(mailTo) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        window.location.href = uri;
    }
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
    $scope.ok = function() {
        $modalInstance.dismiss();
    }
})

.run(function($templateCache) {
});

