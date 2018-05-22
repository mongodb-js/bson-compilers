/* eslint complexity: 0 */
const { doubleQuoteStringify } = require('../../helper/format');

module.exports = (superclass) => class ExtendedVisitor extends superclass {
  constructor() {
    super();
    this.new = 'new ';
    this.regexFlags = {
      i: 'i',  // ignore case
      m: 'm',  // multiline
      u: '', // unicode
      y: '',   // sticky search
      g: ''    // global
    };
    this.bsonRegexFlags = {
      'i': 'i', // Case insensitivity to match
      'm': 'm', // Multiline match
      'x': 'x', // Ignore all white space characters
      's': 's', // Matches all
      'l': '', // Case-insensitive matching dependent on the current locale?
      'u': '' // Unicode?
    };
  }

  /**
   * @param {NewExpressionContextObject} ctx
   *
   * @returns {string} - visited expression
   */
  emitNew(ctx) {
    const expr = this.visit(ctx.singleExpression());
    ctx.type = ctx.singleExpression().type;

    return expr;
  }

  /**
   * Symbol is just used a string in c#
   *
   * @param {ctxObject} ctx
   *
   * @returns {string} - value
   */
  emitSymbol(ctx) {
    ctx.type = this.Types.Symbol;
    const args = ctx.arguments().argumentList().singleExpression();
    const expr = args[0].getText();

    return doubleQuoteStringify(expr.toString());
  }

  /**
   * Long should just be the number + letter 'L'
   *
   * @param {ctxObject} ctx
   *
   * @returns {string} - valueL
   */
  emitLong(ctx, longstr) {
    ctx.type = this.Types.Long;

    return `${longstr}L`;
  }

  /**
   * Double can be expressed with an extra decimal point
   *
   * @param {ctxObject} ctx
   *
   * @returns {string} - valueL
   */
  emitDouble(ctx) {
    ctx.type = this.Types.Double;
    const args = ctx.arguments().argumentList().singleExpression();
    let text = args[0].getText();
    if (text.indexOf('\'') === 0 || text.indexOf('"') === 0) {
      text = text.replace(/['"]+/g, '');
    }

    return Math.round(parseInt(text, 10)).toFixed(1);
  }

  /**
   * all of the .NET langs have implicit conversion, so we just need to
   * parseInt and return the number for Int32
   *
   * @param {ctxObject} ctx
   *
   * @returns {string} - value
   */
  emitInt32(ctx) {
    ctx.type = this.Types.Int32;
    const args = ctx.arguments().argumentList().singleExpression();
    let text = args[0].getText();
    if (text.indexOf('\'') === 0 || text.indexOf('"') === 0) {
      text = text.replace(/['"]+/g, '');
    }
    const expr = parseInt(text, 10);

    return `${expr}`;
  }

  /**
   * Number doesn't need a new keyword, so need to handle via emit
   *
   * @param {ctxObject} ctx
   *
   * @returns {string} - (int)value
   */
  emitNumber(ctx) {
    ctx.type = this.Types.Number;
    const args = ctx.arguments().argumentList().singleExpression();
    const expr = args[0].getText().replace(/['"]+/g, '');
    return `(int)${expr}`;
  }

  /**
   * Special case because need to parse decimal.
   *
   * @param {FuncCallExpressionContext} ctx
   * @param {String} decimal
   * @returns {string} - new Decimal128(val)
   */
  emitDecimal128(ctx, decimal) {
    const value = parseInt(decimal.toString(), 10);

    return `new Decimal128(${value})`;
  }

  /**
   * BSON MinKey Constructor
   * needs to be in emit, since does not need a 'new' keyword
   *
   * @param {BSONMinKeyObject} ctx
   *
   * @returns {string} - BsonMinKey.Value
   */
  emitMinKey(ctx) {
    ctx.type = this.Types.MinKey;

    return 'BsonMinKey.Value';
  }

  /**
   * BSON MaxKey Constructor
   * needs to be in emit, since does not need a 'new' keyword
   *
   * @param {ctxObject} ctx
   *
   * @returns {string} - BsonMaxKey.Value
   */
  emitMaxKey(ctx) {
    ctx.type = this.Types.MaxKey;

    return 'BsonMaxKey.Value';
  }

  /**
   * Special cased because different target languages need different info out
   * of the constructed date.
   *
   * child nodes: arguments
   * grandchild nodes: argumentList?
   * great-grandchild nodes: singleExpression+
   *
   * @param {FuncCallExpressionContext} ctx
   * @param {Date} date
   * @return {String}
   */
  emitDate(ctx, date) {
    let toStr = '';
    ctx.type = this.Types.Date;

    // we need to return a string if just the Date() gets called
    if (!ctx.wasNew && this.visit(ctx.singleExpression()) !== 'ISODate') {
      ctx.type = this.Types._string;
      toStr = '.ToString()';
    }

    // it's just the now time if there are no args
    if (date === undefined) {
      return `DateTime.Now${toStr}`;
    }

    const dateStr = [
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    ].join(', ');

    return `new DateTime(${dateStr})${toStr}`;
  }

  /**
   * Date Now. This doesn't need a keyword 'new', nor is 'Now' a callable
   * function, so we need to adjust this.
   *
   * @param {DateNowConstructorObject} ctx
   *
   * @returns {string} - DateTime.Now
   */

  emitnow(ctx) {
    ctx.type = this.Types.Now;
    return 'DateTime.Now';
  }
};
