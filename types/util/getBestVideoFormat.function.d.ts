// Import all requirements
import { videoFormat } from "ytdl-core";

/**
 * Get the best video format from an array of video formats.
 *
 * @param formats - An array of video format objects to choose from.
 * 
 * @returns The best video format.
 */
export default function getBestVideoFormat(formats: videoFormat[]): videoFormat;