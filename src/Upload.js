const path = require("path");
const fs = require("fs");

const fse = require("fs-extra");

class Upload {
  constructor(buffer, name, encoding, mimeType, size) {
    this.buffer = buffer;
    this.name = name;
    this.encoding = encoding;
    this.mimeType = mimeType;
    this.size = size;
  }

  getBuffer() {
    return this.buffer;
  }

  getName() {
    return this.name;
  }

  getEncoding() {
    return this.encoding;
  }

  getMimeType() {
    return this.mimeType;
  }

  getSize() {
    return this.size;
  }

  async save(file) {
    const dir = path.dirname(file);

    await fse.ensureDir(dir);

    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(file);

      stream.on("error", (error) => reject(error));

      stream.on("close", resolve);

      stream.write(this.buffer);

      stream.end();
    });
  }
}

module.exports = Upload;
