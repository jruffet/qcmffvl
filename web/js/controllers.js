'use strict';

/* Controllers */

angular.module('qcmffvl.controllers', [])
    .controller('MainCtrl', function ($scope, API, $location, $timeout, $http, $filter, $localStorage, dialogs, deviceDetector) {
        $scope.$storage = $localStorage.$default({
            conf: {
                sport: "Parapente",
                level: "Brevet de Pilote",
                nbquestions: "30",
                category: "Toutes"
            },
            answers: {}
        });

        $scope.main = {
            conf: {
                sport: {
                    options: ["Parapente", "Delta"],
                    checked: $scope.$storage.conf.sport
                },
                level: {
                    options: ["Brevet Initial", "Brevet de Pilote", "Brevet de Pilote Confirmé", "Qualification Treuil"],
                    checked: $scope.$storage.conf.level
                },
                nbquestions: {
                    name: "Nombre de questions",
                    options: ["10", "30", "60", "Toutes"],
                    checked: $scope.$storage.conf.nbquestions
                },
                category: {
                    name: "Catégorie(s)",
                    options: ["Toutes", "Pilotage", "Mécavol", "Météo", "Matériel", "Réglementation", "Facteurs humains", "Milieu naturel"],
                    checked: $scope.$storage.conf.category
                },
            },
            typeExam: {
                options: ["Révision", "Examen papier (candidat)", "Examen papier (examinateur)"],
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
            exam: {
                enabled: false,
                is_candidat: true
            },
            // QCMID is set by API.generateQCM(), or from QCMIDUser when loading a previous QCM
            QCMID: "",
            // QCMIDUser is set by the user, via formattedQCMIDUser
            QCMIDUser: "",
            helpQuestion: ""
        }
        $scope.headerExamPapierCandidat = [{
            title: "Candidat",
            items: ["Nom", "Prénom", "Club / école", "Numéro de licence"]
        }, {
            title: "Examen",
            items: ["Date", "Structure organisatrice", "Points obtenus", "QCM validé (oui / non)"]
        }]
        $scope.headerExamPapierExaminateur = [{
            title: "Examinateur",
            items: ["Nom", "Prénom", "Club / école", "Numéro de licence"]
        }, {
            title: "Examen",
            items: ["Date", "Structure organisatrice"]
        }]
        $scope.headerExamPapier = $scope.headerExamPapierCandidat;

        // Load version info
        $scope.version = "3.10.0";
        $scope.qcmVersion = "3.2";
        $scope.qcmVer = $scope.qcmVersion.replace(".", "");
        // automatically removed by a directive when the QCM is loaded
        $scope.loading = true;
        $scope.hideNavbarButtons = false;
        $scope.browserCheckOverride = false;
        $scope.qcmOptions = {};
        // show the QCM view ?
        $scope.showQCM = true;
        $scope.main.search = {};
        $scope.main.search.niveau = $scope.main.conf.level.options.indexOf($scope.$storage.conf.level);

        // Backward compat
        if ($scope.$storage.conf.category == "Toutes les catégories") {
            $scope.$storage.conf.category = "Toutes";
        }
        if ($scope.$storage.conf.nbquestions == "Toutes les") {
            $scope.$storage.conf.nbquestions = "Toutes";
        }
        // Validate nbquestions, reset to 30 if not in valid options
        if ($scope.main.conf.nbquestions.options.indexOf($scope.$storage.conf.nbquestions.toString()) === -1) {
            $scope.$storage.conf.nbquestions = "30";
        }

        // parapente should never be set to true at the same time as delta is.
        // delta: true + parapente: true would select only the generic questions
        // TODO : remove parapente and delta attributes and make a custom filter
        if ($scope.$storage.conf.sport == "Parapente") {
            $scope.main.search.parapente = true;
        } else {
            $scope.main.search.delta = true;
        }
        $scope.main.limit = $scope.$storage.conf.nbquestions;

        // Check for updates on demand only (not automatically)
        $scope.showUpdateBanner = false;
        $scope.checkForUpdates = function () {
            // Only check when there's internet access
            if (navigator.onLine) {
                $http.get('./json/versions.json?v=' + new Date().getTime())
                    .then(function (resp) {
                        // Compare with stored versions
                        if (resp.data.app_version !== $scope.version || resp.data.mcq_version !== $scope.qcmVersion) {
                            $scope.showUpdateBanner = true;
                        }
                    })
            }
        };

        // Load changelog and thanks data
        $http.get('./json/changelog.json?v=' + $scope.version)
            .then(function (resp) { $scope.changelog = resp.data; });
        $http.get('./json/thanks.json?v=' + $scope.version)
            .then(function (resp) { $scope.thanks = resp.data; });

        // User has already set some answers in an unfinished QCM, see if he wants to go on
        if ($scope.$storage.QCMID) {
            $scope.showQCM = false;
            var dlg = dialogs.confirm('Chargement du dernier QCM', 'Charger le dernier questionnaire inachevé (avec vos réponses) ?');
            dlg.result.then(function (btn) {
                // wait for modal to close to avoid weird effects
                $scope.loadQCMID($scope.$storage.QCMID, $scope.$storage.answers);
                $timeout(function () {
                    $scope.showQCM = true;
                }, 100);
            }, function (btn) {
                // user wants a new QCM
                $scope.deleteStoredAnswers();
                $scope.showQCM = true;
            });
        }

        $scope.deleteStoredAnswers = function (delete_qcm_id = true) {
            if (delete_qcm_id) {
                delete $scope.$storage.QCMID;
            }
            $scope.$storage.answers = {};
        }

        $scope.printQCM = function () {
            window.print();
        }

        // load specific QCM ID (+ optional answers)
        $scope.loadQCMID = function (QCMID, answers) {
            var errorLoadingQCMID = false
            var errorExtraMsg = "";
            if (QCMID) {
                if (API.verifyChecksum(QCMID)) {
                    if (API.verifyVersion(QCMID, $scope.qcmVer)) {
                        // used by loadJSON()
                        $scope.main.QCMID = QCMID;
                    } else {
                        errorLoadingQCMID = true;
                        var QCMIDVersion = API.extractVersion(QCMID);
                        errorExtraMsg = "<br/>La version de questionnaire de ce QCM ID (v" + QCMIDVersion + ") ne correspond pas à la nôtre (v" + $scope.qcmVersion + ")";
                    }
                } else {
                    errorLoadingQCMID = true;
                }
            }
            if (errorLoadingQCMID) {
                dialogs.error('Erreur', '<b>QCM ID invalide</b> (' + QCMID + ')</b><br/>' + errorExtraMsg + '<br/>' + 'Le questionnaire actuel a été rechargé.');
            }
            if ($scope.qcm) {
                if (QCMID) {
                    $timeout(function () {
                        $scope.generateQCM($scope.main.QCMID, answers);
                    }, 100);
                }
            } else {
                $scope.loadJSON();
            }
            if (!answers) {
                $scope.deleteStoredAnswers();
            }
        }

        $scope.QCMFromJSON = function (data) {
            $scope.qcmOrig = angular.copy(data.questions);
            $scope.qcmOptions.catDistrib = data.catDistrib;
            $scope.qcmOptions.catFallback = data.catFallback;
            $scope.qcmOptions.corresTable = data.corresTable;
            $scope.generateQCM($scope.main.QCMID);
        }

        $scope.loadJSON = function () {
            $scope.loading = true;
            $timeout(function () {
                $http.get('./json/qcm_ffvl.json?v=' + $scope.qcmVersion)
                    .success(function (data) {
                        $scope.QCMFromJSON(data);
                    })
                    .error(function () {
                        dialogs.error('Erreur', 'Impossible de charger le JSON');
                    });
            }, 100);
        }

        $scope.generateQCM = function (QCMID, answers) {
            $scope.loading = true;
            $scope.main.checkAnswers = false;
            $scope.main.helpQuestion = "";
            if (QCMID) {
                $scope.arrayToOptions(API.uncomputeID(QCMID).options);
            }
            $timeout(function () {
                $scope.qcm = angular.copy($scope.qcmOrig);
                $scope.main.QCMID = API.generateQCM($scope.qcm, $scope.qcmOptions, $scope.qcmVer, $scope.optionsToArray(), QCMID, answers);
                if ($scope.main.exam.enabled && !$scope.main.exam.is_candidat)
                    API.tickAnswers($scope.qcm);
                $scope.checkForUpdates();
            }, 300);
        }

        $scope.optionsToArray = function () {
            var opt = [];
            opt[0] = $scope.main.conf.sport.options.indexOf($scope.$storage.conf.sport);
            opt[1] = $scope.main.conf.level.options.indexOf($scope.$storage.conf.level);
            opt[2] = $scope.main.conf.nbquestions.options.indexOf($scope.$storage.conf.nbquestions.toString());
            opt[3] = $scope.main.conf.category.options.indexOf($scope.$storage.conf.category);
            return opt;
        }

        $scope.arrayToOptions = function (opt) {
            $scope.$storage.conf.sport = $scope.main.conf.sport.options[opt[0]];
            $scope.$storage.conf.level = $scope.main.conf.level.options[opt[1]];
            $scope.$storage.conf.nbquestions = $scope.main.conf.nbquestions.options[opt[2]];
            $scope.$storage.conf.category = $scope.main.conf.category.options[opt[3]];
        }

        $scope.updateQCMID = function () {
            var num = API.uncomputeID($scope.main.QCMID).num;
            $scope.main.QCMID = API.computeID(num, $scope.qcmVer, $scope.optionsToArray());
            if (Object.keys($scope.$storage.answers).length > 0)
                $scope.$storage.QCMID = $scope.main.QCMID;
        }

        $scope.reload = function () {
            var text = 'Composer un nouveau questionnaire <b>' + $scope.$storage.conf.sport + '</b> niveau <b>' + $scope.$storage.conf.level + '</b> avec <b>' + $scope.$storage.conf.nbquestions.toString().toLowerCase() + ' questions</b>'
            if ($scope.$storage.conf.category.indexOf("Toutes") == -1) {
                text += ' de la catégorie <b>' + $scope.$storage.conf.category + '</b>';
            }
            text += ' (et effacer vos réponses) ?';
            var dlg = dialogs.confirm('Confirmation', text);
            dlg.result.then(function (btn) {
                // wait for modal to close to avoid weird effects
                $timeout(function () {
                    $scope.loading = true;
                }, 300);
                $timeout(function () {
                    $scope.main.checkAnswers = false;
                    $scope.collapseNav();
                    $scope.generateQCM();
                    $scope.deleteStoredAnswers();
                }, 500);
            }, function (btn) {
                //cancel
            });
        }
        $scope.scoreClass = function (score) {
            if (score.percentage >= 75) {
                return "good-score";
            } else {
                return "bad-score";
            }
        }
        $scope.resetQCMDisplay = function (mayUntickAnswers) {
            // is unset in the directive "removeLoaderWhenReady()"
            $scope.loading = true;
            $scope.main.displayLimit = 0;
            $scope.main.helpQuestion = "";
            $timeout(function () {
                $scope.main.displayLimit = 10000;
            }, 0);
            if ($scope.qcm && !$scope.main.exam.enabled && $scope.main.checkAnswers && mayUntickAnswers) {
                API.untickAnswers($scope.qcm);
                $scope.main.checkAnswers = false;
            }
        }

        $scope.collapseNav = function () {
            $('html').trigger('click');
            $scope.navCollapsed = true;
        }

        $scope.isSmartphone = function () {
            return deviceDetector.device === 'phone'
                || deviceDetector.device === 'iphone'
                || deviceDetector.device === 'android';
        }
        $scope.isAndroid = function () {
            return deviceDetector.device === 'android';
        }
        $scope.isIphone = function () {
            return deviceDetector.device === 'iphone';
        }

        $scope.browserChrome = function () {
            return (deviceDetector.browser == "chrome");
        }

        $scope.gotoMainURL = function () {
            $scope.main.exam.enabled = false;
            if ($location.url().indexOf("/qcm") == -1) {
                $location.url("/qcm/");
            }
        }

        $scope.resetQCMIDUser = function () {
            $scope.main.QCMIDUser = $scope.main.QCMID;
            $scope.main.formattedQCMIDUser = $filter('formatQCMID')($scope.main.QCMIDUser);
        }

        $scope.fillQCMAnswers = function () {
            $scope.main.checkAnswers = true;
            API.tickAnswers($scope.qcm);
        }

        $scope.unfillQCMAnswers = function () {
            $scope.main.checkAnswers = false;
            API.untickAnswers($scope.qcm);
        }

        $scope.ffvldialog = function (q, index) {
            $scope.q = q;
            $scope.index = index;
            dialogs.create('ffvldialog.html', 'ffvldialogCtrl', $scope);
        }

        $scope.dialogShare = function () {
            var dlg = dialogs.create('qcmid.html', 'QCMIDDialogCtrl', $scope.main, { size: "lg" });
            dlg.result.then(function (name) {
                $timeout(function () {
                    if ($scope.main.QCMIDUser != $scope.main.QCMID) {
                        $scope.collapseNav();
                        $scope.loading = true;
                        $scope.qcm = [];
                        $scope.loadQCMID($scope.main.QCMIDUser);
                    }
                }, 300);
            }, function () {
            });
        }

        $scope.dialogParameters = function () {
            dialogs.create('parameters.html', 'ParametersCtrl', $scope, { size: "lg" });
        }

        $scope.applyExamConstraints = function () {
            var nbq = $scope.$storage.conf.level !== "Brevet de Pilote" ? "30" : "60";
            $scope.$storage.conf.nbquestions = nbq;
            $scope.$storage.conf.category = "Toutes";
        }

        $scope.toggleExamMode = function () {
            $scope.main.exam.enabled = !$scope.main.exam.enabled;
        }

        $scope.updateFilteredResult = function () {
            // do not trigger when QCM has been emptied
            if (!$scope.qcm || $scope.qcm.length === 0) {
                return;
            }
            var filtered = $filter('filter')($scope.qcm, $scope.main.search);
            filtered = $filter('categoryFilter')(filtered, $scope.$storage.conf.category);
            filtered = $filter('limitTo')(filtered, $scope.main.limit);
            $scope.filtered_result = filtered;
            $scope.loading = false;
        };

        $scope.$watchGroup(
            ['$main.search', '$storage.conf.sport', '$storage.conf.level', '$storage.conf.category'],
            function (newVals, oldVals) {
                if (newVals != oldVals) {
                    $scope.unfillQCMAnswers();
                    $scope.deleteStoredAnswers();
                }
            }
        );

        $scope.$watchGroup(
            ['$main.search', '$storage.conf.sport', '$storage.conf.level', '$storage.conf.category', '$storage.conf.nbquestions'],
            function (newVals, oldVals) {
                if (newVals != oldVals) {
                    $scope.resetQCMDisplay(true);
                    $scope.updateQCMID();
                }
            }
        );

        $scope.$watchGroup(
            ['qcm', '$main.search', '$storage.conf.sport', '$storage.conf.level', '$storage.conf.category', '$storage.conf.nbquestions'],
            function (newVals, oldVals) {
                if (newVals != oldVals) {
                    if ($scope.$storage.conf.sport === "Parapente") {
                        $scope.main.search.parapente = true;
                        delete $scope.main.search.delta;
                    } else {
                        $scope.main.search.delta = true;
                        delete $scope.main.search.parapente;
                    }

                    $scope.main.search.niveau = $scope.main.conf.level.options.indexOf($scope.$storage.conf.level);

                    var limit = $scope.$storage.conf.nbquestions;
                    if (limit === "Toutes") {
                        limit = 10000;
                    }
                    $scope.main.limit = limit;

                    $scope.updateFilteredResult();
                }
            }
        );

        $scope.$watch('main.exam.enabled', function (newval, oldval) {
            if (newval != oldval) {
                $scope.unfillQCMAnswers();
                if (newval) {
                    $scope.main.exam.is_candidat = true;
                    $scope.applyExamConstraints();
                    $scope.$storage.QCMID = $scope.main.QCMID;
                    $scope.deleteStoredAnswers(false);
                } else {
                    $scope.deleteStoredAnswers();
                }
                document.body.scrollTop = document.documentElement.scrollTop = 0;
                $scope.navCollapsed = true;
            }
        });

        $scope.$watch('main.exam.is_candidat', function (newval, oldval) {
            if (newval != oldval && $scope.main.exam.enabled) {
                $scope.headerExamPapier = newval ? $scope.headerExamPapierCandidat : $scope.headerExamPapierExaminateur;
                $scope.unfillQCMAnswers();
                if (!newval) {
                    API.tickAnswers($scope.qcm);
                }
            }
        });

        $scope.$watch('$storage.conf.level', function (newval) {
            if (!$scope.main.exam.enabled) {
                $scope.$storage.conf.level = newval;
            } else {
                $scope.applyExamConstraints();
            }
        });

        $scope.$watch('main.QCMID', function (newval, oldval) {
            if (newval != oldval) {
                if ($scope.main.QCMIDUser != $scope.main.QCMID) {
                    $scope.resetQCMIDUser();
                }
                $scope.main.QCMIDCRC = API.crc($scope.main.QCMID);
                var baseUrl = "qcm.ffvl.fr";
                $scope.main.QCMIDURL = "https://" + baseUrl + "/#/load/" + $scope.main.QCMID;
            }
        });

        $scope.$watch('main.formattedQCMIDUser', function (newval, oldval) {
            if (newval != oldval) {
                $scope.main.QCMIDUser = $filter('removeSpaces')(newval);
                $scope.main.formattedQCMIDUser = $filter('formatQCMID')($scope.main.QCMIDUser);
            }
        });

        $scope.$watch('loading', function (newval) {
            if (newval == false && $location.path().indexOf("/load") != -1) {
                $location.path("/qcm", false);
            }
        });
    })

    .controller('LoadCtrl', function ($scope, $routeParams) {
        $scope.$parent.loadQCMID($routeParams.qcmid);
        if ($routeParams.typeExamNum) {
            $scope.$parent.main.typeExam.checked = $scope.$parent.main.typeExam.options[$routeParams.typeExamNum]
        }
    })

    .controller('QCMCtrl', function ($scope, $filter, $timeout, dialogs, API, filterFilter) {
        $scope.questions = [];
        $scope.$parent.hideNavbarButtons = false;

        if (!$scope.$parent.qcm) {
            $scope.$parent.loadJSON();
        }

        $scope.categorySelected = function () {
            return ($scope.$storage.conf.category.indexOf("Toutes") == -1);
        }

        $scope.toggleCheck = function (q, answer) {
            if ($scope.navCollapsed && !$scope.main.checkAnswers && !$scope.main.exam.enabled && !$scope.isHelpQuestion(q)) {
                answer.checked = !answer.checked;

                var index = null;
                for (var i = 0; i < q.ans.length && !index; i++) {
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
                        $scope.$storage.answers[q.code].splice(i, 1);
                    if ($scope.$storage.answers[q.code].length == 0)
                        delete $scope.$storage.answers[q.code];
                    delete $scope.$storage.QCMID;
                }
            }
        }

        $scope.getPoints = function (question) {
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

        $scope.getScore = function () {
            var arr = filterFilter($scope.qcm, $scope.main.search);
            arr = $filter('categoryFilter')(arr, $scope.$storage.conf.category);
            arr = $filter('limitTo')(arr, $scope.main.limit);
            var score = { user: 0, nb: 0, percentage: 0 };
            for (var i = 0; i < arr.length; i++) {
                var question = arr[i];
                score.user += $scope.getPoints(question);
            }
            score.nb = i;
            score.total = i * 6;
            if (score.total > 0) {
                score.percentage = Math.round(score.user / score.total * 100);
            }
            return score;
        }


        $scope.successQuestion = function (question) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers || $scope.isHelpQuestion(question))
                return false;
            return ($scope.getPoints(question) === 6);
        }

        $scope.failedQuestion = function (question) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers || $scope.isHelpQuestion(question))
                return false;
            return ($scope.getPoints(question) === 0);
        }

        $scope.warningQuestion = function (question) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers || $scope.isHelpQuestion(question))
                return false;
            var points = $scope.getPoints(question);
            return (points >= 1 && points <= 5);
        }

        $scope.goodAnswer = function (answer) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers)
                return false;
            return (answer.pts >= 0 && answer.checked);
        }

        $scope.badAnswer = function (answer) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers)
                return false;
            return (answer.pts < 0 && answer.checked);
        }

        $scope.goodAnswerNotChecked = function (answer) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers)
                return false;
            return (answer.pts > 0 && !answer.checked);
        }

        $scope.badAnswerNotChecked = function (answer) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers)
                return false;
            return (answer.pts < 0 && !answer.checked);
        }

        $scope.updateScore = function () {
            if ($scope.main.checkAnswers) {
                $scope.main.score = $scope.getScore();
            }
        }

        $scope.helpQuestionToggle = function (q) {
            if ($scope.navCollapsed && !$scope.main.exam.enabled) {
                if ($scope.main.helpQuestion == q.code) {
                    $scope.main.helpQuestion = "";
                } else {
                    $scope.main.helpQuestion = q.code;
                }
            }
        }

        $scope.isHelpQuestion = function (q) {
            if (q && !$scope.main.exam.enabled) {
                return (q.code == $scope.main.helpQuestion);
            } else {
                return false;
            }
        }
        $scope.resetHelpQuestion = function () {
            $scope.main.helpQuestion = "";
        }

        $scope.mailtoclick = function (q, index) {
            var text = "Merci d'utiliser cette fonctionnalité uniquement pour remonter un problème avec la question ou ses réponses (incohérence, mauvaise formulation, fautes de français...).<br/>"
                + "Si vous souhaitez des explications, merci de vous tourner vers une école de vol libre.<br/><br/>"
                + "Continuer ? (répondre \"oui\" va ouvrir une fenêtre de votre client mail)"
            var dlg = dialogs.confirm('Confirmation', text);
            dlg.result.then(function (btn) {
                // wait for modal to close to avoid weird effects
                $timeout(function () {
                    // ugly (but effective !) way of re-setting q.help, since it is toggled when clicking on the envelope (because it sits in the panel)
                    $scope.resetHelpQuestion(q);
                    var separator = "---------------------------------" + "\n"
                    var subject = "Question " + q.code + "   " + "[QCM " + $scope.qcmVersion + " / WebApp " + $scope.version + " / QCMID " + $scope.main.QCMID + "]";
                    var body = "\n\n\n" + separator +
                        "Question " + q.code + "\n" +
                        "#" + index + " du questionnaire : " + $scope.main.QCMIDURL + "\n" +
                        separator +
                        index + ". " + q.question + "\n\n";
                    for (var i = 0; i < q.ans.length; i++) {
                        body += "- " + q.ans[i].text + " (" + q.ans[i].pts + ")\n";
                    }

                    var uri = "mailto:request-qcm@ffvl.fr?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
                    window.location.href = uri;
                }, 300);
            }, function (btn) {
                //cancel
            });

        }

        $scope.$watch('main.checkAnswers', function (newval, oldval) {
            if (oldval != newval)
                $scope.updateScore();
            if (newval == true)
                $scope.$parent.deleteStoredAnswers();
        });
    })

    .controller('AboutCtrl', function ($scope) {
        $scope.$parent.navCollapsed = true;
        $scope.$parent.loading = false;
        $scope.$parent.hideNavbarButtons = true;

        document.body.scrollTop = document.documentElement.scrollTop = 0;
    })

    .controller('ffvldialogCtrl', function ($scope, $modalInstance, data) {
        var q = data.q;
        $scope.q = q;
        var index = data.index;

        $scope.ok = function () {
            $modalInstance.dismiss();
        }
        $scope.questionIssue = function () {
            var mailTo = "request-qcm@ffvl.fr";
            $scope.sendMail(mailTo);
        }
        $scope.questionAskHelp = function () {
            var mailTo = "les-moniteurs-vous-repondent@ffvl.fr";
            $scope.sendMail(mailTo);
        }
        $scope.sendMail = function (mailTo) {
            var separator = "---------------------------------" + "\n"
            var subject = "Question " + q.code + "   " + "[QCM " + data.qcmVersion + " / WebApp " + data.version + " / QCMID " + data.main.QCMID + "]";
            var body = "\n\n\n" + separator +
                "Question " + q.code + "\n" +
                "#" + index + " du questionnaire : " + data.main.QCMIDURL + "\n" +
                separator +
                index + ". " + q.question + "\n\n";
            for (var i = 0; i < q.ans.length; i++) {
                body += "- " + q.ans[i].text + " (" + q.ans[i].pts + ")\n";
            }

            var uri = "mailto:" + encodeURIComponent(mailTo) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
            window.location.href = uri;
        }
    })

    .controller('QCMIDDialogCtrl', function ($scope, $modalInstance, data, API, clipboard, $timeout) {
        $scope.main = data;
        $scope.copyButtonText = '';
        $scope.copyButtonClass = '';

        $scope.savedFormattedQCMIDUser = angular.copy($scope.main.formattedQCMIDUser);
        $scope.verifyQCMIDUser = function () {
            if ($scope.main.formattedQCMIDUser != $scope.savedFormattedQCMIDUser) {
                return API.verifyChecksum($scope.main.QCMIDUser);
            } else {
                return true;
            }
        }
        $scope.QCMIDBlur = function () {
            if (!$scope.verifyQCMIDUser())
                $scope.main.formattedQCMIDUser = angular.copy($scope.savedFormattedQCMIDUser);
        }
        $scope.loadQCMID = function () {
            $modalInstance.close();
        }
        $scope.ok = function () {
            $modalInstance.dismiss();
        }
        $scope.copyAddress = function () {
            clipboard.copyText($scope.main.QCMIDURL);
            $scope.copyButtonText = 'Copié !';
            $scope.copyButtonClass = 'btn-info';
            $timeout(function () {
                $scope.copyButtonText = '';
                $scope.copyButtonClass = '';
            }, 1000);
        }
    })

    .controller('ParametersCtrl', function ($scope, $modalInstance, data) {
        $scope.main = data.main;
        $scope.$storage = data.$storage;

        $scope.ok = function () {
            $modalInstance.dismiss();
        }
    });
