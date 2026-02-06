import { Type, TypeSchema } from "typebad";

export class ParseHelper {
  public static parseParams(
    schema: TypeSchema | null,
    params: Record<string, any> | null,
  ): Record<string, any> | null {
    if (schema === null) {
      if (params !== null) {
        throw new Error("Invalid params value.");
      }

      return null;
    }

    if (params === null) {
      throw new Error("Invalid params value.");
    }

    try {
      return Type.parse(Type.object(schema), params, {
        allowUnknownProperties: true,
      });
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
