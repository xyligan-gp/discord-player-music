import { Player } from "../src/Player";

export declare class PlayerEmitter {
    public on(event: string, data: any): Player;
    public once(event: string, data: any): Player;
    public emit(event: string, ...args: any): boolean;
}