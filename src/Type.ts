import { Upload } from "./Upload";

export type InferType<T> = T extends Type<infer U> ? U : never;

export type InferSchema<T extends TypeSchema | null> = T extends null
  ? null
  : Simplify<
      {
        [K in keyof T as undefined extends InferType<T[K]>
          ? never
          : K]: InferType<T[K]>;
      } & {
        [K in keyof T as undefined extends InferType<T[K]>
          ? K
          : never]?: InferType<T[K]>;
      }
    >;

type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type TypeMatcher = (value: any) => boolean;

export type TypeSchema = Record<string, Type<any>>;

export class Type<T> {
  private matcher: TypeMatcher | null = null;
  private schema: TypeSchema | null = null;
  private typename: string | null = null;
  private originalType: Type<any> | null = null;

  private isArray: boolean = false;
  private isOptional: boolean = false;

  public array(): Type<T[]> {
    const type = new Type<T[]>();

    type.originalType = this;
    type.isArray = true;

    return type;
  }

  public optional(): Type<T | null | undefined> {
    const type = new Type<T | null | undefined>();

    type.originalType = this;
    type.isOptional = true;

    return type;
  }

  public pagination(): Type<{
    nodes: T[];
    hasNextPage: boolean;
    nextPageCursor: string | null | undefined;
  }> {
    const type = Type.document("__pagination__", {
      nodes: this.array(),
      hasNextPage: Type.Boolean,
      nextPageCursor: Type.String.optional(),
    });

    return type;
  }

  public static match<T>(matcher: TypeMatcher): Type<T> {
    const type = new Type<T>();

    type.matcher = matcher;

    return type;
  }

  public static schema<S extends TypeSchema>(schema: S): Type<InferSchema<S>> {
    const type = new Type<InferSchema<S>>();

    type.schema = schema;

    return type;
  }

  public static document<S extends TypeSchema>(
    typename: string,
    schema: S
  ): Type<InferSchema<S>> {
    const type = new Type<InferSchema<S>>();

    type.typename = typename;
    type.schema = schema;

    return type;
  }

  public static checkParamsType(
    type: Type<any>,
    value: any,
    propertyName: string | null = null
  ): void {
    if (type.isOptional) {
      if (value === null || value === undefined) {
        return;
      }

      this.checkParamsType(type.originalType!, value, propertyName);

      return;
    }

    if (type.isArray) {
      if (!Array.isArray(value)) {
        throw new Error(this.getParamsError(propertyName));
      }

      value.forEach((tmpValue, i): void =>
        this.checkParamsType(
          type.originalType!,
          tmpValue,
          `${propertyName!}[${i}]`
        )
      );

      return;
    }

    if (type.matcher !== null) {
      if (!type.matcher(value)) {
        throw new Error(this.getParamsError(propertyName));
      }

      return;
    }

    if (type.schema !== null) {
      if (value === null || typeof value !== "object") {
        throw new Error(this.getParamsError(propertyName));
      }

      const schema = type.schema;

      for (const key in schema) {
        const tmpType = schema[key];
        const tmpValue = value[key];

        const tmpPropertyName =
          propertyName !== null ? `${propertyName}.${key}` : key;

        this.checkParamsType(tmpType, tmpValue, tmpPropertyName);
      }
    }
  }

  public static checkParams(
    schema: TypeSchema | null,
    value: Record<string, any> | null
  ): void {
    if (schema === null) {
      if (value !== null) {
        throw new Error(this.getParamsError(null));
      }

      return;
    }

    if (value === null) {
      throw new Error(this.getParamsError(null));
    }

    const type = Type.schema(schema);

    this.checkParamsType(type, value);
  }

  private static getParamsError(propertyName: string | null): string {
    return propertyName === null
      ? "Invalid params value."
      : `Invalid param value for "${propertyName}".`;
  }

  public static parseResultType(
    type: Type<any>,
    value: any,
    propertyName: string | null = null
  ): any {
    if (type.isOptional) {
      if (value === null || value === undefined) {
        return null;
      }

      return this.parseResultType(type.originalType!, value, propertyName);
    }

    if (type.isArray) {
      if (!Array.isArray(value)) {
        throw new Error(this.getResultError(propertyName));
      }

      return value.map((tmpValue, i): any =>
        this.parseResultType(
          type.originalType!,
          tmpValue,
          `${propertyName ?? ""}[${i}]`
        )
      );
    }

    if (type.matcher !== null) {
      if (!type.matcher(value)) {
        throw new Error(this.getResultError(propertyName));
      }

      return value;
    }

    if (type.schema !== null) {
      if (value === null || typeof value !== "object") {
        throw new Error(this.getResultError(propertyName));
      }

      const schema = type.schema;
      const typename = type.typename;

      const resultValue: Record<any, any> = {};

      for (const key in schema) {
        const tmpType = schema[key];
        const tmpValue = value[key];

        const tmpPropertyName =
          propertyName !== null ? `${propertyName}.${key}` : key;

        resultValue[key] = this.parseResultType(
          tmpType,
          tmpValue,
          tmpPropertyName
        );
      }

      if (typename !== null) {
        resultValue.__typename__ = typename;
      }

      return resultValue;
    }
  }

  public static parseResult(type: Type<any> | null, value: any): any {
    if (type === null) {
      if (value !== undefined && value !== null) {
        throw new Error(this.getResultError(null));
      }

      return null;
    }

    return this.parseResultType(type, value);
  }

  private static getResultError(propertyName: string | null): string {
    return (
      "Invalid result value" +
      (propertyName !== null ? ` for "${propertyName}".` : ".")
    );
  }

  public static String = Type.match<string>(
    (value) => typeof value === "string"
  );

  public static Boolean = Type.match<boolean>(
    (value) => typeof value === "boolean"
  );

  public static Number = Type.match<number>(
    (value) => typeof value === "number"
  );

  public static Integer = Type.match<number>(
    (value) => typeof value === "number" && Number.isInteger(value)
  );

  public static Float = Type.match<number>(
    (value) => typeof value === "number" && !Number.isInteger(value)
  );

  public static Date = Type.match<Date>(
    (value) => value instanceof Date && !isNaN(value.getTime())
  );

  public static Upload = Type.match<Upload>((value) => value instanceof Upload);
}
