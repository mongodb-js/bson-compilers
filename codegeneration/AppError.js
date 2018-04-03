class AppError extends Error {
  constructor(payload) {
    super(payload);

    this.code = payload.code;
    this.payload = payload;
    this.message = payload.message;

    if (typeof this.payload.payload !== 'undefined') {
      this.payload = this.payload.payload;
    }

    if (typeof this.payload.line !== 'undefined') {
      this.line = this.payload.line;
    }

    if (typeof this.payload.column !== 'undefined') {
      this.column = this.payload.column;
    }
  }
}

module.exports = AppError;
