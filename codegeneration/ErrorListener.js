const antlr4 = require('antlr4');

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
 * @param {object} rec Recognizer - the parsing support code essentially. Most of it is error recovery stuff
 * @param {object} sym Offending symbol
 * @param {int} line Line
 * @param {int} col Char position in line
 * @param {string} msg Error message
 * @param {string} e Recognition exception
 */
ErrorListener.prototype.syntaxError = function(rec, sym, line, col, msg, e) {
  this.errors.push({line, col, msg, e});
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
