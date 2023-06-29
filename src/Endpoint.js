class Endpoint {
  /*
  
  constructor(resolver)
  constructor(params, resolver)
  constructor(result, resolver)
  constructor(params, result, resolver)

  */

  constructor(...args) {
    let params = null;
    let result = null;
    let resolver = () => {};

    switch (args.length) {
      case 0: {
        break;
      }

      case 1: {
        resolver = args[0];

        break;
      }

      case 2: {
        if (args[0] === null || typeof args[0] === "object") {
          params = args[0];
        } else {
          result = args[0];
        }

        resolver = args[1];

        break;
      }

      default: {
        [params, result, resolver] = args;

        break;
      }
    }

    if (params !== null && typeof params !== "object") {
      throw new Error("Params argument must be null or an object.");
    }

    if (result !== null && typeof result !== "string") {
      throw new Error("Result type must be null or string.");
    }

    if (typeof resolver !== "function") {
      throw new Error("Resolver must be a function.");
    }

    this.params = params;
    this.result = result;
    this.resolver = resolver;
  }

  getParams() {
    return this.params;
  }

  getResult() {
    return this.result;
  }

  getResolver() {
    return this.resolver;
  }

  setParams(params) {
    if (params !== null && typeof params !== "object") {
      throw new Error("Params argument must be null or an object.");
    }

    this.params = params;

    return this;
  }

  setResult(result) {
    if (result !== null && typeof result !== "string") {
      throw new Error("Result type must be null or string.");
    }

    this.result = result;

    return this;
  }

  setResolver(resolver) {
    if (typeof resolver !== "function") {
      throw new Error("Resolver must be a function.");
    }

    this.resolver = resolver;

    return this;
  }
}

module.exports = Endpoint;
