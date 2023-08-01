const http = require("http");

const { Server: WebSocketServer } = require("ws");

const TypeHelper = require("./Helpers/TypeHelper");

const Publisher = require("./Publisher/Publisher");

const requestHandler = require("./handlers/request-handler");
const subscriptionHandler = require("./handlers/subscription-handler");

const Type = require("./Type");
const Endpoint = require("./Endpoint");
const Upload = require("./Upload");

class Server {
  constructor() {
    this.server = null; // http server
    this.ws = null; // ws server

    this.types = new Map();
    this.requests = new Map();
    this.subscriptions = new Map();

    this.context = null;

    this.middlewares = [];

    this.requestMiddlewares = [];
    this.subscriptionMiddlewares = [];

    this.publisher = new Publisher();

    this.setDefaultTypes();
  }

  getPublisher() {
    return this.publisher;
  }

  getTypes() {
    return this.types;
  }

  getRequests() {
    return this.requests;
  }

  getSubscriptions() {
    return this.subscriptions;
  }

  getType(name) {
    return this.types.get(name);
  }

  setType(name, matcher) {
    const type = new Type(name, matcher, this);

    this.types.set(name, type);

    return type;
  }

  hasType(name) {
    return this.types.has(name);
  }

  deleteType(name) {
    return this.types.delete(name);
  }

  setDefaultTypes() {
    this.setType("ID", (value) => typeof value === "string");

    this.setType("Boolean", (value) => value === true || value === false);

    this.setType("String", (value) => typeof value === "string");

    this.setType("Int", (value) => Number.isInteger(value));

    this.setType(
      "Float",
      (value) =>
        Number.isInteger(value) || (value === +value && value !== (value | 0))
    );

    this.setType("Upload", (value) => value instanceof Upload);

    this.setType("Date", (value) => value instanceof Date);

    this.setType("PaginationPageInfo", {
      hasNextPage: "Boolean!",
      nextPageCursor: "String",
    });
  }

  getRequest(name) {
    return this.requests.get(name);
  }

  setRequest(name, ...args) {
    const endpoint = new Endpoint(...args);

    this.requests.set(name, endpoint);

    return endpoint;
  }

  hasRequest(name) {
    return this.requests.has(name);
  }

  deleteRequest(name) {
    this.requests.delete(name);
  }

  getSubscription(name) {
    return this.subscriptions.get(name);
  }

  setSubscription(name, ...args) {
    const endpoint = new Endpoint(...args);

    this.subscriptions.set(name, endpoint);

    return endpoint;
  }

  hasSubscription(name) {
    return this.subscriptions.has(name);
  }

  deleteSubscription(name) {
    this.subscriptions.delete(name);
  }

  getContext() {
    return this.context;
  }

  setContext(context) {
    this.context = context;
  }

  addMiddleware(middleware) {
    this.middlewares.push(middleware);
  }

  getMiddlewares() {
    return this.middlewares;
  }

  addRequestMiddleware(middleware) {
    this.requestMiddlewares.push(middleware);
  }

  getRequestMiddlewares() {
    return this.requestMiddlewares;
  }

  addSubscriptionMiddleware(middleware) {
    this.subscriptionMiddlewares.push(middleware);
  }

  getSubscriptionMiddlewares() {
    return this.subscriptionMiddlewares;
  }

  start(port) {
    this.parseTypes();

    return new Promise((resolve, reject) => {
      const server = http.createServer(requestHandler(this));

      const ws = new WebSocketServer({ server });

      ws.on("connection", subscriptionHandler(this));

      server.on("error", (error) => reject(error));

      server.listen(port, resolve);
    });
  }

  parseTypes() {
    TypeHelper.parseTypes(this);
    TypeHelper.parseRequests(this);
    TypeHelper.parseSubscriptions(this);
  }

  publish(key, data) {
    this.publisher.publish(key, data);
  }
}

module.exports = Server;
