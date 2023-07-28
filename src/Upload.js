const path = require("path");

const fse = require("fs-extra");

class Upload {
  constructor(file) {
    this.file = file;
  }

  getName() {
    return this.file.name;
  }

  getMimetype() {
    return this.file.mimetype;
  }

  getBuffer() {
    return this.file.data;
  }

  getSize() {
    return this.file.size;
  }

  getMd5() {
    return this.file.md5;
  }

  async save(file) {
    const dir = path.dirname(file);

    await fse.ensureDir(dir);

    return await this.file.mv(file);
  }
}

module.exports = Upload;
