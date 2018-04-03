const antlr4 = require('antlr4');
const AppError = require('./AppError.js');

/**
 * Custom Error Listener
 *
 * @returns {object}
 */
const ErrorListener = function() {
  antlr4.error.ErrorListener.call(this);
  this.errors = [];

  return this;
};

ErrorListener.prototype = Object.create(antlr4.error.ErrorListener.prototype);
ErrorListener.prototype.constructor = ErrorListener;

/**
 * Collects syntax error
 *
 * @param {object} recognizer The parsing support code essentially. Most of it is error recovery stuff
 * @param {object} symbol Offending symbol
 * @param {int} line Line
 * @param {int} column Char position in line
 * @param {string} message Error message
 * @param {string} e Recognition exception
 */
ErrorListener.prototype.syntaxError = function(
  recognizer,
  symbol,
  line,
  column,
  message
) {
  this.errors.push(new AppError({
    line,
    column,
    message,
    code: 'SYNTAX_ERROR'
  }));
};

/**
 * Checks if errors exist
 *
 * @returns {string}
 */
ErrorListener.prototype.hasErrors = function() {
  if (this.errors.length > 0) {
    return true;
  }

  return false;
};

/**
 * Returns error list
 *
 * @returns {string}
 */
ErrorListener.prototype.errors = function() {
  return this.errors;
};

module.exports = ErrorListener;
