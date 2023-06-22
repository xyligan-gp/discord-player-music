// Import intefaces
import { PlayerOptions } from "../types";

/**
 * Player Utils Class
 * 
 * @class
 * @classdesc Player Utils
 */
class PlayerUtils {
    /**
     * Checks and updates the player options.
     * 
     * @param {PlayerOptions} [options] - The player options to be checked and updated.
     * 
     * @returns {PlayerOptions} The updated player options.
     */
    public checkOptions(options?: PlayerOptions): PlayerOptions {
        if(!options) return {
            addTracksToQueue: true,
            searchResultsCount: 10,
            synchronLoop: true,
            defaultVolume: 5,

            configs: {
                progressBar: {
                    size: 11,
                    line: "▬",
                    slider: "🔘"
                },

                collectors: {
                    message: {
                        time: "30s",
                        attempts: 1
                    },
    
                    reaction: {
                        time: "30s",
                        attempts: 1,
                        reactions: ["1⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣", "8⃣", "9⃣", "🔟"]
                    }
                }
            }
        }

        if(typeof options?.addTracksToQueue != "boolean") options.addTracksToQueue = true;
        if(!options.searchResultsCount || typeof options.searchResultsCount != "number") options.searchResultsCount = 10;
        if(!options.synchronLoop || typeof options.synchronLoop != "boolean") options.synchronLoop = true;
        if(!options.defaultVolume || typeof options.defaultVolume != "number") options.defaultVolume = 5;

        if(!options.configs.progressBar || typeof options.configs.progressBar != "object") {
            options.configs.progressBar = {
                size: 11,
                line: "▬",
                slider: "🔘"
            }
        }else{
            if(!options.configs.progressBar.size || typeof options.configs.progressBar.size != "number") options.configs.progressBar.size = 11;
            if(!options.configs.progressBar.line || typeof options.configs.progressBar.line != "string") options.configs.progressBar.line = "▬";
            if(!options.configs.progressBar.slider || typeof options.configs.progressBar.slider != "string") options.configs.progressBar.slider = "🔘";
        }

        if(!options.configs.collectors || typeof options.configs.collectors != "object") {
            options.configs.collectors = {
                message: {
                    time: "1m",
                    attempts: 1
                },

                reaction: {
                    time: "30s",
                    attempts: 1,
                    reactions: ["1⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣", "8⃣", "9⃣", "🔟"]
                }
            }
        }else{
            if(!options.configs.collectors.message || typeof options.configs.collectors.message != "object") {
                options.configs.collectors.message = {
                    time: "1m",
                    attempts: 1
                }
            }else{
                if(!options.configs.collectors.message.time || typeof options.configs.collectors.message.time != "string") options.configs.collectors.message.time = "1m";
                if(!options.configs.collectors.message.attempts || typeof options.configs.collectors.message.attempts != "number") options.configs.collectors.message.attempts = 1;
            }

            if(!options.configs.collectors.reaction || typeof options.configs.collectors.reaction != "object") {
                options.configs.collectors.reaction = {
                    time: "30s",
                    attempts: 1,
                    reactions: ["1⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣", "8⃣", "9⃣", "🔟"]
                }
            }else{
                if(!options.configs.collectors.reaction.time || typeof options.configs.collectors.reaction.time != "string") options.configs.collectors.reaction.time = "30s";
                if(!options.configs.collectors.reaction.attempts || typeof options.configs.collectors.reaction.attempts != "number") options.configs.collectors.reaction.attempts = 1;
                if(!options.configs.collectors.reaction.reactions || !options.configs.collectors.reaction.reactions?.length) options.configs.collectors.reaction.reactions = ["1⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣", "8⃣", "9⃣", "🔟"];
            }
        }

        return options;
    }
}

export { PlayerUtils }