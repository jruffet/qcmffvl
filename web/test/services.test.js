import { describe, it, expect } from 'vitest';
import { API_LOGIC } from '../../web/js/services.js';

describe('API_LOGIC', () => {
    const mockQcm = [
        {
            code: 'q1',
            question: 'Question 1?',
            activities: ['Parapente'],
            levels: ['Brevet de Pilote'],
            categories: ['Météo'],
            answers: [
                { text: 'A', pts: 6 },
                { text: 'B', pts: 0 },
                { text: 'C', pts: -3 }
            ]
        },
        {
            code: 'q2',
            question: 'Question 2?',
            activities: ['Parapente'],
            levels: ['Brevet de Pilote'],
            categories: ['Mécavol'],
            answers: [
                { text: 'A', pts: 3 },
                { text: 'B', pts: 3 },
                { text: 'C', pts: -6 },
                { text: 'D', pts: -6 }
            ]
        }
    ];

    const mockOptions = {
        activity: 'Parapente',
        level: 'Brevet de Pilote',
        category: 'Toutes',
        seed: 1234
    };

    const mockCatDistrib = ['Météo', 'Mécavol'];

    describe('createPRNG', () => {
        it('should produce deterministic values for the same seed', () => {
            const prng1 = API_LOGIC.createPRNG(123);
            const prng2 = API_LOGIC.createPRNG(123);
            expect(prng1.next()).toBe(prng2.next());
        });

        it('should produce different values for different seeds', () => {
            const prng1 = API_LOGIC.createPRNG(123);
            const prng2 = API_LOGIC.createPRNG(456);
            expect(prng1.next()).not.toBe(prng2.next());
        });
    });

    describe('generateQCM', () => {
        it('should return undefined if qcm is undefined', () => {
            expect(API_LOGIC.generateQCM(undefined, mockOptions, mockCatDistrib)).toBeUndefined();
        });

        it('should return a qcm and seed', () => {
            const result = API_LOGIC.generateQCM(mockQcm, mockOptions, mockCatDistrib);
            expect(result).toHaveProperty('qcm');
            expect(result).toHaveProperty('seed', mockOptions.seed);
            expect(result.qcm.length).toBe(2);
        });

        it('should be idempotent (same seed produces same result)', () => {
            const result1 = API_LOGIC.generateQCM(mockQcm, mockOptions, mockCatDistrib);
            const result2 = API_LOGIC.generateQCM(mockQcm, mockOptions, mockCatDistrib);

            expect(JSON.stringify(result1.qcm)).toBe(JSON.stringify(result2.qcm));
        });

        it('should filter by activity, level and category', () => {
            const filteredOptions = { ...mockOptions, category: 'Météo' };
            const result = API_LOGIC.generateQCM(mockQcm, filteredOptions, mockCatDistrib);
            expect(result.qcm.length).toBe(1);
            expect(result.qcm[0].categories).toContain('Météo');
        });
    });

    describe('tickAnswers', () => {
        it('should tick correct answers based on userAnswers', () => {
            const qcm = structuredClone(mockQcm);
            const userAnswers = { 'q1': [0] }; // index 0 for q1
            API_LOGIC.tickAnswers(qcm, userAnswers);
            expect(qcm[0].answers[0].checked).toBe(true);
            expect(qcm[0].answers[1].checked).toBeUndefined();
            expect(qcm[1].answers[0].checked).toBeUndefined();
        });

        it('should tick all positive point answers if no userAnswers provided', () => {
            const qcm = structuredClone(mockQcm);
            API_LOGIC.tickAnswers(qcm);
            expect(qcm[0].answers[0].checked).toBe(true);
            expect(qcm[0].answers[1].checked).toBe(true);
            expect(qcm[0].answers[2].checked).toBe(undefined);
            expect(qcm[1].answers[0].checked).toBe(true);
        });
    });

    describe('untickAnswers', () => {
        it('should remove checked property from all answers', () => {
            const qcm = [{ answers: [{ checked: true }, { checked: false }] }];
            API_LOGIC.untickAnswers(qcm);
            expect(qcm[0].answers[0].checked).toBeUndefined();
            expect(qcm[0].answers[1].checked).toBeUndefined();
        });
    });

    describe('QCMID and integrity', () => {
        const seed = 1234;
        const optArray = [1, 2, 3];
        const appVer = '1.0.0';
        const qcmVer = '1.0.0';

        it('should generate a valid QCMID', () => {
            const id = API_LOGIC.QCMID(seed, optArray, appVer, qcmVer);
            expect(id.length).toBe(11);
            expect(API_LOGIC.isValidQCMID(id)).toBe(true);
        });

        it('should extract seed and options correctly', () => {
            const id = API_LOGIC.QCMID(seed, optArray, appVer, qcmVer);
            const extracted = API_LOGIC.extractSeedAndOptionsFromQCMID(id);
            expect(extracted.seed).toBe(seed);
            expect(extracted.optArray).toEqual(optArray);
        });

        it('should fail isValidQCMID for invalid checksum', () => {
            const id = API_LOGIC.QCMID(seed, optArray, appVer, qcmVer);
            const invalidId = id.substring(0, 10) + (id.endsWith('0') ? '1' : '0');
            expect(API_LOGIC.isValidQCMID(invalidId)).toBe(false);
        });

        it('should fail isQCMIDVersionMatch if versions do not match', () => {
            const id = API_LOGIC.QCMID(seed, optArray, appVer, qcmVer);
            expect(API_LOGIC.isQCMIDVersionMatch(id, '2.0.0', qcmVer)).toBe(false);
        });
    });

    describe('newSeed', () => {
        it('should return a number', () => {
            const seed = API_LOGIC.newSeed();
            expect(typeof seed).toBe('number');
            expect(seed).toBeGreaterThanOrEqual(0);
            expect(seed).toBeLessThan(10000);
        });
    });
});
