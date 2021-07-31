import { Client, Collection} from 'discord.js';

import Emitter from '../src/Emitter.js';

import DiscordPlayerMusicOptions from './DiscordPlayerMusicOptions';

import QueueManager from './QueueManager';
import UtilsManager from './UtilsManager';
import VoiceManager from './VoiceManager';

declare class DiscordPlayerMusic extends Emitter {
    constructor(client: Client, options: DiscordPlayerMusicOptions);

    public client: Client;
    public ready: boolean;
    public options: DiscordPlayerMusicOptions;
    public docs: string;
    public version: string;
    public author: string;
    public mode: string;

    public queue: Collection<string, QueueManager>;
    public utils: UtilsManager;
    public voice: VoiceManager;

    /**
     * Method for initializing the module
    */
    private init(): void;
}

export = DiscordPlayerMusic;