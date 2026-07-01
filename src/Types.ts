import {
  Type,
  TypeObject,
  TypeInternal,
  TypeInternalObject,
  ConstType,
} from "typebad";

import { Upload } from "./Upload";

export class Types {
  public static document<O extends TypeObject>(
    typename: string,
    object: O,
  ): Type<TypeInternalObject<O>> {
    return Type.object({
      ...object,
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
