const Error = require("../Error");

class ErrorHelper {
  static parseError(error) {
    return {
      code: error instanceof Error ? error.code : null,
      message: error.message,
    };
  }
}

module.exports = ErrorHelper;
