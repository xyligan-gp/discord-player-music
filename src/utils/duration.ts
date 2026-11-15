// Internal helpers of the module (they are not exported from the package): reading durations like `10m` and writing milliseconds as text.
// The parsing code comes from the `ms` module and works the same way.
const s = 1000, m = s * 60, h = m * 60, d = h * 24, w = d * 7, y = d * 365.25;

/**
 * Parses a duration written as text to milliseconds. A number without a unit is milliseconds.
 *
 * @param {string} value Duration: a number with an optional unit, for example `500`, `10s`, `1.5 hours`, `2d`, `1 week`
 *
 * @example
 * parseDuration('10m'); // 600000
 *
 * @throws {Error} If the value is not a non-empty string with a valid duration
 *
 * @returns {number} Milliseconds
 * @private
 */
export function parseDuration(value: string): number {
    if(typeof value === 'string' && value.length > 0) {
        const parsed = parse(value);

        if(parsed !== undefined) return parsed;
    }

    throw new Error(`'value' is not a non-empty string with a valid duration! 'value' = '${JSON.stringify(value)}'`);
}

/**
 * Formats milliseconds as a short or a long text.
 *
 * @param {number} value Milliseconds
 * @param {object} [options] Formatting options
 * @param {boolean} [options.long=false] `true` gives `2 minutes` instead of `2m`
 *
 * @example
 * formatDuration(120000); // '2m'
 * formatDuration(120000, { long: true }); // '2 minutes'
 *
 * @throws {Error} If the value is not a finite number
 *
 * @returns {string} Text
 * @private
 */
export function formatDuration(value: number, options: { long?: boolean } = {}): string {
    if(typeof value !== 'number' || !isFinite(value)) throw new Error(`'value' is not a valid number! 'value' = '${JSON.stringify(value)}'`);

    return options.long ? formatLong(value) : formatShort(value);
}

/**
 * @private
 */
function parse(value: string): number | undefined {
    if(value.length > 100) return undefined;

    const match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(value);
    if(!match) return undefined;

    const n = parseFloat(match[1]);
    const type = (match[2] || 'ms').toLowerCase();

    switch(type) {
        case 'years':
        case 'year':
        case 'yrs':
        case 'yr':
        case 'y':
            return n * y;

        case 'weeks':
        case 'week':
        case 'w':
            return n * w;

        case 'days':
        case 'day':
        case 'd':
            return n * d;

        case 'hours':
        case 'hour':
        case 'hrs':
        case 'hr':
        case 'h':
            return n * h;

        case 'minutes':
        case 'minute':
        case 'mins':
        case 'min':
        case 'm':
            return n * m;

        case 'seconds':
        case 'second':
        case 'secs':
        case 'sec':
        case 's':
            return n * s;

        case 'milliseconds':
        case 'millisecond':
        case 'msecs':
        case 'msec':
        case 'ms':
            return n;

        default: return undefined;
    }
}

/**
 * @private
 */
function formatShort(value: number): string {
    const msAbs = Math.abs(value);

    if(msAbs >= d) return Math.round(value / d) + 'd';
    if(msAbs >= h) return Math.round(value / h) + 'h';
    if(msAbs >= m) return Math.round(value / m) + 'm';
    if(msAbs >= s) return Math.round(value / s) + 's';

    return value + 'ms';
}

/**
 * @private
 */
function formatLong(value: number): string {
    const msAbs = Math.abs(value);

    if(msAbs >= d) return plural(value, msAbs, d, 'day');
    if(msAbs >= h) return plural(value, msAbs, h, 'hour');
    if(msAbs >= m) return plural(value, msAbs, m, 'minute');
    if(msAbs >= s) return plural(value, msAbs, s, 'second');

    return value + ' ms';
}

/**
 * @private
 */
function plural(value: number, abs: number, n: number, name: string): string {
    const isPlural = abs >= n * 1.5;

    return Math.round(value / n) + ' ' + name + (isPlural ? 's' : '');
}
