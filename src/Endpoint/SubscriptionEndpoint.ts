import http from "node:http";

import { EverEmitter } from "everemitter";

import { Subscription } from "../Handler/SubscriptionHandler/Subscription";

import { ContextRecord } from "../Context/ContextManager";

import { Type, TypeSchema, InferSchema, InferType } from "../Type";

import { Endpoint } from "./Endpoint";

export type SubscriptionEndpointResolver<
  K extends ContextRecord | null,
  P extends TypeSchema | null
> = (value: {
  request: http.IncomingMessage;
  headers: http.IncomingHttpHeaders;
  params: InferSchema<P>;
  context: K;
  subscription: Subscription;
}) => void;

export type SubscriptionEndpointResult<R extends Type<any> | null> =
  R extends Type<infer U> ? InferType<Type<U>> : null | undefined;

type SubscriptionEndpointEmitterSignatures = Record<
  string,
  (value: any) => any
>;

export class SubscriptionEndpoint<
  K extends ContextRecord | null,
  P extends TypeSchema | null,
  R extends Type<any> | null
> extends Endpoint<K, P, R> {
  public emitter: EverEmitter<SubscriptionEndpointEmitterSignatures> =
    new EverEmitter();

  private resolver: SubscriptionEndpointResolver<K, P> | null = null;

  public setParams<D extends TypeSchema>(
    params: D
  ): SubscriptionEndpoint<K, D, R> {
    return super.setParams(params) as SubscriptionEndpoint<K, D, R>;
  }

  public setResult<D extends Type<any>>(
    result: D
  ): SubscriptionEndpoint<K, P, D> {
    return super.setResult(result) as SubscriptionEndpoint<K, P, D>;
  }

  public getResolver(): SubscriptionEndpointResolver<K, P> | null {
    return this.resolver;
  }

  public setResolver(resolver: SubscriptionEndpointResolver<K, P>): this {
    this.resolver = resolver;

    return this;
  }

  public publish(
    channelKey: string,
    value: SubscriptionEndpointResult<R>
  ): void {
    this.emitter.emit(channelKey, value);
  }
}
