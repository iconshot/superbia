import http from "node:http";

import WebSocket from "ws";

import { ErrorHelper, ResponseError } from "../../Helpers/ErrorHelper";

import { ContextManager, ContextRecord } from "../../Context/ContextManager";
import { ContextGenerator } from "../../Context/ContextGenerator";

import { Server } from "../../Server";
import { Type } from "../../Type";

import { Socket } from "./Socket";
import { SubscriptionController } from "./SubscriptionController";

export class SubscriptionHandler {
  private data: {
    subscriptionKey: number;
    response: {
      result: Record<
        string,
        { result: any; error: ResponseError | null }
      > | null;
      error: ResponseError | null;
    };
  } = { subscriptionKey: 0, response: { result: null, error: null } };

  private subscriptionController: SubscriptionController | null = null;

  constructor(
    private server: Server<ContextManager<ContextRecord> | undefined>,
    private connection: WebSocket,
    private request: http.IncomingMessage,
    private headers: http.IncomingHttpHeaders,
    private socket: Socket,
    private contextGenerator: ContextGenerator<ContextRecord> | null,
    private message: WebSocket.RawData
  ) {}

  private async init(): Promise<void> {
    let json: any;

    try {
      json = JSON.parse(this.message.toString());
    } catch (error) {
      return;
    }

    if (json === null || typeof json !== "object") {
      return;
    }

    const { subscriptionKey, endpoint: endpointObject } = json;

    if (subscriptionKey === undefined || endpointObject === undefined) {
      return;
    }

    if (typeof subscriptionKey !== "number") {
      return;
    }

    if (endpointObject === null) {
      // unsubscribe

      if (!this.socket.hasSubscriptionController(subscriptionKey)) {
        return;
      }

      const subscriptionController =
        this.socket.getSubscriptionController(subscriptionKey)!;

      subscriptionController.destroy();

      return;
    }

    if (this.socket.hasSubscriptionController(subscriptionKey)) {
      return;
    }

    this.subscriptionController =
      this.socket.createSubscriptionController(subscriptionKey);

    this.data.subscriptionKey = subscriptionKey;

    if (typeof endpointObject !== "object") {
      this.sendError(new Error("Endpoint field is not an object."));

      this.subscriptionController.destroy();

      return;
    }

    const endpointNames = Object.keys(endpointObject);

    if (endpointNames.length !== 1) {
      this.sendError(new Error("Endpoint field must have one element."));

      this.subscriptionController.destroy();

      return;
    }

    let context: ContextRecord | null = null;

    if (this.contextGenerator !== null) {
      try {
        context = await this.contextGenerator.getContext();
      } catch (error) {
        this.sendError(error);

        this.subscriptionController.destroy();

        return;
      }
    }

    const endpointName = endpointNames[0];

    this.data.response.result = {};

    const result = this.data.response.result;

    result[endpointName] = { result: null, error: null };

    const endpointResult = result[endpointName];

    try {
      if (!this.server.hasSubscription(endpointName)) {
        throw new Error("Subscription endpoint not found.");
      }

      const params = endpointObject[endpointName];

      if (params !== null && typeof params !== "object") {
        throw new Error("Invalid params value.");
      }

      const subscriptionEndpoint = this.server.getSubscription(endpointName)!;

      const resolver = subscriptionEndpoint.getResolver();

      if (resolver === null) {
        throw new Error("Resolver not set.");
      }

      Type.checkParams(subscriptionEndpoint.getParams(), params);

      this.subscriptionController.initialize(subscriptionEndpoint);

      this.subscriptionController.on("result", (value): void => {
        try {
          const parsedValue = Type.parseResult(
            subscriptionEndpoint.getResult(),
            value
          );

          endpointResult.result = parsedValue;
        } catch (error) {
          endpointResult.error = ErrorHelper.parseError(error);
        }

        this.send();

        endpointResult.result = null;
        endpointResult.error = null;
      });

      await resolver({
        request: this.request,
        headers: this.headers,
        context,
        params,
        subscription: this.subscriptionController.subscription!,
      });

      this.subscriptionController.resolved = true;

      this.sendSuccess();
    } catch (error) {
      endpointResult.error = ErrorHelper.parseError(error);

      this.send();

      this.subscriptionController.destroy();
    }
  }

  private send(): void {
    const destroyed = this.subscriptionController?.destroyed ?? false;

    if (destroyed) {
      return;
    }

    const json = JSON.stringify(this.data);

    this.connection.send(json);
  }

  private sendError(error: any): void {
    this.data.response.error = ErrorHelper.parseError(error);

    this.send();
  }

  private sendSuccess(): void {
    const response = this.data.response;

    this.data.response = { result: null, error: null };

    this.send();

    this.data.response = response;
  }

  public static wrapListener(
    server: Server<ContextManager<ContextRecord> | undefined>
  ): (connection: WebSocket, request: http.IncomingMessage) => void {
    return (connection: WebSocket, request: http.IncomingMessage): void => {
      const socket = new Socket();

      const headers: http.IncomingHttpHeaders = {};

      const url = new URL(request.url!, "http://localhost");

      url.searchParams.forEach((value, key): void => {
        const tmpKey = key.toLowerCase();

        headers[tmpKey] = value;
      });

      const contextManager = server.getContextManager();

      let contextGenerator: ContextGenerator<ContextRecord> | null = null;

      if (contextManager !== undefined) {
        contextGenerator = new ContextGenerator(
          contextManager,
          request,
          headers
        );
      }

      connection.on("message", (message): void => {
        const subscriptionHandler = new SubscriptionHandler(
          server,
          connection,
          request,
          headers,
          socket,
          contextGenerator,
          message
        );

        subscriptionHandler.init();
      });

      connection.on("close", (): void => {
        socket.destroy();
      });
    };
  }
}
