const busboy = require("busboy");

const TypeHelper = require("../Helpers/TypeHelper");
const ErrorHelper = require("../Helpers/ErrorHelper");

const Upload = require("../Upload");

const ContextReducer = require("../ContextReducer");

module.exports = (server) => async (request, response) => {
  const tmpResponse = { data: null, error: null };

  const write = () => {
    response.write(JSON.stringify(tmpResponse));

    response.end();
  };

  // response head

  response.statusCode = 200;

  response.setHeader("Allow", "OPTIONS, POST");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "*");
  response.setHeader("Content-Type", "application/json");

  const { method, headers } = request;

  const isOptions = method === "OPTIONS";
  const isPost = method === "POST";

  const { "content-type": contentType = "text/plain" } = headers;

  if (!isOptions && !isPost) {
    response.statusCode = 405;

    write();

    return;
  }

  let context = null;

  const contextReducer = new ContextReducer(server, { request, headers });

  try {
    context = await contextReducer.getContext();

    const middlewares = server.getMiddlewares();
    const requestMiddlewares = server.getRequestMiddlewares();

    for (const middleware of middlewares) {
      await middleware({ request, headers, context });
    }

    for (const requestMiddleware of requestMiddlewares) {
      await requestMiddleware({ request, response, headers, context });
    }
  } catch (error) {
    tmpResponse.error = ErrorHelper.parseError(error);
  }

  if (tmpResponse.error !== null) {
    write();

    return;
  }

  if (isOptions) {
    write();

    return;
  }

  if (!/^multipart\/form-data/.test(contentType)) {
    response.statusCode = 406;

    write();

    return;
  }

  try {
    const bb = busboy({ headers });

    const fields = new Map();
    const uploads = new Map();

    bb.on("field", (key, value) => {
      fields.set(key, value);
    });

    bb.on("file", (key, file, info) => {
      const { filename, encoding, mimeType } = info;

      const buffers = [];

      file.on("data", (data) => buffers.push(data));

      file.on("close", () => {
        const buffer = Buffer.concat(buffers);

        const upload = new Upload(buffer, filename, encoding, mimeType);

        uploads.set(key, upload);
      });
    });

    bb.on("finish", async () => {
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

        const endpoints = TypeHelper.parseUploads(json, uploads);

        tmpResponse.data = {};

        const names = Object.keys(endpoints);

        // execute all requests at the same time

        await Promise.all(
          names.map(async (name) => {
            try {
              if (!server.hasRequest(name)) {
                throw new Error("Request endpoint not found.");
              }

              const params = endpoints[name];

              const tmpRequest = server.getRequest(name);

              const paramsSchema = tmpRequest.getParams();
              const resultType = tmpRequest.getResult();
              const resolver = tmpRequest.getResolver();

              TypeHelper.parseParams(params, paramsSchema, server);

              const result = await resolver({
                request,
                response,
                headers,
                context,
                params,
              });

              const data = TypeHelper.parseResult(result, resultType, server);

              tmpResponse.data[name] = { data, error: null };
            } catch (error) {
              tmpResponse.data[name] = {
                data: null,
                error: ErrorHelper.parseError(error),
              };
            }
          })
        );
      } catch (error) {
        tmpResponse.error = ErrorHelper.parseError(error);
      } finally {
        write();
      }
    });

    bb.on("error", () => {
      try {
        throw new Error("Malformed request body.");
      } catch (error) {
        tmpResponse.error = ErrorHelper.parseError(error);
      } finally {
        write();
      }
    });

    request.pipe(bb);
  } catch (error) {
    try {
      throw new Error("Invalid request content.");
    } catch (error) {
      tmpResponse.error = ErrorHelper.parseError(error);
    } finally {
      write();
    }
  }
};
