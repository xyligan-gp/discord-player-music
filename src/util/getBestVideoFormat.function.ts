// Import all requirements
import { videoFormat } from "ytdl-core";

/**
 * Get the best video format from an array of video formats.
 * 
 * @callback getBestVideoFormat
 *
 * @param {videoFormat[]} formats - An array of video format objects to choose from.
 * 
 * @returns {videoFormat} The best video format.
 */
export default function getBestVideoFormat(formats: videoFormat[]): videoFormat {
    let results: videoFormat[] = [];

    for(const format of formats) {
        if(
            format.codecs === "opus"
            &&
            format.container === "webm"
            &&
            format.audioSampleRate === "48000"
            &&
            format.audioQuality === "AUDIO_QUALITY_MEDIUM"
        ) results.push(format);
    }

    return results.sort((a, b) => (b.audioBitrate - a.audioBitrate) || (a.bitrate - b.bitrate))[0];
}