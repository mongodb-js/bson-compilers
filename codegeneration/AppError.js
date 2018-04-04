/**
 * Custom Application Error
 *
 * @returns {object}
 */
class AppError extends Error {
  constructor(payload) {
    super(payload);

    this.code = payload.code;
    this.payload = payload;
    this.message = payload.message;

    if (typeof this.payload.payload !== 'undefined') {
      this.payload = this.payload.payload;
    }
  }
}

module.exports = AppError;
