import http from "node:http";

import { WebSocketServer } from "ws";

import { RequestEndpoint } from "./Endpoint/RequestEndpoint";
import { SubscriptionEndpoint } from "./Endpoint/SubscriptionEndpoint";

import { RequestHandler } from "./Handler/RequestHandler";
import { SubscriptionHandler } from "./Handler/SubscriptionHandler/SubscriptionHandler";

import {
  ContextManager,
  ContextRecord,
  InferContext,
} from "./Context/ContextManager";

import { Type, TypeSchema } from "./Type";

export class Server<
  T extends ContextManager<ContextRecord> | undefined = undefined
> {
  private requests: Map<
    string,
    RequestEndpoint<InferContext<T>, TypeSchema | null, Type<any> | null>
  > = new Map();

  private subscriptions: Map<
    string,
    SubscriptionEndpoint<InferContext<T>, TypeSchema | null, Type<any> | null>
  > = new Map();

  constructor(private contextManager?: T) {}

  public getContextManager(): T | undefined {
    return this.contextManager;
  }

  public getRequests(): Map<
    string,
    RequestEndpoint<InferContext<T>, TypeSchema | null, Type<any> | null>
  > {
    return this.requests;
  }

  public getRequest(
    name: string
  ):
    | RequestEndpoint<InferContext<T>, TypeSchema | null, Type<any> | null>
    | undefined {
    return this.requests.get(name);
  }

  public setRequest(
    name: string
  ): RequestEndpoint<InferContext<T>, null, null> {
    const request = new RequestEndpoint<any, any, any>();

    this.requests.set(name, request);

    return request;
  }

  public hasRequest(name: string): boolean {
    return this.requests.has(name);
  }

  public getSubscriptions(): Map<
    string,
    SubscriptionEndpoint<InferContext<T>, TypeSchema | null, Type<any> | null>
  > {
    return this.subscriptions;
  }

  public getSubscription(
    name: string
  ):
    | SubscriptionEndpoint<InferContext<T>, TypeSchema | null, Type<any> | null>
    | undefined {
    return this.subscriptions.get(name);
  }

  public setSubscription(
    name: string
  ): SubscriptionEndpoint<InferContext<T>, null, null> {
    const subscription = new SubscriptionEndpoint<any, any, any>();

    this.subscriptions.set(name, subscription);

    return subscription;
  }

  public hasSubscription(name: string): boolean {
    return this.subscriptions.has(name);
  }

  public start(port: number): Promise<void> {
    return new Promise((resolve, reject): void => {
      try {
        const server = http.createServer(RequestHandler.wrapListener(this));

        const ws = new WebSocketServer({ server });

        ws.on("connection", SubscriptionHandler.wrapListener(this));

        ws.on("error", (error): void => {
          reject(error);
        });

        server.listen(port, resolve);
      } catch (error) {
        reject(error);
      }
    });
  }
}
