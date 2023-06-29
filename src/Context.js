class Context {
  /*
  
  data will be loaded on constructor

  multiple calls to getData() will get the data stored in this.data
  or await the load to finish if necessary

  */

  constructor(getContext, headers, req) {
    this.loaded = false;

    this.data = null;
    this.error = null;

    this.promises = [];

    this.load(getContext, headers, req);
  }

  // returns a Promise if the data is not loaded yet

  getData() {
    if (this.loaded) {
      if (this.error === null) {
        return this.data;
      } else {
        throw this.error;
      }
    }

    return new Promise((resolve, reject) => {
      this.promises.push({ resolve, reject });
    });
  }

  async load(getContext, headers, req) {
    try {
      if (getContext !== null) {
        this.data = await getContext(headers, req);
      }

      this.promises.forEach(({ resolve }) => resolve(this.data));
    } catch (error) {
      this.error = error;

      this.promises.forEach(({ reject }) => reject(this.error));
    } finally {
      this.loaded = true;

      this.promises = [];
    }
  }
}

module.exports = Context;
