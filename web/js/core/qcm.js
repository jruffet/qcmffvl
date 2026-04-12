import { PRNG } from './prng.js';

export const QCM = {
    generateQCM: function (qcm, options, catDistrib) {
        if (qcm === undefined) {
            return;
        }
        const activity = options.activity;
        const level = options.level;
        const category = options.category;
        const seed = options.seed;

        let prng = PRNG.createPRNG(seed);
        const showAllCategories = category === "Toutes";

        // Deep copy the filtered results so no references are shared with the original qcm
        const filteredQCM = structuredClone(qcm.filter(q => {
            const activityMatch = q.activities.includes(activity);
            const levelMatch = q.levels.includes(level);
            const categoryMatch = showAllCategories || q.categories.includes(category);

            return activityMatch && levelMatch && categoryMatch;
        }));

        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(prng.next() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        };

        shuffle(filteredQCM);

        filteredQCM.forEach(q => {
            shuffle(q.answers);
        });

        const distributedQCM = [];
        const usedIndices = new Set();
        const totalQuestions = filteredQCM.length;
        let globalDistPointer = 0;

        while (usedIndices.size < totalQuestions) {
            const currentChunkSize = Math.min(10, totalQuestions - usedIndices.size);
            const currentChunk = [];

            for (let i = 0; i < currentChunkSize; i++) {
                let found = false;

                // Try to satisfy the next category in the distribution sequence
                // We limit attempts to the length of catDistrib to ensure we "circle" through all requirements
                for (let attempt = 0; attempt < catDistrib.length; attempt++) {
                    const targetCat = catDistrib[globalDistPointer];

                    // Search for an unused question matching targetCat
                    for (let j = 0; j < totalQuestions; j++) {
                        if (!usedIndices.has(j) && filteredQCM[j].categories.includes(targetCat)) {
                            currentChunk.push(filteredQCM[j]);
                            usedIndices.add(j);
                            found = true;
                            // Successfully found a match, move pointer to next requirement in distribution
                            globalDistPointer = (globalDistPointer + 1) % catDistrib.length;
                            break;
                        }
                    }

                    if (found) {
                        break;
                    }

                    // If target category was not found, move to the next category in the circle
                    globalDistPointer = (globalDistPointer + 1) % catDistrib.length;
                }

                // Fallback: If no category match was found after circling the whole distribution,
                // take the first available question to ensure the chunk is filled.
                if (!found) {
                    for (let j = 0; j < totalQuestions; j++) {
                        if (!usedIndices.has(j)) {
                            currentChunk.push(filteredQCM[j]);
                            usedIndices.add(j);
                            found = true;
                            break;
                        }
                    }
                }
            }

            // Shuffle the chunk of 10 (or less) before adding to the final list
            shuffle(currentChunk);
            distributedQCM.push(...currentChunk);
        }

        return {
            qcm: distributedQCM,
            seed: seed
        }
    },
    tickAnswers: function (qcm, userAnswers) {
        if (qcm) {
            for (let i = 0; i < qcm.length; i++) {
                for (let j = 0; j < qcm[i].answers.length; j++) {
                    if (userAnswers) {
                        if (userAnswers[qcm[i].code] && userAnswers[qcm[i].code].indexOf(j) !== -1) {
                            qcm[i].answers[j].checked = true;
                        }
                    } else {
                        if (qcm[i].answers[j].pts >= 0) {
                            qcm[i].answers[j].checked = true;
                        }
                    }
                }
            }
        }
    },
    untickAnswers: function (qcm) {
        if (qcm) {
            for (let i = 0; i < qcm.length; i++) {
                for (let j = 0; j < qcm[i].answers.length; j++) {
                    qcm[i].answers[j].checked = false;
                }
            }
        }
    },
    QCMID: function (seed, optArray, appVersion, qcmVersion) {
        // Construct base string from 4-digit seed and 3-digit options array
        const baseStr = [
            seed.toString().padStart(4, '0'),
            ...optArray.map(n => n.toString().padStart(1, '0'))
        ].join('');

        // Calculate 2-digit checksum for version integrity
        let versionChecksum = 0;
        const versionStr = appVersion.toString().replace(/\./g, '') + qcmVersion.toString().replace(/\./g, '');
        for (let i = 0; i < versionStr.length; i++) {
            versionChecksum = (versionChecksum + (parseInt(versionStr[i], 10) * (i + 1))) % 100;
        }

        // Calculate 2-digit checksum for data integrity (baseStr + versionChecksum)
        // This ensures the data checksum covers the entire 9-digit payload
        let dataChecksum = 0;
        const payloadStr = baseStr + versionChecksum.toString().padStart(2, '0');
        for (let i = 0; i < payloadStr.length; i++) {
            dataChecksum = (dataChecksum + (parseInt(payloadStr[i], 10) * (i + 1))) % 100;
        }

        // Structure: [base_str:7][version_cs:2][data_cs:2]
        return baseStr +
            versionChecksum.toString().padStart(2, '0') +
            dataChecksum.toString().padStart(2, '0');
    },
    extractSeedAndOptionsFromQCMID: function (qcmid) {
        const seed = parseInt(qcmid.substring(0, 4), 10);
        // The optArray starts at index 4 and ends before the 4-character checksum suffix
        // Base length is 7 (4 seed + 3 options)
        const optionsStr = qcmid.substring(4, 7);
        const optArray = optionsStr.split('').map(char => parseInt(char, 10));

        return { seed, optArray };
    },
    isValidQCMID: function (qcmid) {
        // Validates that the last 2 digits are a valid checksum of the first 9 digits
        if (qcmid.length !== 11) {
            return false;
        }

        const payloadStr = qcmid.substring(0, 9);
        const providedDataChecksum = parseInt(qcmid.substring(9, 11), 10);

        let calculatedDataChecksum = 0;
        for (let i = 0; i < payloadStr.length; i++) {
            calculatedDataChecksum = (calculatedDataChecksum + (parseInt(payloadStr[i], 10) * (i + 1))) % 100;
        }

        return calculatedDataChecksum === providedDataChecksum;
    },
    isQCMIDVersionMatch: function (qcmid, appVersion, qcmVersion) {
        if (qcmid.length !== 11) {
            return false;
        }

        // Extract the version checksum from the middle 2 digits (index 7 and 8)
        const providedVersionChecksum = parseInt(qcmid.substring(7, 9), 10);

        let calculatedVersionChecksum = 0;
        const versionStr = appVersion.toString().replace(/\./g, '') + qcmVersion.toString().replace(/\./g, '');
        for (let i = 0; i < versionStr.length; i++) {
            calculatedVersionChecksum = (calculatedVersionChecksum + (parseInt(versionStr[i], 10) * (i + 1))) % 100;
        }

        return calculatedVersionChecksum === providedVersionChecksum;
    },
    // Extracted from QCMCtrl
    getPoints: function (question) {
        let total = 0;
        for (let i = 0; i < question.answers.length; i++) {
            if (question.answers[i].checked) {
                total += question.answers[i].pts;
            }
        }
        return Math.max(0, total);
    },
    getScore: function (filteredQCM) {
        let score = { user: 0, nb: 0, percentage: 0 };
        for (let i = 0; i < filteredQCM.length; i++) {
            const question = filteredQCM[i];
            score.user += QCM.getPoints(question);
        }
        score.total = filteredQCM.length * 6;
        if (score.total > 0) {
            score.percentage = Math.round(score.user / score.total * 100);
        }
        return score;
    }
};
