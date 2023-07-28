const http = require("http");

const express = require("express");

const cors = require("cors");
const fileUpload = require("express-fileupload");

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
    this.app = null; // express app
    this.server = null; // http server
    this.ws = null; // ws server

    this.types = new Map();
    this.requests = new Map();
    this.subscriptions = new Map();

    this.context = null;

    this.publisher = new Publisher();

    this.init();
  }

  init() {
    const app = express();

    this.app = app;

    // app middlewares

    app.use(cors());
    app.use(fileUpload());

    app.use(express.json());

    app.use(express.urlencoded({ extended: true }));

    app.set("trust proxy", true);

    // servers

    const server = http.createServer(app);

    this.server = server;

    const ws = new WebSocketServer({ server });

    this.ws = ws;

    this.setDefaultTypes();
  }

  getApp() {
    return this.app;
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

  start(port) {
    return new Promise((resolve, reject) => {
      this.parseTypes();

      this.addRequestHandler();
      this.addSubscriptionHandler();

      this.server.on("error", (error) => reject(error));

      this.server.listen(port, resolve);
    });
  }

  parseTypes() {
    TypeHelper.parseTypes(this);
    TypeHelper.parseRequests(this);
    TypeHelper.parseSubscriptions(this);
  }

  addRequestHandler() {
    this.app.post("/", requestHandler(this));
  }

  addSubscriptionHandler() {
    this.ws.on("connection", subscriptionHandler(this));
  }

  publish(key, data) {
    this.publisher.publish(key, data);
  }
}

module.exports = Server;
