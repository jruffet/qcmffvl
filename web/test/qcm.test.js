import { describe, it, expect } from 'vitest';
import { QCM } from '../js/core/qcm.js';

const mockCatDistrib = [
    "Matériel",
    "Mécavol",
    "Mécavol",
    "Pilotage",
    "Pilotage",
    "Réglementation",
    "Météo",
    "Météo",
    "Facteurs humains",
    "Milieu naturel"
];

/**
 * Helper to create a large mock QCM for testing distribution.
 * @param {string[]} categories - The categories to include.
 * @param {number} countPerCategory - How many questions of each category to create.
 * @param {string[]} activities - Array of activities.
 * @param {string[]} levels - Array of levels.
 */
const createLargeMockQCM = (categories, countPerCategory, activities, levels) => {
    const qcm = [];
    let id = 0;
    for (const activity of activities) {
        for (const level of levels) {
            for (const cat of categories) {
                for (let i = 0; i < countPerCategory; i++) {
                    qcm.push({
                        code: `q_${activity}_${level}_${cat}_${i}_${id++}`,
                        question: `Question ${id}?`,
                        activities: [activity],
                        levels: [level],
                        categories: [cat],
                        answers: [
                            { text: 'A', pts: 6, checked: false },
                            { text: 'B', pts: 0, checked: false },
                            { text: 'C', pts: -3, checked: false }
                        ]
                    });
                }
            }
        }
    }
    return qcm;
};

