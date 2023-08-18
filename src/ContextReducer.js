class ContextReducer {
  constructor(server, { request, headers }) {
    this.done = false;

    this.context = null;

    this.error = null;

    this.promises = [];

    this.reduce(server, { request, headers });
  }

  /*
  
  multiple calls to getContext() will get the object stored
  in this.context or wait for the reducing to finish if necessary

  */

  getContext() {
    if (this.done) {
      if (this.error === null) {
        return this.context;
      } else {
        throw this.error;
      }
    }

    return new Promise((resolve, reject) => {
      this.promises.push({ resolve, reject });
    });
  }

  async reduce(server, { request, headers }) {
    try {
      let context = {};

      const contexts = server.getContexts();

      for (const closure of contexts) {
        const result = await closure({ request, headers, context });

        context = { ...context, ...result };
      }

      this.context = context;

      this.promises.forEach(({ resolve }) => resolve(this.context));
    } catch (error) {
      this.error = error;

      this.promises.forEach(({ reject }) => reject(this.error));
    } finally {
      this.done = true;

      this.promises = [];
    }
  }
}

module.exports = ContextReducer;
