import { EventEmitter } from "events";

/**
 * Player EventEmitter
 * 
 * @class
 * @classdesc Represents an event emitter for player events.
 * 
 * @private
 */
class PlayerEmitter<E extends Record<string, any>> {
    private _emitter = new EventEmitter();

    /**
     * Registers an event listener for the specified event.
     * 
     * @param {PlayerEvents} event - The event to listen for.
     * @param {Function} listener - The listener function to be called when the event occurs.
     * 
     * @returns {PlayerEmitter} The current PlayerEmitter instance for method chaining.
     */
    public on<K extends Exclude<keyof E, number>>(event: K, listener: (...args: E[K]) => any): PlayerEmitter<E> {
        this._emitter.on(event, listener);

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
    public once<K extends Exclude<keyof E, number>>(event: K, listener: (...args: E[K]) => any): PlayerEmitter<E> {
        this._emitter.once(event, listener);

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
    public emit<K extends Exclude<keyof E, number>>(event: K, ...args: E[K]): boolean {
        return this._emitter.emit(event, ...args as any[]);
    }
}

export { PlayerEmitter };