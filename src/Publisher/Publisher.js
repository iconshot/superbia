const EventEmitter = require("events");

const Room = require("./Room");

class Publisher {
  constructor() {
    this.emitter = new EventEmitter();

    this.emitter.setMaxListeners(Number.MAX_VALUE);
  }

  publish(key, data) {
    this.emitter.emit(key, data);
  }

  createRoom(key, listener) {
    return new Room(key, listener, this.emitter);
  }
}

module.exports = Publisher;
