import { ErrorWithCode } from "../ErrorWithCode";

export interface ResponseError {
  code: number | null;
  message: string;
}

export class ErrorHelper {
  public static parseError(error: any): ResponseError {
    return {
      code: error instanceof ErrorWithCode ? error.code : null,
      message: error instanceof Error ? error.message : `${error}`,
    };
  }
}
