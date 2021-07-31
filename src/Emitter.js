const { EventEmitter } = require('events');
const event = new EventEmitter();

/**
 * Moderator EventEmitter
 * @private
*/
class Emitter {
    /**
     * Method for listening to events
     * @param {String} eventName Event Name
     * @param {Function} fn Callback
     * @returns {Emitter} Moderator Emitter
    */
    on(eventName, fn) {
        event.on(eventName, fn)
    }
    /**
     * Method to listen for an event only once
     * @param {String} eventName Event Name
     * @param {Function} fn Callback
     * @returns {Emitter} Moderator Emitter
    */
    once(eventName, fn) {
        event.once(eventName, fn)
    }
    
    /**
     * Method for emits to events
     * @param {String} eventName Event Name
     * @param {Function} fn Callback
     * @returns {Boolean} Event Emit Status
    */
    emit(eventName, ...args) {
        event.emit(eventName, args[0])
    }
}

module.exports = Emitter;