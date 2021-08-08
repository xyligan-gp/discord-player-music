declare class DiscordPlayerMusicError extends Error {
    constructor(message: string | Error);

    public name: 'DiscordPlayerMusic Error';
}

export = DiscordPlayerMusicError;