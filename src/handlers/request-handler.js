const TypeHelper = require("../Helpers/TypeHelper");
const ErrorHelper = require("../Helpers/ErrorHelper");

const Upload = require("../Upload");
const Context = require("../Context");

// find uploads

function parseUpload(value, files) {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((tmpValue) => parseUpload(tmpValue, files));
  }

  if (typeof value === "object") {
    const { uploadKey = null } = value;

    if (
      Object.keys(value).length === 1 &&
      uploadKey !== null &&
      uploadKey in files
    ) {
      return new Upload(files[uploadKey]);
    }

    const tmpValue = {};

    for (const key in value) {
      tmpValue[key] = parseUpload(value[key], files);
    }

    return tmpValue;
  }

  return value;
}

module.exports = (server) => async (req, res) => {
  const response = { data: null, error: null };

  try {
    if (!("endpoints" in req.body)) {
      throw new Error("Endpoints parameter not found in request body.");
    }

    const json = JSON.parse(req.body.endpoints);

    if (json === null || typeof json !== "object") {
      throw new Error("Endpoints parameter is not an object.");
    }

    const keys = Object.keys(json);

    if (keys.length === 0) {
      throw new Error("Endpoints parameter must not be an empty object.");
    }

    const getContext = server.getContext();

    const headers = req.headers;

    const context = new Context(getContext, headers, req);

    const contextData = await context.getData();

    const endpoints = req.files !== null ? parseUpload(json, req.files) : json;

    response.data = {};

    const names = Object.keys(endpoints);

    // execute all requests at the same time

    await Promise.all(
      names.map(async (name) => {
        try {
          if (!server.hasRequest(name)) {
            throw new Error("Request endpoint not found.");
          }

          const params = endpoints[name];

          const request = server.getRequest(name);

          const paramsSchema = request.getParams();
          const resultType = request.getResult();
          const resolver = request.getResolver();

          TypeHelper.parseParams(params, paramsSchema, server);

          const result = await resolver(params, contextData);

          const data = TypeHelper.parseResult(result, resultType, server);

          response.data[name] = { data, error: null };
        } catch (error) {
          response.data[name] = {
            data: null,
            error: ErrorHelper.parseError(error),
          };
        }
      })
    );
  } catch (error) {
    response.error = ErrorHelper.parseError(error);
  }

  res.json(response);

  res.end();
};
