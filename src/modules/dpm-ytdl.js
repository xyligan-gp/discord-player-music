const ytdl = require('ytdl-core');
const { FFmpeg } = require('prism-media');

/**
 * Generating a link to play a song using FFmpeg
 * @param {Array<ytdl.videoFormat>} format YTDL Video Formats
 * @returns {Array<ytdl.videoFormat>} Returns all possible link formats
*/
function filter(format) {
    var results = [];

    format.forEach((data) => {
        if(data.codecs === 'opus' && data.container === 'webm' && data.audioSampleRate === '48000' && data.audioQuality === 'AUDIO_QUALITY_MEDIUM'){
            results.push(data);
        }
    })

    return results;
}

/**
 * Creating a stream for playing songs based on FFmpeg
 * @param {String} url Song URL
 * @param {String} filters Filters Array
 * @returns {Promise<FFmpeg>} FFmpeg Stream
*/
async function createStream(url, filters) {
    const inputURL = await ytdl.getInfo(url);
    const songURL = filter(inputURL.formats)[0].url;
    
    const FFMPEG_OPUS_ARGUMENTS = [
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
        '2',
    ];

    let FFmpegArgs = ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-i', songURL, ...FFMPEG_OPUS_ARGUMENTS];
    filters && filters != null ? FFmpegArgs = FFmpegArgs.concat(['-af', filters]) : FFmpegArgs = FFmpegArgs;
    
    const output = new FFmpeg({ args : FFmpegArgs });

    return output;
}

module.exports = Object.assign(createStream, ytdl);