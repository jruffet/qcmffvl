'use strict';

/* Controllers */

angular.module('qcmffvl.controllers', [])
    .controller('MainCtrl', ['$scope', '$location', '$timeout', '$http', '$filter', '$localStorage', 'dialogs', 'deviceDetector', function ($scope, $location, $timeout, $http, $filter, $localStorage, dialogs, deviceDetector) {
        $scope.version = __APP_VERSION__;
        $scope.qcmVersion = __QCM_VERSION__;

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
            QCMID: "",
            helpQuestion: null
        }
        $scope.headerExam = {
            candidat: [{
                title: "Candidat",
                items: ["Nom", "Prénom", "Club / école", "Numéro de licence"]
            }, {
                title: "Examen",
                items: ["Date", "Structure organisatrice", "Points obtenus", "QCM validé (oui / non)"]
            }],
            examinateur: [{
                title: "Examinateur",
                items: ["Nom", "Prénom", "Club / école", "Numéro de licence"]
            }, {
                title: "Examen",
                items: ["Date", "Structure organisatrice"]
            }]
        };
        $scope.headerExamPapier = $scope.headerExam.candidat;

        // automatically removed by a directive when the QCM is loaded
        $scope.loading = true;
        $scope.hideNavbarButtons = false;
        $scope.showUpdateBanner = false;
        $scope.qcmOptions = {};
        // show the QCM view ?
        $scope.qcm = [];
        $scope.filtered_qcm = [];
        $scope.showQCM = true;

        // ============ Storage init ============
        const storage_default = {
            conf: {
                activity: "Parapente",
                level: "Brevet de Pilote",
                nbquestions: "30",
                category: "Toutes",
                seed: 42,
            },
            answers: {}
        }
        $scope.$storage = $localStorage.$default(storage_default);

        // Ensure all storage_default keys exist and are valid
        Object.keys(storage_default.conf).forEach(key => {
            // 1. Ensure key exists in $storage.conf
            if (!(key in $scope.$storage.conf)) {
                $scope.$storage.conf[key] = storage_default.conf[key];
            }

            const val = $scope.$storage.conf[key];
            const config = $scope.main.conf[key];

            // 2. If the config has options, ensure the current value is valid
            if (config?.options?.indexOf(val) === -1) {
                $scope.$storage.conf[key] = storage_default.conf[key];
            }
        });

        // 3. Remove any extra keys not in storage_default.conf
        Object.keys($scope.$storage.conf).forEach(key => {
            if (!(key in storage_default.conf)) {
                delete $scope.$storage.conf[key];
            }
        });
        // ================================================

        $scope.collapseNav = function () {
            $('html').trigger('click');
            $scope.navCollapsed = true;
        }

        $scope.loadJSON = function () {
            $scope.loading = true;
            return $timeout(function () {
                return $http.get('./generated/qcm_ffvl.json?v=' + $scope.qcmVersion)
                    .success(function (data) {
                        $scope.qcmOrig = data.questions;
                        // Initialize checked state for all answers in the template
                        $scope.qcmOrig.forEach(q => {
                            q.answers.forEach(a => a.checked = false);
                        });
                        $scope.qcmOptions.catDistrib = data.catDistrib;
                    })
                    .error(function () {
                        dialogs.error('Erreur', 'Impossible de charger le JSON');
                    });

            }, 100);
        }

        $scope.unfillQCMAnswers = function () {
            $scope.main.checkAnswers = false;
            QCM.untickAnswers($scope.qcm);
        }

        $scope.deleteStoredAnswers = function () {
            $scope.$storage.answers = {};
        }

        // Used for QCMID compute
        $scope.optionsToArray = function () {
            let opt = [];
            opt[0] = $scope.main.conf.activity.options.indexOf($scope.$storage.conf.activity);
            opt[1] = $scope.main.conf.level.options.indexOf($scope.$storage.conf.level);
            opt[2] = $scope.main.conf.category.options.indexOf($scope.$storage.conf.category);
            opt[3] = $scope.main.conf.nbquestions.options.indexOf($scope.$storage.conf.nbquestions);
            return opt;
        }
        $scope.optionsArrToStorage = function (opt) {
            $scope.$storage.conf.activity = $scope.main.conf.activity.options[opt[0]];
            $scope.$storage.conf.level = $scope.main.conf.level.options[opt[1]];
            $scope.$storage.conf.category = $scope.main.conf.category.options[opt[2]];
            $scope.$storage.conf.nbquestions = $scope.main.conf.nbquestions.options[opt[3]];
        }

        $scope.updateQCMID = function () {
            $scope.main.QCMID = QCM.QCMID($scope.$storage.conf.seed, $scope.optionsToArray(), $scope.version, $scope.qcmVersion);
            $scope.main.QCMIDURL = `https://qcm.ffvl.fr/#/load/${$scope.main.QCMID}`;
        }

        $scope.regenerateQCM = function (renewSeed = true, keepAnswers = false) {
            $scope.loading = true;
            $scope.main.checkAnswers = false;
            $scope.main.helpQuestion = null;
            $scope.collapseNav();

            $timeout(function () {
                if (renewSeed) {
                    $scope.$storage.conf.seed = PRNG.newSeed();
                }
                if (!keepAnswers) {
                    $scope.unfillQCMAnswers();
                    $scope.deleteStoredAnswers();
                }
                const result = QCM.generateQCM($scope.qcmOrig, $scope.$storage.conf, $scope.qcmOptions.catDistrib);
                if (result) {
                    $scope.qcm = result.qcm;
                    $scope.seed = result.seed;
                }

                if ($scope.main.exam.enabled && !$scope.main.exam.is_candidat) {
                    QCM.tickAnswers($scope.qcm);
                }
                if (keepAnswers && Object.keys($scope.$storage.answers).length > 0) {
                    QCM.tickAnswers($scope.qcm, $scope.$storage.answers);
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

            if (!QCM.isValidQCMID(QCMID)) {
                errorMsg = '<b>QCM ID invalide</b> (' + QCMID + ')';
            } else if (!QCM.isQCMIDVersionMatch(QCMID, $scope.version, $scope.qcmVersion)) {
                errorMsg = "QCMID non compatible avec cette version<br>Le questionnaire courant a été rechargé";
            }
            if (errorMsg) {
                dialogs.error('Erreur', errorMsg);
                // Useful when called from /#/load/xxxx
                $scope.regenerateQCM(false, true);
                return;
            }
            const result = QCM.extractSeedAndOptionsFromQCMID(QCMID);
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
            const { nbquestions, activity, level, category } = $scope.$storage.conf;

            const nbText = nbquestions === 'Toutes'
                ? 'toutes les questions'
                : `${nbquestions.toString().toLowerCase()} questions`;

            const categoryText = category.indexOf("Toutes") === -1
                ? ` de la catégorie <b>${category}</b>`
                : '';

            const text = `Composer un nouveau questionnaire <b>${activity}</b> niveau <b>${level}</b> avec <b>${nbText}</b>${categoryText} (et effacer vos réponses) ?`;

            dialogs.confirm('Confirmation', text).result.then(function () {
                // wait for modal to close to avoid weird effects
                $scope.main.checkAnswers = false;
                $timeout(function () {
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
            if ($location.url().indexOf("/qcm") === -1) {
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
            if (newval !== oldval) {
                $scope.updateFilteredResult();
            }
        });

        $scope.$watchGroup(['$storage.conf.nbquestions', '$storage.conf.level', '$storage.conf.category', '$storage.conf.activity'], function (newval, oldval) {
            if (newval !== oldval) {
                $scope.updateQCMID();
            }
        });


        $scope.$watch('main.exam.enabled', function (newval, oldval) {
            if (newval !== oldval) {
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
            if (newval !== oldval) {
                if ($scope.main.exam.enabled) {
                    $scope.headerExamPapier = newval ? $scope.headerExam.candidat : $scope.headerExam.examinateur;
                    $scope.unfillQCMAnswers();
                    if (!newval) {
                        QCM.tickAnswers($scope.qcm);
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
        // Capture the original path before LoadCtrl redirects (which happens in the same digest cycle)
        const wasLoadPath = $location.path().indexOf("/load/") !== -1;

        $scope.loadJSON().then(function () {
            // Load changelog and thanks data
            $http.get('./json/changelog.json?v=' + $scope.version)
                .then(function (resp) { $scope.changelog = resp.data; });
            $http.get('./json/thanks.json?v=' + $scope.version)
                .then(function (resp) { $scope.thanks = resp.data; });

            if (!wasLoadPath) {
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
                } else {
                    $scope.regenerateQCM();
                }
            }
        });
    }])


    .controller('LoadCtrl', ['$scope', '$routeParams', '$location', function ($scope, $routeParams, $location) {
        $scope.$parent.loadQCMID($routeParams.qcmid);
        $location.path("/qcm", false);
    }])


    .controller('QCMCtrl', ['$scope', function ($scope) {
        $scope.questions = [];
        $scope.$parent.hideNavbarButtons = false;

        if (!$scope.$parent.qcm) {
            $scope.$parent.loadJSON();
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
            return QCM.getPoints(question);
        }

        $scope.successQuestion = function (question) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers || $scope.isHelpQuestion(question)) {
                return false;
            }
            return (QCM.getPoints(question) === 6);
        }

        $scope.failedQuestion = function (question) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers || $scope.isHelpQuestion(question)) {
                return false;
            }
            return (QCM.getPoints(question) === 0);
        }

        $scope.warningQuestion = function (question) {
            if ($scope.main.exam.enabled || !$scope.main.checkAnswers || $scope.isHelpQuestion(question)) {
                return false;
            }
            const points = QCM.getPoints(question);
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

        $scope.helpQuestionToggle = function (q) {
            if ($scope.navCollapsed && !$scope.main.exam.enabled) {
                $scope.main.helpQuestion = ($scope.main.helpQuestion === q.code) ? null : q.code;
            }
        }

        $scope.isHelpQuestion = function (q) {
            if (q && !$scope.main.exam.enabled) {
                return (q.code === $scope.main.helpQuestion);
            } else {
                return false;
            }
        }
        $scope.resetHelpQuestion = function () {
            $scope.main.helpQuestion = null;
        }

        $scope.$watch('main.checkAnswers', function (newval, oldval) {
            if (oldval !== newval && newval === true) {
                $scope.main.score = QCM.getScore($scope.filtered_qcm);
                $scope.$parent.deleteStoredAnswers();
            }
        });
    }])


    .controller('AboutCtrl', ['$scope', function ($scope) {
        $scope.$parent.navCollapsed = true;
        $scope.$parent.loading = false;
        $scope.$parent.hideNavbarButtons = true;

        document.body.scrollTop = document.documentElement.scrollTop = 0;
    }])


    .controller('ffvldialogCtrl', ['$scope', '$modalInstance', 'data', function ($scope, $modalInstance, data) {
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
    }])


    .controller('QCMIDDialogCtrl', ['$scope', '$modalInstance', 'data', 'clipboard', '$timeout', function ($scope, $modalInstance, data, clipboard, $timeout) {
        $scope.main = data;
        $scope.copyButtonText = '';
        $scope.copyButtonClass = '';

        $scope.main.userQCMID = angular.copy($scope.main.QCMID);
        $scope.verifyQCMID = function () {
            if ($scope.main.QCMID !== $scope.main.userQCMID) {
                return QCM.isValidQCMID($scope.main.userQCMID);
            } else {
                return true;
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
    }])


    .controller('ParametersCtrl', ['$scope', '$modalInstance', 'data', function ($scope, $modalInstance, data) {
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


            $scope.$storage.conf["nbquestions"] = $scope.parameter["nbquestions"].toString();

            // Return array of changed keys for parent to handle regeneration
            $modalInstance.close(changedKeys.length > 0 ? changedKeys : []);
        }
    }]);
