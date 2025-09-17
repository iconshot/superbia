export class ErrorWithCode extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}
