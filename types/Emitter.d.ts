// Import emitter requirements
import { EventEmitter } from "events";

declare class PlayerEmitter<V extends ListenerSignature<V> = IDefaultListener> {
    private _emitter: EventEmitter;

    /**
     * Registers an event listener for the specified event.
     * 
     * @param event - The event to listen for.
     * @param listener - The listener function to be called when the event occurs.
     * 
     * @returns The current PlayerEmitter instance for method chaining.
     */
    public on<U extends keyof V>(event: U, listener: V[U]): this;

    /**
     * Registers a one-time event listener for the specified event.
     * The listener will be automatically removed after being called once.
     * 
     * @param event - The event to listen for.
     * @param listener - The listener function to be called when the event occurs.
     * 
     * @returns The current PlayerEmitter instance for method chaining.
     */
    public once<U extends keyof V>(event: U, listener: V[U]): this;

    /**
     * Emits the specified event and passes all parameters to the listener.
     * 
     * @param event - The event to emit.
     * @param args - The arguments to pass to the listeners.
     * 
     * @returns A flag indicating whether the event had listeners or not.
     */
    public emit<U extends keyof V>(event: U, ...args: Parameters<V[U]>): boolean;
}

type ListenerSignature<L> = {
    [E in keyof L]: (...args: any[]) => any;
}

interface IDefaultListener {
    [k: string]: (...args: any[]) => any;
}

export { PlayerEmitter };