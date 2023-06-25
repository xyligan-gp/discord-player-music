/**
 * Normalize an array or a rest parameter array to a standard array.
 * If the input is already an array, it returns the input array as is.
 * If the input is a rest parameter array, it returns the first element of the array.
 * 
 * @callback normalizeArray
 * 
 * @template T - The type of the array elements.
 * 
 * @param {RestOrArray<T>} arr - The input array or rest parameter array.
 * 
 * @returns {T[]} The normalized array.
 */
export function normalizeArray<T>(arr: RestOrArray<T>): T[] {
	if (Array.isArray(arr[0])) return arr[0];
	return arr as T[];
}

/**
 * Represents data that may be an array or came from a rest parameter.
 *
 * @remarks
 * This type is used throughout builders to ensure both an array and variadic arguments
 * may be used.
 */
export type RestOrArray<T> = T[] | [T[]];

/**
 * Represents data that may be an array or came from a rest parameter.
 * 
 * @typedef {T[]} RestOrArray
 */