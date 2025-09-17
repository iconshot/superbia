import { ContextRecord } from "../Context/ContextManager";

import { Type, TypeSchema } from "../Type";

export class Endpoint<
  K extends ContextRecord | null,
  P extends TypeSchema | null,
  R extends Type<any> | null
> {
  protected params: P | null = null;
  protected result: R | null = null;

  public getParams(): P | null {
    return this.params;
  }

  public setParams<D extends TypeSchema>(params: D): Endpoint<K, D, R> {
    const self = this as any;

    self.params = params;

    return this as unknown as Endpoint<K, D, R>;
  }

  public getResult(): R | null {
    return this.result;
  }

  public setResult<D extends Type<any>>(result: D): Endpoint<K, P, D> {
    const self = this as any;

    self.result = result;

    return this as unknown as Endpoint<K, P, D>;
  }
}
