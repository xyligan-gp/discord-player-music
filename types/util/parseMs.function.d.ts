interface ITimeObject {
    days: number,
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number
}

/**
 * Parses the millisecond number and returns the time object with days, hours, minutes, seconds and milliseconds.
 * 
 * @param value Milliseconds number to convert.
 * 
 * @returns Time object.
 */
export default function parseMs(value: number): ITimeObject;