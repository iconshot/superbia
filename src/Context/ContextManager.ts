import http from "node:http";

export type ContextHandler<C, V> = (value: {
  headers: http.IncomingHttpHeaders;
  context: C;
  request: http.IncomingMessage;
}) => V | Promise<V>;

export type ContextHandlerMap<C> = {
  [K in keyof C]: ContextHandler<Partial<C>, C[K]>;
};

export type InferContext<T> = T extends ContextManager<infer K> ? K : null;

export type ContextRecord = Record<string, any>;

export class ContextManager<C extends ContextRecord = {}> {
  private handlers: ContextHandlerMap<C> = {} as any;

  public getHandlers(): ContextHandlerMap<C> {
    return this.handlers;
  }

  setHandler<K extends string, V>(
    key: K,
    handler: ContextHandler<C, V>
  ): ContextManager<C & { [P in K]: V }> {
    const handlers = this.handlers as any;

    handlers[key] = handler;

    return this as any;
  }
}
