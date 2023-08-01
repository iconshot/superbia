class ContextWrapper {
  /*
  
  context will be loaded on constructor

  multiple calls to getContext() will get the object stored in this.context
  or wait for the loading to finish if necessary

  */

  constructor(closure, req, headers) {
    this.loaded = false;

    this.context = null;
    this.error = null;

    this.promises = [];

    this.load(closure, req, headers);
  }

  // returns a Promise if the context is not loaded yet

  getContext() {
    if (this.loaded) {
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

  async load(closure, req, headers) {
    try {
      if (closure !== null) {
        this.context = await closure({ req, headers });
      }

      this.promises.forEach(({ resolve }) => resolve(this.context));
    } catch (error) {
      this.error = error;

      this.promises.forEach(({ reject }) => reject(this.error));
    } finally {
      this.loaded = true;

      this.promises = [];
    }
  }
}

module.exports = ContextWrapper;
