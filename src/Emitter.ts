import { EventEmitter } from "events";

/**
 * Player EventEmitter
 * 
 * @class
 * @classdesc Represents an event emitter for player events.
 * 
 * @private
 */
class PlayerEmitter<V extends ListenerSignature<V> = IDefaultListener> {
    private _emitter = new EventEmitter();

    /**
     * Registers an event listener for the specified event.
     * 
     * @param {PlayerEvents} event - The event to listen for.
     * @param {Function} listener - The listener function to be called when the event occurs.
     * 
     * @returns {PlayerEmitter} The current PlayerEmitter instance for method chaining.
     */
    public on<U extends keyof V>(event: U, listener: V[U]): PlayerEmitter {
        this._emitter.on(event as string, listener);
        
        return this;
    }

    /**
     * Registers a one-time event listener for the specified event.
     * The listener will be automatically removed after being called once.
     * 
     * @param {PlayerEvents} event - The event to listen for.
     * @param {Function} listener - The listener function to be called when the event occurs.
     * 
     * @returns {PlayerEmitter} The current PlayerEmitter instance for method chaining.
     */
    public once<U extends keyof V>(event: U, listener: V[U]): PlayerEmitter {
        this._emitter.once(event as string, listener);

        return this;
    }

    /**
     * Emits the specified event and passes all parameters to the listener.
     * 
     * @param {PlayerEvents} event - The event to emit.
     * @param {any} args - The arguments to pass to the listeners.
     * 
     * @returns {boolean} A flag indicating whether the event had listeners or not.
     */
    public emit<U extends keyof V>(event: U, ...args: Parameters<V[U]>): boolean {
        return this._emitter.emit(event as string, ...args);
    }
}

type ListenerSignature<L> = {
    [E in keyof L]: (...args: any[]) => any;
}

interface IDefaultListener {
    [k: string]: (...args: any[]) => any;
}

export { PlayerEmitter };