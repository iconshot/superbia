const path = require("path");

const fs = require("fs/promises");

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

    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(file, this.buffer);
  }
}

module.exports = Upload;
