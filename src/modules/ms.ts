let s = 1000, m = s * 60, h = m * 60, d = h * 24, w = d * 7, y = d * 365.25;

/**
 * Parse or format the given `value`
 * 
 * @param {string | number} value Value for parsing or formatting
 * @param {{ long: boolean }} [options] Formatting options
 * 
 * @returns {number | string} Formatted value
 */
export default function(value: string | number, options?: { long?: boolean }): number | string {
    options = options || {};

    switch(typeof value) {
        case 'string': {
            if(value.length > 0) return parse(value);

            break;
        }

        case 'number': {
            if(isFinite(value)) return options.long ? formatLong(value) : formatShort(value);
        }
    }

    throw new Error(`'value' is not a non-empty string or a valid number! 'value' = '${JSON.stringify(value)}'`);
}

/**
 * @private
 */
function parse(value: string): number {
    if(value.length > 100) return;

    let match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(value);
    if(!match) return;

    let n = parseFloat(match[1]);
    let type = (match[2] || 'ms').toLowerCase();

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
    let msAbs = Math.abs(value);

    if(msAbs >= d) return Math.round(value / d) + 'd';
    if(msAbs >= h) return Math.round(value / h) + 'h';
    if(msAbs >= m) return Math.round(value / m) + 'm';
    if(msAbs >= s) return Math.round(value / s) + 's';
   
    return value + 'ms';
}

/**
 * @private
 */
function formatLong(value: number): number | string {
    let msAbs = Math.abs(value);

    if(msAbs >= d) return format(value, msAbs, d, 'day');
    if(msAbs >= h) return format(value, msAbs, h, 'hour');
    if(msAbs >= m) return format(value, msAbs, m, 'minute');
    if(msAbs >= s) return format(value, msAbs, s, 'second');
   
    return value + ' ms';
}

/**
 * @private
 */
function format(value: number, abs: number, n: number, name: string): number | string {
    let isFormat = abs >= n * 1.5;

    return Math.round(value / n) + ' ' + name + (isFormat ? 's' : '');
}