////////////////////////////////////////////////////////////////
///////////// THIS MODULE IS discord-player-music //////////////
//////////////// Creators: xyligan & ShadowPlay ////////////////
//////////////////////// Version: 1.1.1 ////////////////////////
////////////////////////////////////////////////////////////////


const ytdlCore = require('ytdl-core'), prism = require('prism-media'), evn = ['info', 'progress', 'abort', 'request', 'response', 'error', 'redirect', 'retry', 'reconnect'];

/**
 * Create an opus stream for your video with provided encoder args
 * @param {string} url YouTube Video URL or Info
 * @param {Object} options YTDL options
 * @param {String} options.type Stream Type
 * @param {Boolean} options.opusEncoded Stream OpusEncoding
 * @param {String} options.filter YTDL filter
 * @param {String} options.fmt Stream Format
 * @param {Array} options.encoderArgs Stream Filters
 * @param {Number} options.dlChunkSize Size of each chunk in bytes
*/
const StreamDownloader = (url, options) => {
    try {
        if (!url) {
            throw new Error('No input url or videoInfo provided');
        }

        let FFmpegArgs = [
            '-analyzeduration', '0',
            '-loglevel', '0',
            '-f', `${options && options.fmt && typeof (options.fmt) == 'string' ? options.fmt : 's16le'}`,
            '-ar', '48000',
            '-ac', '2'
        ];

        if (options && options.encoderArgs && Array.isArray(options.encoderArgs)) {
            FFmpegArgs = FFmpegArgs.concat(options.encoderArgs);
        }

        const transcoder = new prism.FFmpeg({
            shell: false,
            args: FFmpegArgs
        });

        const inputStream = typeof url === 'string' ? ytdlCore(url, options) : ytdlCore.downloadFromInfo(url, options);
        const output = inputStream.pipe(transcoder);

        if (options && !options.opusEncoded) {
            for (const event of evn) {
                inputStream.on(event, (...args) => output.emit(event, ...args));
            }
            inputStream.on('error', error => transcoder.destroy(error));
            output.on('close', () => transcoder.destroy());
            return output;
        }

        const opus = new prism.opus.Encoder({
            rate: 48000,
            channels: 2,
            frameSize: 960
        });

        const outputStream = output.pipe(opus);

        for (const event of evn) {
            inputStream.on(event, (...args) => outputStream.emit(event, ...args));
        }

        const _destroy = error => {
            if (!transcoder.destroyed)
                transcoder.destroy();
            if (!opus.destroyed)
                opus.destroy();
        };

        outputStream.on('close', _destroy).on('error', _destroy);
        return outputStream;
    } catch (error) {
        return console.log(error);
    }
};
/**
 * Create Arbitrary Stream
 * @param {String} stream Any readable stream source
 * @param {Object} options Stream options
 * @param {String} options.type Stream Type
 * @param {Boolean} options.opusEncoded Stream OpusEncoding
 * @param {String} options.filter YTDL filter
 * @param {String} options.fmt Stream Format
 * @param {Array} options.encoderArgs Stream Filters
*/
const arbitraryStream = (stream, options) => {
    let FFmpegArgs;

    try {
        if (!stream) {
            throw new Error('No stream source provided');
        }
        if (typeof stream === 'string') {
            FFmpegArgs = [
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-i', stream,
                '-analyzeduration', '0',
                '-loglevel', '0',
                '-f', `${options && options.fmt && typeof (options.fmt) == 'string' ? options.fmt : 's16le'}`,
                '-ar', '48000',
                '-ac', '2'
            ];
        } else {
            FFmpegArgs = [
                '-analyzeduration', '0',
                '-loglevel', '0',
                '-f', `${options && options.fmt && typeof (options.fmt) == 'string' ? options.fmt : 's16le'}`,
                '-ar', '48000',
                '-ac', '2'
            ];
        }

        if (options && options.encoderArgs && Array.isArray(options.encoderArgs)) {
            FFmpegArgs = FFmpegArgs.concat(options.encoderArgs);
        }

        let transcoder = new prism.FFmpeg({
            shell: false,
            args: FFmpegArgs
        });

        if (typeof stream !== 'string') {
            transcoder = stream.pipe(transcoder);
            stream.on('error', () => transcoder.destroy());
        }

        if (options && !options.opusEncoded) {
            transcoder.on('close', () => transcoder.destroy());
            return transcoder;
        }

        const opus = new prism.opus.Encoder({
            rate: 48000,
            channels: 2,
            frameSize: 960
        });

        const outputStream = transcoder.pipe(opus);

        const _destroy = () => {
            if (!transcoder.destroyed)
                transcoder.destroy();
            if (!opus.destroyed)
                opus.destroy();
        };

        outputStream.on('close', _destroy).on('error', _destroy);
        return outputStream;
    } catch (error) {
        return console.log(error);
    }
};
StreamDownloader.arbitraryStream = arbitraryStream;

module.exports = Object.assign(StreamDownloader, ytdlCore);