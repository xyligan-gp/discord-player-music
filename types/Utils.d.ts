// Import interfaces
import { PlayerOptions } from "./index";

declare class PlayerUtils {
    /**
     * Checks and updates the player options.
     * 
     * @param options - The player options to be checked and updated.
     * 
     * @returns The updated player options.
     */
    public checkOptions(options?: PlayerOptions): PlayerOptions;
}

export { PlayerUtils };