import { Readable, pipeline } from 'node:stream';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import prism from 'prism-media';
import ffmpegStatic from 'ffmpeg-static';
import { AudioResource, StreamType, createAudioResource } from '@discordjs/voice';

import { SourceStreamOptions } from './SourceProvider';

// Path to FFmpeg: the `ffmpeg-static` binary, or `ffmpeg` from PATH when the binary was not downloaded
const ffmpegPath: string = ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg';

/**
 * Converts any audio stream into a 48 kHz stereo Ogg Opus stream using FFmpeg.
 * Supports seeking and audio filters.
 *
 * @param {Readable} input Source audio stream (any format FFmpeg can read)
 * @param {SourceStreamOptions} [options] Seek and filter options
 *
 * @example
 * const opus = createOpusStream(sourceStream, { seek: 30, filter: 'bass=g=10' });
 *
 * @returns {Readable} Ogg Opus stream. It emits an `error` if FFmpeg can not be started.
 */
export function createOpusStream(input: Readable, options: SourceStreamOptions = {}): Readable {
    const args: Array<string> = ['-loglevel', '0'];
    if(options.seek) args.push('-ss', String(options.seek));

    args.push('-i', 'pipe:0', '-vn');
    if(options.filter) args.push('-af', options.filter);
    args.push('-c:a', 'libopus', '-b:a', '128k', '-ar', '48000', '-ac', '2', '-f', 'ogg', 'pipe:1');

    const ffmpeg = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'ignore'] });

    ffmpeg.on('error', error => ffmpeg.stdout.destroy(error));
    ffmpeg.stdin.on('error', () => { });
    input.on('error', error => ffmpeg.stdout.destroy(error));
    input.pipe(ffmpeg.stdin);

    ffmpeg.stdout.once('close', () => {
        input.destroy();
        ffmpeg.kill();
    })

    return ffmpeg.stdout;
}

/**
 * Creates an audio resource with inline volume from an Ogg Opus stream.
 * The stream is demuxed, decoded, passed through a volume transformer and encoded back, so the volume can be changed at any moment.
 * It does not start an extra FFmpeg process (unlike `createAudioResource` with `inlineVolume` in `@discordjs/voice` 0.19).
 *
 * @param {Readable} stream Ogg Opus stream, for example from `SourceRegistry#stream`
 *
 * @throws {Error} If no Opus library is installed (`opusscript` is a dependency of the module; `@discordjs/opus` is faster)
 *
 * @example
 * const stream = await player.sources.stream('https://www.youtube.com/watch?v=Vt2TeOptLxE');
 * const resource = createVolumeResource(stream);
 *
 * resource.volume.setVolume(0.5);
 *
 * @returns {AudioResource} Audio resource whose `volume` property is the volume transformer
 */
export function createVolumeResource(stream: Readable): AudioResource {
    const demuxer = new prism.opus.OggDemuxer();
    const decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
    const volume = new prism.VolumeTransformer({ type: 's16le' });
    const encoder = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });

    const output = pipeline([stream, demuxer, decoder, volume, encoder], () => { });
    const resource = createAudioResource(output as unknown as Readable, { inputType: StreamType.Opus });

    (resource as { volume?: prism.VolumeTransformer }).volume = volume;

    return resource;
}
