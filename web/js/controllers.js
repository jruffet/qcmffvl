'use strict';

/* Controllers */

angular.module('qcmffvl.controllers', [])
    .controller('MainCtrl', function ($scope, API, $location, $timeout, $http, $filter, $localStorage, dialogs, deviceDetector) {
        $scope.version = __APP_VERSION__;
        $scope.qcmVersion = __QCM_VERSION__;

        $scope.$storage = $localStorage.$default({
            conf: {
                activity: "Parapente",
                level: "Brevet de Pilote",
                nbquestions: "30",
                category: "Toutes",
                seed: 42,
                version: $scope.version,
                qcmVersion: $scope.qcmVersion
            },
            answers: {}
        });

        $scope.main = {
            conf: {
                activity: {
                    options: ["Parapente", "Delta"]
                },
                level: {
                    options: ["Brevet Initial", "Brevet de Pilote", "Brevet de Pilote Confirmé", "Qualification Treuil"]
                },
                nbquestions: {
                    name: "Nombre de questions",
                    options: ["10", "30", "60", "Toutes"]
                },
                category: {
                    name: "Catégorie(s)",
                    options: ["Toutes", "Pilotage", "Mécavol", "Météo", "Matériel", "Réglementation", "Facteurs humains", "Milieu naturel"]
                },
            },
            checkAnswers: false,
            score: {
                total: 0,
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

        // automatically removed by a directive when the QCM is loaded
        $scope.loading = true;
        $scope.hideNavbarButtons = false;
        $scope.showUpdateBanner = false;
        $scope.qcmOptions = {};
        // show the QCM view ?
        $scope.qcm = [];
        $scope.filtered_qcm = [];
        $scope.showQCM = true;

        // ============ Backward compatibility ============
        if ($scope.$storage.conf.category == "Toutes les catégories") {
            $scope.$storage.conf.category = "Toutes";
        }
        if ($scope.$storage.conf.nbquestions == "Toutes les") {
            $scope.$storage.conf.nbquestions = "Toutes";
        }
        // Migrate old 'sport' and 'pratique' to 'activity' if needed
        if ($scope.$storage.conf.sport || $scope.$storage.conf.pratique) {
            $scope.$storage.conf.activity = $scope.$storage.conf.sport || $scope.$storage.conf.pratique;
            delete $scope.$storage.conf.sport;
            delete $scope.$storage.conf.pratique;
        }
        // Validate nbquestions, reset to 30 if not in valid options
        const nbq = $scope.$storage.conf.nbquestions ? $scope.$storage.conf.nbquestions.toString() : null;
        if (!nbq || $scope.main.conf.nbquestions.options.indexOf(nbq) === -1) {
            $scope.$storage.conf.nbquestions = "30";
        }
        if ($scope.$storage.conf.seed === undefined)
            $scope.$storage.conf.seed = 42;
        if ($scope.$storage.conf.version === undefined)
            $scope.$storage.conf.version = $scope.version;
        if ($scope.$storage.conf.qcmVersion === undefined)
            $scope.$storage.conf.qcmVersion = $scope.qcmVersion;
        // ================================================


        $scope.collapseNav = function () {
            $('html').trigger('click');
            $scope.navCollapsed = true;
        }

        $scope.loadJSON = function () {
            $scope.loading = true;
            $timeout(function () {
                $http.get('./json/qcm_ffvl.json?v=' + $scope.qcmVersion)
                    .success(function (data) {
                        $scope.qcmOrig = data.questions;
                        $scope.qcmOptions.catDistrib = data.catDistrib;
                    })
                    .error(function () {
                        dialogs.error('Erreur', 'Impossible de charger le JSON');
                    });
            }, 100);
        }

        $scope.fillQCMAnswers = function () {
            $scope.main.checkAnswers = true;
            API.tickAnswers($scope.qcm);
        }

        $scope.unfillQCMAnswers = function () {
            $scope.main.checkAnswers = false;
            API.untickAnswers($scope.qcm);
        }

        $scope.deleteStoredAnswers = function () {
            $scope.$storage.answers = {};
        }

        // Used for QCMID compute
        $scope.optionsToArray = function () {
            let opt = [];
            opt[0] = $scope.main.conf.activity.options.indexOf($scope.$storage.conf.activity);
            opt[1] = $scope.main.conf.level.options.indexOf($scope.$storage.conf.level);
            opt[2] = $scope.main.conf.nbquestions.options.indexOf($scope.$storage.conf.nbquestions.toString());
            opt[3] = $scope.main.conf.category.options.indexOf($scope.$storage.conf.category);
            return opt;
        }
        $scope.optionsArrToStorage = function (opt) {
            $scope.$storage.conf.activity = $scope.main.conf.activity.options[opt[0]];
            $scope.$storage.conf.level = $scope.main.conf.level.options[opt[1]];
            if (!$scope.main.exam.enabled) {
                $scope.$storage.conf.nbquestions = $scope.main.conf.nbquestions.options[opt[2]];
            }
            $scope.$storage.conf.category = $scope.main.conf.category.options[opt[3]];
        }

        $scope.updateQCMID = function () {
            $scope.main.QCMID = API.QCMID($scope.$storage.conf.seed, $scope.optionsToArray(), $scope.version, $scope.qcmVersion);
            $scope.main.QCMIDURL = `https://qcm.ffvl.fr/#/load/${$scope.main.QCMID}`;
        }

        $scope.regenerateQCM = function (renewSeed = true, keepAnswers = false) {
            $scope.loading = true;
            $scope.collapseNav();
            $scope.main.checkAnswers = false;
            $scope.main.helpQuestion = "";

            $timeout(function () {
                if (renewSeed) {
                    $scope.$storage.conf.seed = API.newSeed();
                }
                if (!keepAnswers) {
                    $scope.unfillQCMAnswers();
                    $scope.deleteStoredAnswers();
                }
                const result = API.generateQCM($scope.qcmOrig, $scope.$storage.conf, $scope.qcmOptions.catDistrib);
                $scope.qcm = result.qcm;
                $scope.seed = result.seed;

                if ($scope.main.exam.enabled && !$scope.main.exam.is_candidat) {
                    API.tickAnswers($scope.qcm);
                }
                if (keepAnswers && Object.keys($scope.$storage.answers).length > 0) {
                    API.tickAnswers($scope.qcm, $scope.$storage.answers);
                }
                // Apply nbquestions limit after generation
                $scope.updateFilteredResult();
                $scope.checkForUpdates();
                $scope.updateQCMID();
                $scope.loading = false;
            }, 300);
        };

        $scope.loadQCMID = function (QCMID) {
            let errorMsg = null;

            if (!API.isValidQCMID(QCMID)) {
                errorMsg = '<b>QCM ID invalide</b> (' + QCMID + ')';
            } else if (!API.isQCMIDVersionMatch(QCMID, $scope.version, $scope.qcmVersion)) {
                errorMsg = "QCMID non compatible avec cette version<br>Le questionnaire courant a été rechargé";
            }
            if (errorMsg) {
                dialogs.error('Erreur', errorMsg);
                // Useful when called from /#/load/xxxx
                $scope.regenerateQCM(false, true);
                return;
            }
            const result = API.extractSeedAndOptionsFromQCMID(QCMID);
            $scope.$storage.conf.seed = result.seed;
            $scope.optionsArrToStorage(result.optArray);
            $scope.regenerateQCM(false);
        }

        // Check for version updates (on demand)
        $scope.checkForUpdates = function () {
            // Only check when there is internet access
            if (navigator.onLine) {
                $http.get('./json/versions.json?v=' + new Date().getTime())
                    .then(function (resp) {
                        // Compare with stored versions
                        if (resp.data.app_version !== $scope.version || resp.data.qcm_version !== $scope.qcmVersion) {
                            $scope.showUpdateBanner = true;
                        }
                    })
            }
        };

        $scope.printQCM = function () {
            window.print();
        }

        $scope.reload = function () {
            let text = 'Composer un nouveau questionnaire <b>' + $scope.$storage.conf.activity + '</b> niveau <b>' + $scope.$storage.conf.level + '</b> avec <b>' + $scope.$storage.conf.nbquestions.toString().toLowerCase() + ' questions</b>'
            if ($scope.$storage.conf.category.indexOf("Toutes") == -1) {
                text += ' de la catégorie <b>' + $scope.$storage.conf.category + '</b>';
            }
            text += ' (et effacer vos réponses) ?';
            dialogs.confirm('Confirmation', text).result.then(function (btn) {
                // wait for modal to close to avoid weird effects
                $timeout(function () {
                    $scope.loading = true;
                }, 300);
                $timeout(function () {
                    $scope.main.checkAnswers = false;
                    $scope.main.QCMID = "";
                    $scope.regenerateQCM();
                }, 500);
            });
        }
        $scope.scoreClass = function (score) {
            if (score.percentage >= 75) {
                return "good-score";
            } else {
                return "bad-score";
            }
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

        $scope.gotoMainURL = function () {
            $scope.main.exam.enabled = false;
            $scope.collapseNav();
            if ($location.url().indexOf("/qcm") == -1) {
                $location.url("/qcm/");
            }
        }

        $scope.applyExamConstraints = function () {
            const nbq = $scope.$storage.conf.level !== "Brevet de Pilote" ? "30" : "60";
            $scope.$storage.conf.nbquestions = nbq;
            if ($scope.$storage.conf.category !== "Toutes") {
                $scope.$storage.conf.category = "Toutes";
                $scope.regenerateQCM();
            }
        }

        $scope.toggleExamMode = function () {
            $scope.main.exam.enabled = !$scope.main.exam.enabled;
        }

        $scope.updateFilteredResult = function () {
            let limit = $scope.$storage.conf.nbquestions;
            if (limit === "Toutes") {
                limit = 10000;
            }
            $scope.filtered_qcm = $filter('limitTo')($scope.qcm, limit);
        };


        $scope.$watch('$storage.conf.nbquestions', function (newval, oldval) {
            if (newval != oldval) {
                $scope.updateFilteredResult();
            }
        });

        $scope.$watchGroup(['$storage.conf.nbquestions', '$storage.conf.level', '$storage.conf.category', '$storage.conf.activity'], function (newval, oldval) {
            if (newval != oldval) {
                $scope.updateQCMID();
            }
        });


        $scope.$watch('main.exam.enabled', function (newval, oldval) {
            if (newval != oldval) {
                $scope.unfillQCMAnswers();
                if (newval) {
                    $scope.main.exam.is_candidat = true;
                    $scope.applyExamConstraints();
                    $scope.deleteStoredAnswers(false);
                } else {
                    $scope.deleteStoredAnswers();
                }
                document.body.scrollTop = document.documentElement.scrollTop = 0;
                $scope.navCollapsed = true;
            }
        });
        $scope.$watch('main.exam.is_candidat', function (newval, oldval) {
            if (newval != oldval) {
                if ($scope.main.exam.enabled) {
                    $scope.headerExamPapier = newval ? $scope.headerExamPapierCandidat : $scope.headerExamPapierExaminateur;
                    $scope.unfillQCMAnswers();
                    if (!newval) {
                        API.tickAnswers($scope.qcm);
                    }
                }
            }
        });

        $scope.ffvldialog = function (q, index) {
            $scope.q = q;
            $scope.index = index;
            dialogs.create('ffvldialog.html', 'ffvldialogCtrl', $scope);
        }

        $scope.dialogShare = function () {
            dialogs.create('qcmid.html', 'QCMIDDialogCtrl', $scope.main, { size: "lg" }).result.then(function (result) {
                $scope.navCollapsed = true;
                $timeout(function () {
                    if (result && result.qcmid) {
                        $scope.loadQCMID(result.qcmid);
                    }
                }, 300);
            });
        }
        $scope.dialogParameters = function () {
            dialogs.create('parameters.html', 'ParametersCtrl', $scope, { size: "lg" }).result.then(function (changedKeys) {
                // ParametersCtrl returns array of changed keys if any params changed
                if (changedKeys && changedKeys.length > 0) {
                    $scope.regenerateQCM();
                }
            });
        }

        // ================== Start =====================
        $scope.loadJSON();

        // Determine if we are loading from a specific QCMID or starting fresh
        const isLoadPath = $location.path().indexOf("/load/") !== -1;

        // Load changelog and thanks data
        $http.get('./json/changelog.json?v=' + $scope.version)
            .then(function (resp) { $scope.changelog = resp.data; });
        $http.get('./json/thanks.json?v=' + $scope.version)
            .then(function (resp) { $scope.thanks = resp.data; });

        // User has already set some answers in an unfinished QCM, see if he wants to go on
        if (Object.keys($scope.$storage.answers).length > 0) {
            $scope.showQCM = false;
            const dlg = dialogs.confirm('Chargement du dernier QCM', 'Charger le dernier questionnaire inachevé (avec vos réponses) ?');
            dlg.result.then(function () {
                $scope.regenerateQCM(false, true);
            }, function () {
                $scope.regenerateQCM();
            }).finally(function () {
                $scope.showQCM = true;
            });
        } else if (!isLoadPath) {
            $scope.regenerateQCM();
        }
    })


    .controller('LoadCtrl', function ($scope, $routeParams, $location) {
        $scope.$parent.loadQCMID($routeParams.qcmid);
        $location.path("/qcm", false);
    })


    .controller('QCMCtrl', function ($scope, $timeout, dialogs) {
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

                const index = q.answers.findIndex(a => a.text === answer.text);
                if (index === -1) return;

                if (answer.checked) {
                    $scope.$storage.answers[q.code] = $scope.$storage.answers[q.code] || [];
                    $scope.$storage.answers[q.code].push(index);
                } else {
                    const stored = $scope.$storage.answers[q.code];
                    if (stored) {
                        const i = stored.indexOf(index);
                        if (i !== -1) {
                            stored.splice(i, 1);
                        }
                        if (stored.length === 0) {
                            delete $scope.$storage.answers[q.code];
                        }
                    }
                }
            }
        }

        $scope.getPoints = function (question) {
            let total = 0;
            for (let i = 0; i < question.answers.length; i++) {
                if (question.answers[i].checked) {
                    total += question.answers[i].pts;
                }
            }
            return Math.max(0, total);
        }

        $scope.getScore = function () {
            let score = { user: 0, nb: 0, percentage: 0 };
            for (let i = 0; i < $scope.filtered_qcm.length; i++) {
                const question = $scope.filtered_qcm[i];
                score.user += $scope.getPoints(question);
            }
            score.total = $scope.filtered_qcm.length * 6;
            if (score.total > 0) {
                score.percentage = Math.round(score.user / score.total * 100);
            }
            return score;
        }


        $scope.successQuestion = function (question) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers || $scope.isHelpQuestion(question)) {
                return false;
            }
            return ($scope.getPoints(question) === 6);
        }

        $scope.failedQuestion = function (question) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers || $scope.isHelpQuestion(question)) {
                return false;
            }
            return ($scope.getPoints(question) === 0);
        }

        $scope.warningQuestion = function (question) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers || $scope.isHelpQuestion(question)) {
                return false;
            }
            const points = $scope.getPoints(question);
            return (points >= 1 && points <= 5);
        }

        $scope.goodAnswer = function (answer) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers) {
                return false;
            }
            return (answer.pts >= 0 && answer.checked);
        }

        $scope.badAnswer = function (answer) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers) {
                return false;
            }
            return (answer.pts < 0 && answer.checked);
        }

        $scope.goodAnswerNotChecked = function (answer) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers) {
                return false;
            }
            return (answer.pts > 0 && !answer.checked);
        }

        $scope.badAnswerNotChecked = function (answer) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers) {
                return false;
            }
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

        $scope.$watch('main.checkAnswers', function (newval, oldval) {
            if (oldval != newval) {
                $scope.updateScore();
                if (newval == true) {
                    $scope.$parent.deleteStoredAnswers();
                }
            }
        });
    })


    .controller('AboutCtrl', function ($scope) {
        $scope.$parent.navCollapsed = true;
        $scope.$parent.loading = false;
        $scope.$parent.hideNavbarButtons = true;

        document.body.scrollTop = document.documentElement.scrollTop = 0;
    })


    .controller('ffvldialogCtrl', function ($scope, $modalInstance, data) {
        $scope.q = data.q;
        const index = data.index;

        $scope.ok = function () {
            $modalInstance.dismiss();
        }
        $scope.questionIssue = function () {
            const mailTo = "request-qcm@ffvl.fr";
            $scope.sendMail(mailTo);
        }
        $scope.questionAskHelp = function () {
            const mailTo = "les-moniteurs-vous-repondent@ffvl.fr";
            $scope.sendMail(mailTo);
        }
        $scope.sendMail = function (mailTo) {
            const separator = "---------------------------------\n";
            const subject = `Question ${q.code}   [QCM ${data.qcmVersion} / WebApp ${data.version} / QCMID ${data.main.QCMID}]`;

            let body = `\n\n\n${separator}Question ${q.code}\n#${index} du questionnaire : ${data.main.QCMIDURL}\n${separator}${index}. ${q.question}\n\n`;

            for (const answer of q.answers) {
                body += `- ${answer.text} (${answer.pts})\n`;
            }

            const uri = `mailto:${encodeURIComponent(mailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = uri;
        }
    })


    .controller('QCMIDDialogCtrl', function ($scope, $modalInstance, data, API, clipboard, $timeout) {
        $scope.main = data;
        $scope.copyButtonText = '';
        $scope.copyButtonClass = '';

        $scope.main.userQCMID = angular.copy($scope.main.QCMID);
        $scope.verifyQCMID = function () {
            if ($scope.main.QCMID != $scope.main.userQCMID) {
                return API.isValidQCMID($scope.main.userQCMID);
            } else {
                return true;
            }
        }
        $scope.QCMIDBlur = function () {
            if (!$scope.verifyQCMID()) {
                $scope.main.formattedQCMIDUser = angular.copy($scope.savedFormattedQCMIDUser);
            }
        }
        $scope.returnQCMID = function () {
            $modalInstance.close({
                qcmid: $scope.main.userQCMID
            });
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
            }, 500);
        }
    })


    .controller('ParametersCtrl', function ($scope, $modalInstance, data) {
        $scope.main = data.main;
        $scope.$storage = data.$storage;

        $scope.parameter = {};
        angular.forEach(['activity', 'level', 'category', 'nbquestions'], function (key) {
            $scope.parameter[key] = $scope.$storage.conf[key];
        });

        $scope.$watch('parameter.level', function (newVal) {
            if ($scope.main.exam.enabled) {
                if (newVal === "Brevet de Pilote") {
                    $scope.parameter.nbquestions = 60;
                } else {
                    $scope.parameter.nbquestions = 30;
                }
            }
        });

        $scope.ok = function () {
            let changedKeys = [];

            // Compare temp vars with storage and update if different
            angular.forEach(['activity', 'level', 'category'], function (key) {
                if ($scope.parameter[key] !== $scope.$storage.conf[key]) {
                    $scope.$storage.conf[key] = $scope.parameter[key];
                    changedKeys.push(key);
                }
            });


            $scope.$storage.conf["nbquestions"] = $scope.parameter["nbquestions"];

            // Return array of changed keys for parent to handle regeneration
            $modalInstance.close(changedKeys.length > 0 ? changedKeys : []);
        }
    });
