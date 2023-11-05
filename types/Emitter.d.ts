// Import emitter requirements
import { EventEmitter } from "events";

declare class PlayerEmitter<E extends Record<string, any>> {
    private _emitter = new EventEmitter();

    /**
     * Registers an event listener for the specified event.
     * 
     * @param event - The event to listen for.
     * @param listener - The listener function to be called when the event occurs.
     * 
     * @returns The current PlayerEmitter instance for method chaining.
     */
    public on<K extends Exclude<keyof E, number>>(event: K, listener: (...args: E[K]) => any): PlayerEmitter<E>;

    /**
     * Registers a one-time event listener for the specified event.
     * The listener will be automatically removed after being called once.
     * 
     * @param event - The event to listen for.
     * @param listener - The listener function to be called when the event occurs.
     * 
     * @returns The current PlayerEmitter instance for method chaining.
     */
    public once<K extends Exclude<keyof E, number>>(event: K, listener: (...args: E[K]) => any): PlayerEmitter<E>;

    /**
     * Emits the specified event and passes all parameters to the listener.
     * 
     * @param event - The event to emit.
     * @param args - The arguments to pass to the listeners.
     * 
     * @returns A flag indicating whether the event had listeners or not.
     */
    public emit<K extends Exclude<keyof E, number>>(event: K, ...args: E[K]): boolean;
}

export { PlayerEmitter };