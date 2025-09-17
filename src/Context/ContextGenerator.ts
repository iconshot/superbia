import http from "node:http";

import { EverEmitter } from "everemitter";

import { ContextManager, ContextRecord } from "./ContextManager";

type EmitterSignatures = {
  context: () => any;
  error: () => any;
};

export class ContextGenerator<T extends ContextRecord> {
  private emitter: EverEmitter<EmitterSignatures> = new EverEmitter();

  private done: boolean = false;

  private context: T | null = null;
  private error: any = null;

  constructor(
    private contextManager: ContextManager<T>,
    private request: http.IncomingMessage,
    private headers: http.IncomingHttpHeaders
  ) {
    this.generate();
  }

  /*
  
  multiple calls to getContext() will get the object stored
  in this.context or wait for the reducing to finish if necessary

  */

  public async getContext(): Promise<T> {
    if (this.done) {
      if (this.error !== null) {
        throw this.error;
      }

      return this.context!;
    }

    return new Promise((resolve, reject): void => {
      this.emitter.on("context", (): void => {
        resolve(this.context!);
      });

      this.emitter.on("error", (): void => {
        reject(this.error);
      });
    });
  }

  private async generate() {
    try {
      let context: T = {} as T;

      const handlers = this.contextManager.getHandlers();

      for (const key in handlers) {
        const handler = handlers[key];

        const result = await handler({
          request: this.request,
          headers: this.headers,
          context,
        });

        context[key] = result;
      }

      this.context = context;

      this.emitter.emit("context");
    } catch (error) {
      this.error = error;

      this.emitter.emit("error");
    } finally {
      this.done = true;
    }
  }
}
