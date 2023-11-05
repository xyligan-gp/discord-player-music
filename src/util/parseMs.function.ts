/**
 * Parses the millisecond number and returns the time object with days, hours, minutes, seconds and milliseconds.
 * 
 * @callback parseMs
 * 
 * @param {number} value Milliseconds number to convert.
 * 
 * @returns {ITimeObject} Time object.
 */
export default function parseMs(value: number): ITimeObject {
    return {
        days: Math.floor(value / 86400000),
        hours: Math.floor(value / 3600000 % 24),
        minutes: Math.floor(value / 60000 % 60),
        seconds: Math.floor(value / 1000 % 60),
        milliseconds: Math.floor(value % 1000)
    }
}

interface ITimeObject {
    days: number,
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number
}

/**
 * @typedef {object} ITimeObject
 * 
 * @prop {number} days Amount of days until the cooldown ends.
 * @prop {number} hours Amount of hours until the cooldown ends.
 * @prop {number} minutes Amount of minutes until the cooldown ends.
 * @prop {number} seconds Amount of seconds until the cooldown ends.
 * @prop {number} milliseconds Amount of milliseconds until the cooldown ends.
 */