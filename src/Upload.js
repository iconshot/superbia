const path = require("path");

const fsp = require("fs/promises");

class Upload {
  constructor(buffer, name, encoding, mimeType) {
    this.buffer = buffer;
    this.name = name;
    this.encoding = encoding;
    this.mimeType = mimeType;
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
    return this.buffer.length;
  }

  async save(file) {
    const dir = path.dirname(file);

    await fsp.mkdir(dir, { recursive: true });

    await fsp.writeFile(file, this.buffer);
  }
}

module.exports = Upload;
