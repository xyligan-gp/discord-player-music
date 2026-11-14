import { EventEmitter } from 'node:events';

import { Events } from './PlayerEnums';
import { PlayerEvents } from './types/PlayerEvents';

/**
 * Class that controls Player Emitter. Every player has its own emitter.
 *
 * @class
 * @classdesc Player Emitter Class
 * @extends {EventEmitter}
 *
 * @private
 */
export class PlayerEmitter extends EventEmitter<PlayerEvents> {
    /**
     * Method for listening Player events
     *
     * @param {Events} event Event Name
     * @param {function} listener Event listener
     *
     * @returns {this} The emitter
     */
    on<K extends keyof PlayerEvents>(event: K | Events, listener: (...args: PlayerEvents[K]) => void): this {
        return super.on(event as K, listener as never);
    }

    /**
     * Method to listen for an Player event only once
     *
     * @param {Events} event Event Name
     * @param {function} listener Event listener
     *
     * @returns {this} The emitter
     */
    once<K extends keyof PlayerEvents>(event: K | Events, listener: (...args: PlayerEvents[K]) => void): this {
        return super.once(event as K, listener as never);
    }

    /**
     * Method for emits Player events
     *
     * @param {Events} event Event Name
     * @param {any} args Event Args
     *
     * @returns {boolean} `true` if the event had listeners (an `error` event without listeners is printed to the console)
     */
    emit<K extends keyof PlayerEvents>(event: K | Events, ...args: PlayerEvents[K]): boolean {
        // An 'error' event without listeners would throw in EventEmitter and crash the bot, so it is reported to the console instead
        if(event === Events.ERROR && this.listenerCount(event as K) === 0) {
            console.error('[discord-player-music] Unhandled player error:', ...args);

            return false;
        }

        return super.emit(event as K, ...(args as never));
    }
}
