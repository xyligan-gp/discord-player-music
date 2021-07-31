class DiscordPlayerMusicError extends Error {
    constructor(message: string | Error);

    public name: 'DiscordPlayerMusicError';
}

export = DiscordPlayerMusicError;