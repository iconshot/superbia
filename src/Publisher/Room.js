class Room {
  constructor(key, listener, emitter) {
    this.key = key;
    this.listener = listener;

    this.emitter = emitter;
  }

  subscribe() {
    this.emitter.on(this.key, this.listener);
  }

  unsubscribe() {
    this.emitter.off(this.key, this.listener);
  }
}

module.exports = Room;
