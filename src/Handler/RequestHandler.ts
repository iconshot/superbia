import http from "node:http";

import busboy from "busboy";

import { ErrorHelper, ResponseError } from "../Helpers/ErrorHelper";
import { UploadHelper } from "../Helpers/UploadHelper";

import { ContextManager, ContextRecord } from "../Context/ContextManager";
import { ContextGenerator } from "../Context/ContextGenerator";

import { Server } from "../Server";
import { Upload } from "../Upload";
import { Type } from "../Type";

export class RequestHandler {
  private data: {
    result: Record<string, { result: any; error: ResponseError | null }> | null;
    error: ResponseError | null;
  } = { result: null, error: null };

  constructor(
    private server: Server<ContextManager<ContextRecord> | undefined>,
    private request: http.IncomingMessage,
    private response: http.ServerResponse
  ) {}

  public init(): void {
    const { method, headers } = this.request;

    const isPost = method === "POST";
    const isOptions = method === "OPTIONS";

    const { "content-type": contentType = "text/plain" } = headers;

    this.response.statusCode = 200;

    if (isOptions) {
      this.response.setHeader("Access-Control-Allow-Origin", "*");
      this.response.setHeader("Access-Control-Allow-Headers", "*");
      this.response.setHeader("Access-Control-Allow-Methods", "POST");
      this.response.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

      this.response.end();

      return;
    }

    this.response.setHeader("Access-Control-Allow-Origin", "*");
    this.response.setHeader("Content-Type", "application/json");

    if (!isPost) {
      this.endError(new Error('Only "POST" requests are allowed.'));

      return;
    }

    if (!/^multipart\/form-data/.test(contentType)) {
      this.endError(new Error('Content type is not "multipart/form-data".'));

      return;
    }

    try {
      const bb = busboy({ headers });

      const fields: Map<string, string> = new Map();
      const uploads: Map<string, Upload> = new Map();

      bb.on("field", (key, value): void => {
        fields.set(key, value);
      });

      bb.on("file", (key, file, info): void => {
        const { filename, encoding, mimeType } = info;

        const buffers: any[] = [];

        file.on("data", (data): void => {
          buffers.push(data);
        });

        file.on("close", (): void => {
          const buffer = Buffer.concat(buffers);

          const upload = new Upload(buffer, filename, encoding, mimeType);

          uploads.set(key, upload);
        });
      });

      bb.on("finish", async (): Promise<void> => {
        if (!fields.has("endpoints")) {
          this.endError(
            new Error("Endpoints field not found in request body.")
          );

          return;
        }

        const endpointsObject = JSON.parse(fields.get("endpoints")!);

        if (endpointsObject === null || typeof endpointsObject !== "object") {
          this.endError(new Error("Endpoints field is not an object."));

          return;
        }

        const endpointNames = Object.keys(endpointsObject);

        if (endpointNames.length === 0) {
          this.endError(new Error("Endpoints field is an empty object."));

          return;
        }

        let context: ContextRecord | null = null;

        const contextManager = this.server.getContextManager();

        if (contextManager !== undefined) {
          const contextGenerator = new ContextGenerator(
            contextManager,
            this.request,
            headers
          );

          try {
            context = await contextGenerator.getContext();
          } catch (error) {
            this.endError(error);

            return;
          }
        }

        this.data.result = {};

        const result = this.data.result;

        for (const endpointName of endpointNames) {
          result[endpointName] = { result: null, error: null };
        }

        // execute all requests in parallel

        const promises = endpointNames.map(
          async (endpointName): Promise<void> => {
            const endpointResult = result[endpointName];

            try {
              if (!this.server.hasRequest(endpointName)) {
                throw new Error("Request endpoint not found.");
              }

              const params = endpointsObject[endpointName];

              if (params !== null && typeof params !== "object") {
                throw new Error("Invalid params value.");
              }

              const requestEndpoint = this.server.getRequest(endpointName)!;

              const resolver = requestEndpoint.getResolver();

              if (resolver === null) {
                throw new Error("Resolver not set.");
              }

              const parsedParams = UploadHelper.parseParams(params, uploads);

              Type.checkParams(requestEndpoint.getParams(), parsedParams);

              let value: any = null;

              value = await resolver({
                request: this.request,
                headers,
                context,
                params: parsedParams,
              });

              const parsedValue = Type.parseResult(
                requestEndpoint.getResult(),
                value
              );

              endpointResult.result = parsedValue;
            } catch (error) {
              endpointResult.error = ErrorHelper.parseError(error);
            }
          }
        );

        await Promise.all(promises);

        this.end();
      });

      bb.on("error", (): void => {
        this.endError(new Error("Malformed request."));
      });

      this.request.pipe(bb);
    } catch (error) {
      this.endError(new Error("Invalid request."));
    }
  }

  private end(): void {
    const json = JSON.stringify(this.data);

    this.response.write(json);

    this.response.end();
  }

  private endError(error: any) {
    this.data.error = ErrorHelper.parseError(error);

    this.end();
  }

  public static wrapListener(
    server: Server<ContextManager<ContextRecord> | undefined>
  ): http.RequestListener {
    return async (
      request: http.IncomingMessage,
      response: http.ServerResponse
    ): Promise<void> => {
      const requestHandler = new RequestHandler(server, request, response);

      requestHandler.init();
    };
  }
}
