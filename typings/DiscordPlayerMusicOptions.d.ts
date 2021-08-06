interface DiscordPlayerMusicOptions {
    searchResultsLimit?: number;
    synchronLoop?: boolean;
    defaultVolume?: number;

    collectorsConfig?: {
        autoAddingSongs?: boolean;
        maxAttempts?: number;
        time?: string;
    }
}

export = DiscordPlayerMusicOptions;