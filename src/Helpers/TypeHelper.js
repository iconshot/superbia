class TypeHelper {
  static parseUploads(value, uploads) {
    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((tmpValue) => this.parseUploads(tmpValue, uploads));
    }

    if (typeof value === "object") {
      // check if value is like { uploadKey: 1 }

      if (Object.keys(value).length === 1 && "uploadKey" in value) {
        const uploadKey = `${value.uploadKey}`;

        if (uploads.has(uploadKey)) {
          return uploads.get(uploadKey);
        }
      }

      const tmpValue = {};

      for (const key in value) {
        tmpValue[key] = this.parseUploads(value[key], uploads);
      }

      return tmpValue;
    }

    return value;
  }

  static parseTypes(server) {
    const types = server.getTypes();

    for (const [name, type] of [...types.entries()]) {
      const matcher = type.getMatcher();

      if (typeof matcher === "function") {
        continue;
      }

      if (Array.isArray(matcher)) {
        continue;
      }

      for (const key in matcher) {
        const value = matcher[key];

        const parts = this.checkType(value);

        if (parts === null) {
          throw new Error(
            `Type "${value}" used for type property "${name}.${key}" is not valid.`
          );
        }

        if (!server.hasType(parts.name)) {
          throw new Error(
            `Type "${value}" used for type property "${name}.${key}" was not found.`
          );
        }
      }
    }
  }

  static parseEndpoints(server, map, isRequest) {
    const endpointType = isRequest ? "request" : "subscription";

    for (const [name, endpoint] of [...map.entries()]) {
      const params = endpoint.getParams();
      const result = endpoint.getResult();

      if (params !== null) {
        for (const key in params) {
          const value = params[key];

          const parts = this.checkType(value);

          if (parts === null) {
            throw new Error(
              `Type "${value}" used in parameter "${key}" for ${endpointType} endpoint "${name}" is not valid.`
            );
          }

          if (!server.hasType(parts.name)) {
            throw new Error(
              `Type "${value}" used in parameter "${key}" for ${endpointType} endpoint "${name}" was not found.`
            );
          }
        }
      }

      if (result !== null) {
        const parts = this.checkType(result);

        if (parts === null) {
          throw new Error(
            `Type "${result}" used in result for ${endpointType} endpoint "${name} is not valid.`
          );
        }

        if (!server.hasType(parts.name)) {
          throw new Error(
            `Type "${result}" used in result for ${endpointType} endpoint "${name}" was not found.`
          );
        }
      }
    }
  }

  static parseRequests(server) {
    const requests = server.getRequests();

    this.parseEndpoints(server, requests, true);
  }

  static parseSubscriptions(server) {
    const subscriptions = server.getSubscriptions();

    this.parseEndpoints(server, subscriptions, false);
  }

  static parseParams(params, paramsSchema, server, prefixName = null) {
    if (paramsSchema === undefined || paramsSchema === null) {
      return;
    }

    for (const key in paramsSchema) {
      const value =
        params !== undefined && params !== null ? params[key] : undefined;

      const paramType = paramsSchema[key];

      const { isArray, isRequired, isArrayRequired, name } =
        this.checkType(paramType);

      const matcher = server.getType(name).getMatcher();

      const paramKey = `${prefixName !== null ? `${prefixName}.` : ""}${key}`;

      const parseValue = (value) => {
        if (typeof matcher === "function") {
          if (!matcher(value)) {
            throw new Error(
              `Parameter value for "${paramKey}" must be of type "${paramType}".`
            );
          }
        } else if (Array.isArray(matcher)) {
          if (!matcher.includes(value)) {
            throw new Error(
              `Parameter value for "${paramKey}" must be of type "${paramType}".`
            );
          }
        } else if (typeof matcher === "object") {
          if (typeof value !== "object") {
            throw new Error(
              `Parameter value for "${paramKey}" must be of type "${paramType}".`
            );
          }

          // recursion

          this.parseParams(value, matcher, server, name);
        }
      };

      if (isArray) {
        if (isArrayRequired) {
          if (value === undefined) {
            throw new Error(
              `Missing required parameter value for "${paramKey}", expected "${paramType}".`
            );
          }

          if (value === null) {
            throw new Error(
              `Null is not a valid parameter value for "${paramKey}", expected "${paramType}".`
            );
          }
        }

        if (value !== undefined && value !== null && !Array.isArray(value)) {
          throw new Error(
            `Parameter value for "${paramKey}" must be of type "${paramType}".`
          );
        }

        if (Array.isArray(value)) {
          for (const tmpValue of value) {
            if (isRequired) {
              if (tmpValue === undefined) {
                throw new Error(
                  `Parameter value for "${paramKey}" must be of type "${paramType}".`
                );
              }

              if (tmpValue === null) {
                throw new Error(
                  `Parameter value for "${paramKey}" must be of type "${paramType}".`
                );
              }
            }

            if (Array.isArray(tmpValue)) {
              throw new Error(
                `Parameter value for "${paramKey}" must be of type "${paramType}".`
              );
            }

            if (tmpValue !== undefined && tmpValue !== null) {
              parseValue(tmpValue);
            }
          }
        }
      } else {
        if (isRequired) {
          if (value === undefined) {
            throw new Error(
              `Missing required parameter value for "${paramKey}", expected "${paramType}".`
            );
          }

          if (value === null) {
            throw new Error(
              `Null is not a valid parameter value for "${paramKey}", expected "${paramType}".`
            );
          }
        }

        if (Array.isArray(value)) {
          throw new Error(
            `Parameter value for "${paramKey}" must be of type "${paramType}".`
          );
        }

        if (value !== undefined && value !== null) {
          parseValue(value);
        }
      }
    }
  }

  static parseResult(value, resultType, server, resultKey = null) {
    if (resultType === null) {
      if (value !== undefined && value !== null) {
        throw new Error(`Result value must be null or undefined.`);
      }

      return null;
    }

    let data = null;

    const { isArray, isRequired, isArrayRequired, name } =
      this.checkType(resultType);

    const matcher = server.getType(name).getMatcher();

    const parseValue = (value) => {
      let data = null;

      if (typeof matcher === "function") {
        if (!matcher(value)) {
          throw new Error(
            resultKey !== null
              ? `Result value for "${resultKey}" must be of type "${resultType}".`
              : `Result value must be of type "${resultType}".`
          );
        }

        data = value;
      } else if (Array.isArray(matcher)) {
        if (!matcher.includes(value)) {
          throw new Error(
            resultKey !== null
              ? `Result value for "${resultKey}" must be of type "${resultType}".`
              : `Result value must be of type "${resultType}".`
          );
        }

        data = value;
      } else if (typeof matcher === "object") {
        if (typeof value !== "object") {
          throw new Error(
            resultKey !== null
              ? `Result value for "${resultKey}" must be of type "${resultType}".`
              : `Result value must be of type "${resultType}".`
          );
        }

        data = {};

        data._typename = name;

        for (const key in matcher) {
          // recursion

          data[key] = this.parseResult(
            value[key],
            matcher[key],
            server,
            `${name}.${key}`
          );
        }
      }

      return data;
    };

    if (isArray) {
      if (isArrayRequired) {
        if (value === undefined) {
          throw new Error(
            resultKey !== null
              ? `Missing required result value for "${resultKey}", expected "${resultType}".`
              : `Missing required result value expected "${resultType}".`
          );
        }

        if (value === null) {
          throw new Error(
            resultKey !== null
              ? `Null is not a valid result value for "${resultKey}", expected "${resultType}".`
              : `Null is not a valid result value, expected "${resultType}".`
          );
        }
      }

      if (value !== undefined && value !== null && !Array.isArray(value)) {
        throw new Error(
          resultKey !== null
            ? `Result value for "${resultKey}" must be of type "${resultType}".`
            : `Result value must be of type "${resultType}".`
        );
      }

      if (Array.isArray(value)) {
        data = [];

        for (const tmpValue of value) {
          if (isRequired) {
            if (tmpValue === undefined) {
              throw new Error(
                resultKey !== null
                  ? `Result value for "${resultKey}" must be of type "${resultType}".`
                  : `Result value must be of type "${resultType}".`
              );
            }

            if (tmpValue === null) {
              throw new Error(
                resultKey !== null
                  ? `Result value for "${resultKey}" must be of type "${resultType}".`
                  : `Result value must be of type "${resultType}".`
              );
            }
          }

          if (Array.isArray(tmpValue)) {
            throw new Error(
              resultKey !== null
                ? `Result value for "${resultKey}" must be of type "${resultType}".`
                : `Result value must be of type "${resultType}".`
            );
          }

          if (tmpValue !== undefined && tmpValue !== null) {
            data.push(parseValue(tmpValue));
          } else {
            data.push(null);
          }
        }
      }
    } else {
      if (isRequired) {
        if (value === undefined) {
          throw new Error(
            resultKey !== null
              ? `Missing required result value for "${resultKey}", expected "${resultType}".`
              : `Missing required result value, expected "${resultType}".`
          );
        }

        if (value === null) {
          throw new Error(
            resultKey !== null
              ? `Null is not a valid result value for "${resultKey}", expected "${resultType}".`
              : `Null is not a valid result value, expected "${resultType}".`
          );
        }
      }

      if (Array.isArray(value)) {
        throw new Error(
          resultKey !== null
            ? `Result value for "${resultKey}" must be of type "${resultType}".`
            : `Result value must be of type "${resultType}".`
        );
      }

      if (value !== undefined && value !== null) {
        data = parseValue(value);
      } else {
        data = null;
      }
    }

    return data;
  }

  // separate parts from a string like "[Type!]", "Type!", etc

  static checkType(type) {
    const match = [...type.matchAll(/(\[)?([a-z]+)(\!)?(\])?(\!)?/gi)];

    const parts = match[0];

    const isArray = parts[1] !== undefined;

    if (isArray && parts[4] === undefined) {
      return null;
    }

    const isRequired = parts[3] !== undefined;
    const isArrayRequired = parts[5] !== undefined;

    const name = parts[2];

    return { name, isArray, isRequired, isArrayRequired };
  }
}

module.exports = TypeHelper;
