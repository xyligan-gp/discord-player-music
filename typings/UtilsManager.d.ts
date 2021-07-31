import { Client } from 'discord.js';

import DiscordPlayerMusicOptions from './DiscordPlayerMusicOptions';

declare class UtilsManager {
    constructor(client: Client, options: DiscordPlayerMusicOptions);
}

export = UtilsManager;