describe('QCM', () => {
    const mockQcm = [
        {
            code: 'q1',
            question: 'Question 1?',
            activities: ['Parapente'],
            levels: ['Brevet de Pilote'],
            categories: ['Météo'],
            answers: [
                { text: 'A', pts: 6, checked: false },
                { text: 'B', pts: 0, checked: false },
                { text: 'C', pts: -3, checked: false }
            ]
        },
        {
            code: 'q2',
            question: 'Question 2?',
            activities: ['Parapente'],
            levels: ['Brevet de Pilote'],
            categories: ['Mécavol'],
            answers: [
                { text: 'A', pts: 3, checked: false },
                { text: 'B', pts: 3, checked: false },
                { text: 'C', pts: -6, checked: false },
                { text: 'D', pts: -6, checked: false }
            ]
        }
    ];

    const mockOptions = {
        activity: 'Parapente',
        level: 'Brevet de Pilote',
        category: 'Toutes',
        seed: 1234
    };

    describe('generateQCM', () => {
        it('should return undefined if qcm is undefined', () => {
            expect(QCM.generateQCM(undefined, mockOptions, mockCatDistrib)).toBeUndefined();
        });

        it('should return a qcm and seed', () => {
            const result = QCM.generateQCM(mockQcm, mockOptions, mockCatDistrib);
            expect(result).toHaveProperty('qcm');
            expect(result).toHaveProperty('seed', mockOptions.seed);
            expect(result.qcm.length).toBe(2);
        });

        it('should be idempotent (same seed produces same result)', () => {
            const result1 = QCM.generateQCM(mockQcm, mockOptions, mockCatDistrib);
            const result2 = QCM.generateQCM(mockQcm, mockOptions, mockCatDistrib);
            expect(JSON.stringify(result1.qcm)).toBe(JSON.stringify(result2.qcm));
        });

        it('should filter by activity, level and category', () => {
            const filteredOptions = { ...mockOptions, category: 'Météo' };
            const result = QCM.generateQCM(mockQcm, filteredOptions, mockCatDistrib);
            expect(result.qcm.length).toBe(1);
            expect(result.qcm[0].categories).toContain('Météo');
        });
    });

    describe('tickAnswers', () => {
        it('should tick correct answers based on userAnswers', () => {
            const qcm = structuredClone(mockQcm);
            const userAnswers = { 'q1': [0] };
            QCM.tickAnswers(qcm, userAnswers);
            expect(qcm[0].answers[0].checked).toBe(true);
            expect(qcm[0].answers[1].checked).toBe(false);
        });

        it('should tick all positive point answers if no userAnswers provided', () => {
            const qcm = structuredClone(mockQcm);
            QCM.tickAnswers(qcm);
            expect(qcm[0].answers[0].checked).toBe(true);
            expect(qcm[0].answers[1].checked).toBe(true);
            expect(qcm[0].answers[2].checked).toBe(false);
        });
    });

    describe('untickAnswers', () => {
        it('should set checked to false for all answers', () => {
            const qcm = [{ answers: [{ checked: true }, { checked: false }] }];
            QCM.untickAnswers(qcm);
            expect(qcm[0].answers[0].checked).toBe(false);
            expect(qcm[0].answers[1].checked).toBe(false);
        });
    });

    describe('scoring', () => {
        it('getPoints should return correct points', () => {
            const question = { answers: [{ checked: true, pts: 6 }, { checked: true, pts: 3 }] };
            expect(QCM.getPoints(question)).toBe(9);
        });

        it('getScore should return correct score object', () => {
            const qcm = [
                { answers: [{ checked: true, pts: 6 }, { checked: false, pts: 0 }] },
                { answers: [{ checked: true, pts: 3 }, { checked: false, pts: 3 }] }
            ];
            const score = QCM.getScore(qcm);
            expect(score.user).toBe(9);
            expect(score.total).toBe(12);
            expect(score.percentage).toBe(75);
        });
    });

    describe('QCMID and integrity', () => {
        const seed = 1234;
        const optArray = [1, 2, 3];
        const appVer = '1.0.0';
        const qcmVer = '1.0.0';

        it('should generate a valid QCMID', () => {
            const id = QCM.QCMID(seed, optArray, appVer, qcmVer);
            expect(id.length).toBe(11);
            expect(QCM.isValidQCMID(id)).toBe(true);
        });

        it('should extract seed and options correctly', () => {
            const id = QCM.QCMID(seed, optArray, appVer, qcmVer);
            const extracted = QCM.extractSeedAndOptionsFromQCMID(id);
            expect(extracted.seed).toBe(seed);
            expect(extracted.optArray).toEqual(optArray);
        });

        it('should fail isValidQCMID for invalid checksum', () => {
            const id = QCM.QCMID(seed, optArray, appVer, qcmVer);
            const invalidId = id.substring(0, 10) + (id.endsWith('0') ? '1' : '0');
            expect(QCM.isValidQCMID(invalidId)).toBe(false);
        });

        it('should fail isQCMIDVersionMatch if versions do not match', () => {
            const id = QCM.QCMID(seed, optArray, appVer, qcmVer);
            expect(QCM.isQCMIDVersionMatch(id, '2.0.0', qcmVer)).toBe(false);
        });
    });

    describe('QCM Distribution (60 questions)', () => {
        const activities = ['Parapente', 'Delta'];
        const levels = ['Brevet', 'Expert'];
        const perfectQcm = createLargeMockQCM(mockCatDistrib, 10, activities, levels);

        it('should respect catDistrib in every 10-question chunk for all combinations and seeds', () => {
            const seed = 1377;
            for (const activity of activities) {
                for (const level of levels) {
                    const options = { activity, level, category: 'Toutes', seed };
                    const result = QCM.generateQCM(perfectQcm, options, mockCatDistrib);
                    const qcm60 = result.qcm.slice(0, 60);

                    expect(qcm60.length).toBe(60);

                    for (let i = 0; i < 6; i++) {
                        const chunk = qcm60.slice(i * 10, (i + 1) * 10);
                        const actualCounts = new Map();

                        chunk.forEach(q => {
                            const cat = q.categories[0];
                            actualCounts.set(cat, (actualCounts.get(cat) || 0) + 1);
                        });

                        const expectedCounts = new Map();
                        mockCatDistrib.forEach(cat => {
                            expectedCounts.set(cat, (expectedCounts.get(cat) || 0) + 1);
                        });

                        for (const [cat, count] of expectedCounts.entries()) {
                            expect(actualCounts.get(cat), `Chunk ${i} for ${activity}/${level}/seed ${seed} failed for category ${cat}`).toBe(count);
                        }
                    }
                }
            }
        });

        it('should fallback to other categories when a specific category is missing', () => {
            const deficientCategories = mockCatDistrib.filter(c => c !== 'Matériel');
            const deficientQcm = createLargeMockQCM(deficientCategories, 10, activities, levels);

            const options = { activity: activities[0], level: levels[0], category: 'Toutes', seed: 1337 };
            const result = QCM.generateQCM(deficientQcm, options, mockCatDistrib);
            const qcm60 = result.qcm.slice(0, 60);

            expect(qcm60.length).toBe(60);

            for (const q of qcm60) {
                expect(q.categories).not.toContain('Matériel');
            }

            for (let i = 0; i < 6; i++) {
                const chunk = qcm60.slice(i * 10, (i + 1) * 10);
                const actualCounts = new Map();
                chunk.forEach(q => {
                    const cat = q.categories[0];
                    actualCounts.set(cat, (actualCounts.get(cat) || 0) + 1);
                });

                let totalInChunk = 0;
                actualCounts.forEach(count => totalInChunk += count);
                expect(totalInChunk).toBe(10);

                expect(actualCounts.get('Mécavol')).toBeGreaterThanOrEqual(2);
            }
        });
    });
});
