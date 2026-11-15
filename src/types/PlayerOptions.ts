import { SourceProvider } from '../sources/SourceProvider';
import { LyricsProvider } from '../lyrics/LyricsProvider';

export interface PlayerOptions {
    autoAddingTracks?: boolean;
    autoplay?: boolean;
    autoplayLimit?: number;
    autoplayHistory?: number;
    autoplayMaxDuration?: string;
    searchResultsLimit?: number;
    synchronLoop?: boolean;
    defaultVolume?: number;
    playlistLimit?: number;
    prefetchSeconds?: number;
    cookies?: string;
    sourceFailureThreshold?: number;
    sourceCooldown?: string;
    sources?: Array<SourceProvider>;
    lyrics?: LyricsProvider;

    progressConfig?: {
        size?: number;
        line?: string;
        slider?: string;
    }

    collectorsConfig?: {
        message?: {
            time?: string;
            attempts?: number;
            cancel?: string | false;
        }

        reaction?: {
            time?: string;
            attempts?: number;
            reactions?: Array<string>;
            cancel?: string | false;
        }
    }
}

/**
 * Player options with all default values applied
 */
export interface ResolvedPlayerOptions {
    autoAddingTracks: boolean;
    autoplay: boolean;
    autoplayLimit: number;
    autoplayHistory: number;
    autoplayMaxDuration: string;
    searchResultsLimit: number;
    synchronLoop: boolean;
    defaultVolume: number;
    playlistLimit: number;
    prefetchSeconds: number;
    cookies?: string;
    sourceFailureThreshold: number;
    sourceCooldown: string;
    sources?: Array<SourceProvider>;
    lyrics?: LyricsProvider;

    progressConfig: {
        size: number;
        line: string;
        slider: string;
    }

    collectorsConfig: {
        message: {
            time: string;
            attempts: number;
            cancel: string | false;
        }

        reaction: {
            time: string;
            attempts: number;
            reactions: Array<string>;
            cancel: string | false;
        }
    }
}
