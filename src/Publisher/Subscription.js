class Subscription {
  constructor(key, socket) {
    this.key = key;

    this.rooms = [];
    this.closure = () => {};

    this.socket = socket;
  }

  subscribe(rooms, closure) {
    this.rooms = rooms;
    this.closure = closure;

    this.rooms.forEach((room) => room.subscribe());
  }

  unsubscribe() {
    this.socket.deleteSubscription(this.key);

    this.rooms.forEach((room) => room.unsubscribe());

    this.closure();
  }
}

module.exports = Subscription;
