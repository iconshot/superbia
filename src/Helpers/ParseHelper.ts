import { Type, TypeObject } from "typebad";

export class ParseHelper {
  public static parseParams(
    object: TypeObject | null,
    params: Record<string, any> | null,
  ): Record<string, any> | null {
    if (object === null) {
      if (params !== null) {
        throw new Error("Invalid params value.");
      }

      return null;
    }

    if (params === null) {
      throw new Error("Invalid params value.");
    }

    try {
      return Type.parse(Type.object(object), params, {
        allowUnknownProperties: true,
      }) as any;
    } catch (error: any) {
      throw new Error(`Invalid params value: ${error.message}`);
    }
  }

  public static parseResult(type: Type<any> | null, value: any): any {
    if (type === null) {
      if (value !== undefined && value !== null) {
        throw new Error("Invalid result value.");
      }

      return null;
    }

    try {
      return Type.parse(type as Type<unknown>, value);
    } catch (error: any) {
      throw new Error(`Invalid result value: ${error.message}`);
    }
  }
}
