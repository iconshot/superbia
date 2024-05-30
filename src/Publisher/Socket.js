const Subscription = require("./Subscription");

class Socket {
  constructor() {
    this.subscriptions = new Map();
  }

  getSubscription(key) {
    return this.subscriptions.get(key);
  }

  deleteSubscription(key) {
    this.subscriptions.delete(key);
  }

  hasSubscription(key) {
    return this.subscriptions.has(key);
  }

  unsubscribe() {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
  }

  createSubscription(key) {
    const subscription = new Subscription(key, this);

    this.subscriptions.set(key, subscription);

    return subscription;
  }
}

module.exports = Socket;
