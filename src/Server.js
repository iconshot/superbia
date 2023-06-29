const http = require("http");

const express = require("express");

const cors = require("cors");
const fileUpload = require("express-fileupload");

const { Server: WebSocketServer } = require("ws");

const TypeHelper = require("./Helpers/TypeHelper");

const Publisher = require("./Publisher/Publisher");

const requestHandler = require("./handlers/request-handler");
const subscriptionHandler = require("./handlers/subscription-handler");

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

  setType(name, type) {
    this.types.set(name, type);
  }

  hasType(name) {
    return this.types.has(name);
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

  getContext() {
    return this.context;
  }

  setContext(context) {
    this.context = context;
  }

  start(port) {
    return new Promise((resolve, reject) => {
      const app = express();

      this.app = app;

      // app middlewares

      app.use(cors());
      app.use(fileUpload());

      app.use(express.json());

      app.use(express.urlencoded({ extended: true }));

      app.set("trust proxy", true);

      const server = http.createServer(app);

      this.server = server;

      const ws = new WebSocketServer({ server });

      this.ws = ws;

      this.parse();

      this.addRequestHandler();
      this.addSubscriptionHandler();

      server.on("error", (error) => {
        reject(error);
      });

      server.listen(port, resolve);
    });
  }

  parse() {
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
