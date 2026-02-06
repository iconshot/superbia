import http from "node:http";

import { InputSchema, InputType, OutputType, Type, TypeSchema } from "typebad";

import { ContextRecord } from "../Context/ContextManager";

import { Endpoint } from "./Endpoint";

export type RequestEndpointResolver<
  K extends ContextRecord | null,
  P extends TypeSchema | null,
  R extends Type<any> | null,
> = (value: {
  request: http.IncomingMessage;
  headers: http.IncomingHttpHeaders;
  params: P extends TypeSchema ? OutputType<Type<InputSchema<P>>> : null;
  context: K;
}) => R extends Type<infer U>
  ? U extends undefined
    ? InputType<R> | Promise<InputType<R>> | void | Promise<void>
    : InputType<R> | Promise<InputType<R>>
  : null | undefined | void | Promise<null | undefined | void>;

export class RequestEndpoint<
  K extends ContextRecord | null,
  P extends TypeSchema | null,
  R extends Type<any> | null,
> extends Endpoint<K, P, R> {
  private resolver: RequestEndpointResolver<K, P, R> | null = null;

  public setParams<D extends TypeSchema>(params: D): RequestEndpoint<K, D, R> {
    return super.setParams(params) as RequestEndpoint<K, D, R>;
  }

  public setResult<D extends Type<any>>(result: D): RequestEndpoint<K, P, D> {
    return super.setResult(result) as RequestEndpoint<K, P, D>;
  }

  public getResolver(): RequestEndpointResolver<K, P, R> | null {
    return this.resolver;
  }

  public setResolver(resolver: RequestEndpointResolver<K, P, R>): this {
    this.resolver = resolver;

    return this;
  }
}
