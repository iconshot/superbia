const busboy = require("busboy");

const TypeHelper = require("../Helpers/TypeHelper");
const ErrorHelper = require("../Helpers/ErrorHelper");

const Upload = require("../Upload");

const ContextWrapper = require("../ContextWrapper");

module.exports = (server) => async (req, res) => {
  const response = { data: null, error: null };

  const write = () => {
    res.write(JSON.stringify(response));

    res.end();
  };

  // response head

  res.statusCode = 200;

  res.setHeader("Allow", "OPTIONS, POST");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");

  const { headers, method } = req;

  const isOptions = method === "OPTIONS";
  const isPost = method === "POST";

  if (!isOptions && !isPost) {
    res.statusCode = 405;

    write();

    return;
  }

  try {
    const middlewares = server.getMiddlewares();
    const requestMiddlewares = server.getRequestMiddlewares();

    for (const middleware of middlewares) {
      await middleware({ req, headers });
    }

    for (const requestMiddleware of requestMiddlewares) {
      await requestMiddleware({ req, res, headers });
    }
  } catch (error) {
    response.error = ErrorHelper.parseError(error);
  }

  if (isOptions) {
    write();

    return;
  }

  if (response.error !== null) {
    write();

    return;
  }

  const bb = busboy({ headers });

  const fields = new Map();
  const uploads = new Map();

  bb.on("field", (key, value) => {
    fields.set(key, value);
  });

  bb.on("file", (key, file, info) => {
    const { filename, encoding, mimeType } = info;

    const buffers = [];
    let size = 0;

    file.on("data", (data) => {
      buffers.push(data);

      size += data.length;
    });

    file.on("close", () => {
      const buffer = Buffer.concat(buffers, size);

      uploads.set(key, new Upload(buffer, filename, encoding, mimeType, size));
    });
  });

  bb.on("close", async () => {
    try {
      if (!fields.has("endpoints")) {
        throw new Error("Endpoints parameter not found in request body.");
      }

      const json = JSON.parse(fields.get("endpoints"));

      if (json === null || typeof json !== "object") {
        throw new Error("Endpoints parameter is not an object.");
      }

      const keys = Object.keys(json);

      if (keys.length === 0) {
        throw new Error("Endpoints parameter must not be an empty object.");
      }

      const contextClosure = server.getContext();

      const contextWrapper = new ContextWrapper(contextClosure, req, headers);

      const context = await contextWrapper.getContext();

      const endpoints = TypeHelper.parseUploads(json, uploads);

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

            const result = await resolver({ req, headers, params, context });

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

    write();
  });

  req.pipe(bb);
};
