import { Message } from 'discord.js';

import DiscordPlayerMusic from './Player';

import { PlayerSong } from './PlayerData';

declare class CollectorsManager {
    constructor(player: DiscordPlayerMusic);

    public methods: Array<string>;
    public size: number;
    private player: DiscordPlayerMusic;

    /**
     * Method for creating a message collector
     * @param msg Discord Message
     * @param resultsArray Results List
     * @returns Returns the index of a song from the list and information about it
    */
    public message(msg: Message, resultsArray: Array<PlayerSong>): Promise<{ index: number, song: PlayerSong, results: Array<PlayerSong> }>;
}

export = CollectorsManager;