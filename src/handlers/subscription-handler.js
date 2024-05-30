const TypeHelper = require("../Helpers/TypeHelper");
const ErrorHelper = require("../Helpers/ErrorHelper");

const Socket = require("../Publisher/Socket");

const ContextReducer = require("../ContextReducer");

const defaultResult = {
  subscribe: async () => {},
  unsubscribe: async () => {},
};

module.exports = (server) => (connection, request) => {
  const publisher = server.getPublisher();

  const socket = new Socket();

  // replicate request headers

  const headers = {};

  const url = new URL(request.url, "http://localhost");

  url.searchParams.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const contextReducer = new ContextReducer(server, { request, headers });

  connection.on("message", async (data) => {
    let json = null;

    try {
      json = JSON.parse(data.toString());
    } catch (error) {
      return;
    }

    if (json === null || typeof json !== "object") {
      return;
    }

    const { subscriptionKey = null, endpoint = null } = json;

    if (subscriptionKey === null) {
      return;
    }

    try {
      const context = await contextReducer.getContext();

      const middlewares = server.getMiddlewares();
      const subscriptionMiddlewares = server.getSubscriptionMiddlewares();

      for (const middleware of middlewares) {
        await middleware({ request, headers, context });
      }

      for (const subscriptionMiddleware of subscriptionMiddlewares) {
        await subscriptionMiddleware({ request, connection, headers, context });
      }

      if (endpoint === null) {
        // unsubscribe

        if (!socket.hasSubscription(subscriptionKey)) {
          throw new Error(`Subscription "${subscriptionKey}" not found.`);
        }

        const subscription = socket.getSubscription(subscriptionKey);

        subscription.unsubscribe();

        return;
      }

      if (socket.hasSubscription(subscriptionKey)) {
        return;
      }

      if (endpoint === null || typeof endpoint !== "object") {
        throw new Error("Endpoint parameter is not an object.");
      }

      const keys = Object.keys(endpoint);

      if (keys.length !== 1) {
        throw new Error("Endpoint parameter must have one element.");
      }

      const subscription = socket.createSubscription(subscriptionKey);

      const name = keys[0];

      try {
        if (!server.hasSubscription(name)) {
          throw new Error("Subscription endpoint not found.");
        }

        const params = endpoint[name];

        const tmpSubscription = server.getSubscription(name);

        const paramsSchema = tmpSubscription.getParams();
        const resultType = tmpSubscription.getResult();
        const resolver = tmpSubscription.getResolver();

        TypeHelper.parseParams(params, paramsSchema, server);

        const result = await resolver({
          request,
          connection,
          headers,
          context,
          params,
        });

        // use defaultResult if necessary

        const {
          subscribe = defaultResult.subscribe,
          unsubscribe = defaultResult.unsubscribe,
        } = result !== undefined ? result : defaultResult;

        let roomKeys = await subscribe();

        // cast to array

        if (roomKeys === undefined || roomKeys === null) {
          roomKeys = [];
        } else if (!Array.isArray(roomKeys)) {
          roomKeys = [roomKeys];
        }

        // client will handle this message as a "success" event

        connection.send(
          JSON.stringify({
            subscriptionKey,
            response: { data: null, error: null },
          })
        );

        // subscription can subscribe to multiple rooms

        const rooms = roomKeys.map((key) =>
          publisher.createRoom(key, (data) => {
            try {
              const json = TypeHelper.parseResult(data, resultType, server);

              connection.send(
                JSON.stringify({
                  subscriptionKey,
                  response: {
                    data: { [name]: { data: json, error: null } },
                    error: null,
                  },
                })
              );
            } catch (error) {
              connection.send(
                JSON.stringify({
                  subscriptionKey,
                  response: {
                    data: {
                      [name]: {
                        data: null,
                        error: ErrorHelper.parseError(error),
                      },
                    },
                    error: null,
                  },
                })
              );
            }
          })
        );

        subscription.subscribe(rooms, unsubscribe);
      } catch (error) {
        connection.send(
          JSON.stringify({
            subscriptionKey,
            response: {
              data: {
                [name]: { data: null, error: ErrorHelper.parseError(error) },
              },
              error: null,
            },
          })
        );
      }
    } catch (error) {
      connection.send(
        JSON.stringify({
          subscriptionKey,
          response: { data: null, error: ErrorHelper.parseError(error) },
        })
      );
    }
  });

  // unsubscribe to all

  connection.on("close", () => socket.unsubscribe());
};
