/**
 * Player Error Class
 * 
 * @class
 * @classdesc Custom error class for player-related errors.
 * 
 * @extends {Error}
 * 
 * @private
 */
class PlayerError extends Error {
    public name: string;
    
    /**
     * Constructs a new instance of PlayerError.
     * 
     * @param {string} error - The error message.
     */
    constructor(error: string) {
        super(error);
        
        /**
         * The name of the error.
         */
        this.name = "PlayerError";
    }
}

export { PlayerError };