interface DiscordPlayerMusicOptions {
    searchResultsLimit: number;
    searchCollector: boolean;
    searchCollectorConfig: {
        type: 'message' | 'reaction';
        count: number;
    }
}

export = DiscordPlayerMusicOptions;