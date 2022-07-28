import ytdl from 'ytdl-core';
import { FFmpeg } from 'prism-media';

import { StreamOptions } from '../../types/PlayerData';

/**
 * Generating a link to play a song using FFmpeg
 * 
 * @param {ytdl.videoFormat[]} data YTDL Video Formats
 * 
 * @returns {ytdl.videoFormat[]} All possible link formats
 * @private
 */
function formatURL(data: ytdl.videoFormat[]): ytdl.videoFormat[] {
    let results: ytdl.videoFormat[] = [];

    for(const videoFormat of data) {
        if(videoFormat.codecs === 'opus' && videoFormat.container === 'webm' && videoFormat.audioSampleRate === '48000' && videoFormat.audioQuality === 'AUDIO_QUALITY_MEDIUM') {
            results.push(videoFormat);
        }
    }

    return results;
}

/**
 * Creating a stream for playing songs based on FFmpeg
 * 
 * @param {string} inputURL Track URL
 * @param {StreamOptions} options Filter Value
 * 
 * @returns {Promise<FFmpeg>} FFmpeg Stream
 */
async function createStream(inputURL: string, options?: StreamOptions): Promise<FFmpeg> {
    const trackInfo = await ytdl.getInfo(inputURL);
    const outputURL = formatURL(trackInfo.formats)[0].url;

    const FFMPEG_OPUS_DEFAULT: string[] = [
        '-analyzeduration',
        '0',
        '-loglevel',
        '0',
        '-acodec',
        'libopus',
        '-f',
        'opus',
        '-ar',
        '48000',
        '-ac',
        '2'
    ];

    let FFmpegArgs: string[] = ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-i', outputURL, ...FFMPEG_OPUS_DEFAULT];
    if(options.seek && options.seek != null) FFmpegArgs = FFmpegArgs.concat(['-ss', options.seek.toString()]);
    if(options.filter && options.filter != null) FFmpegArgs = FFmpegArgs.concat(['-af', options.filter]);

    const output = new FFmpeg({ args : FFmpegArgs });

    return output;
}

export default Object.assign(createStream, ytdl);