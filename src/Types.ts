import {
  Type,
  TypeSchema,
  TypeInternal,
  TypeInternalSchema,
  ConstType,
} from "typebad";

import { Upload } from "./Upload";

export class Types {
  public static document<S extends TypeSchema>(
    typename: string,
    schema: S,
  ): Type<TypeInternalSchema<S>> {
    return Type.object({
      ...schema,
      __typename__: Type.value(typename),
    });
  }

  public static pagination<T extends Type<any>>(
    type: T,
  ): Type<{
    nodes: TypeInternal<T>[];
    hasNextPage: boolean;
    nextPageCursor: string | null;
  }> {
    return Type.object({
      nodes: Type.array(type),
      hasNextPage: Type.Boolean,
      nextPageCursor: Type.String.nullable(),
      __typename__: Type.value("__pagination__"),
    });
  }

  public static Upload: Type<ConstType<Upload>> = Type.match<ConstType<Upload>>(
    (value): boolean => value instanceof Upload,
  );
}
