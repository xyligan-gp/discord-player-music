/**
 * Format a number as a string with a leading zero if it's between 0 and 9 (inclusive).
 * 
 * @callback formatNumber
 *
 * @param {number} value - The number to format.
 * 
 * @returns {string} The formatted number as a string.
 */
export default function formatNumber(value: number): string {
    return value >= 0 && value <= 9 ? `0${value}` : value.toString();
}