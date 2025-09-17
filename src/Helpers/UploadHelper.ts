import { Upload } from "../Upload";

export class UploadHelper {
  private static parseValue(value: any, uploads: Map<string, Upload>): any {
    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((tmpValue): any => this.parseValue(tmpValue, uploads));
    }

    if (typeof value === "object") {
      // check if object is like { __upload__: 0 }

      const keys = Object.keys(value);

      if (
        keys.length === 1 &&
        keys[0] === "__upload__" &&
        typeof value.__upload__ === "number"
      ) {
        const uploadKey = `${value.__upload__}`;

        if (uploads.has(uploadKey)) {
          return uploads.get(uploadKey);
        }
      }

      // regular object

      const tmpValue: Record<string, any> = {};

      for (const key in value) {
        tmpValue[key] = this.parseValue(value[key], uploads);
      }

      return tmpValue;
    }

    return value;
  }

  public static parseParams(
    params: Record<string, any> | null,
    uploads: Map<string, Upload>
  ): Record<string, any> | null {
    if (params === null) {
      return null;
    }

    const result: Record<string, any> = {};

    for (const key in params) {
      result[key] = this.parseValue(params[key], uploads);
    }

    return result;
  }
}
