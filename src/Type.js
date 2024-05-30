class Type {
  constructor(name, matcher, server) {
    this.name = name;
    this.matcher = matcher;
    this.server = server;
  }

  getMatcher() {
    return this.matcher;
  }

  setMatcher(matcher) {
    this.matcher = matcher;

    return this;
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;

    return this;
  }

  setPagination(boolean) {
    const name = `${this.name}Pagination`;

    if (boolean) {
      // add a new Pagination type

      this.server.setType(name, {
        nodes: `[${this.name}!]!`,
        hasNextPage: "Boolean!",
        nextPageCursor: "String",
      });
    } else {
      // delete the Pagination type

      this.server.deleteType(name);
    }

    return this;
  }
}

module.exports = Type;
