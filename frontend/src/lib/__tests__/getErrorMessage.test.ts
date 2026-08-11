import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '../getErrorMessage';

describe('getErrorMessage', () => {
    it('returns the message from an Error instance', () => {
        expect(getErrorMessage(new Error('בעיה בשרת'), 'ברירת מחדל')).toBe('בעיה בשרת');
    });

    it('falls back for a non-Error value (e.g. a thrown string or plain object)', () => {
        expect(getErrorMessage('not an error object', 'ברירת מחדל')).toBe('ברירת מחדל');
        expect(getErrorMessage({ detail: 'server said so' }, 'ברירת מחדל')).toBe('ברירת מחדל');
        expect(getErrorMessage(undefined, 'ברירת מחדל')).toBe('ברירת מחדל');
    });
});
