import { describe, expect, it } from 'vitest';

import { formatDuration, parseDuration } from '../src/utils/duration';

describe('parseDuration', () => {
    it('parses numbers with units', () => {
        expect(parseDuration('500')).toBe(500);
        expect(parseDuration('500ms')).toBe(500);
        expect(parseDuration('10s')).toBe(10_000);
        expect(parseDuration('5 secs')).toBe(5_000);
        expect(parseDuration('1m')).toBe(60_000);
        expect(parseDuration('1.5 hours')).toBe(5_400_000);
        expect(parseDuration('2d')).toBe(172_800_000);
        expect(parseDuration('1 week')).toBe(604_800_000);
        expect(parseDuration('1y')).toBe(31_557_600_000);
        expect(parseDuration('-1s')).toBe(-1000);
        expect(parseDuration('.5s')).toBe(500);
        expect(parseDuration('30 MINUTES')).toBe(1_800_000);
        expect(parseDuration('1      s')).toBe(1000);
    })

    it('throws for anything else', () => {
        for(const value of ['', 'abc', '10 parsecs', '1m 30s', ' 10s', '10s ', 'x'.repeat(101), 10 as never, undefined as never, null as never]) expect(() => parseDuration(value), String(value)).toThrow(/valid duration/);
    })
})

describe('formatDuration', () => {
    it('formats short', () => {
        expect(formatDuration(0)).toBe('0ms');
        expect(formatDuration(999)).toBe('999ms');
        expect(formatDuration(1000)).toBe('1s');
        expect(formatDuration(120_000)).toBe('2m');
        expect(formatDuration(3_600_000)).toBe('1h');
        expect(formatDuration(172_800_000)).toBe('2d');
        expect(formatDuration(-60_000)).toBe('-1m');
    })

    it('formats long with the plural only from one and a half units', () => {
        expect(formatDuration(500, { long: true })).toBe('500 ms');
        expect(formatDuration(1000, { long: true })).toBe('1 second');
        expect(formatDuration(1500, { long: true })).toBe('2 seconds');
        expect(formatDuration(120_000, { long: true })).toBe('2 minutes');
        expect(formatDuration(3_600_000, { long: true })).toBe('1 hour');
        expect(formatDuration(172_800_000, { long: true })).toBe('2 days');
    })

    it('throws for values that are not finite numbers', () => {
        for(const value of [NaN, Infinity, '10' as never, undefined as never]) expect(() => formatDuration(value)).toThrow(/valid number/);
    })

    it('parses what it formats', () => {
        for(const value of [0, 1000, 60_000, 3_600_000, 86_400_000]) expect(parseDuration(formatDuration(value))).toBe(value);
    })
})
