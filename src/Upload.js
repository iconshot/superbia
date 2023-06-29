const path = require("path");

const fse = require("fs-extra");

class Upload {
  constructor(file) {
    this.file = file;
  }

  getFile() {
    return this.file;
  }

  async save(file) {
    const dir = path.dirname(file);

    await fse.ensureDir(dir);

    return await this.file.mv(file);
  }
}

module.exports = Upload;
