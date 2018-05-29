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
   * @param {FuncCallExpressionContext} ctx
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
   * @param {FuncCallExpressionContext} ctx
   * @param {str} str - processed str from the visitor
   *
   * @returns {string} - valueL
   */
  emitLong(ctx, str) {
    return `${str}L`;
  }

  /**
   * Double can be expressed with an extra decimal point, so run a Math.round.
   * If passed in as a string, convert it instead.
   *
   * @param {FuncCallExpressionContext} ctx
   * @param {type} type - number type object
   *
   * @returns {string} - valueL
   */
  emitDouble(ctx, type) {
    const args = ctx.arguments().argumentList().singleExpression();
    const text = args[0].getText();

    if (type.id === '_hex') {
      return `Convert.ToDouble(${text})`;
    }
    if (type.id === '_string') {
      return `Convert.ToDouble(${doubleQuoteStringify(text)})`;
    }

    if (type.id === '_decimal') {
      return text;
    }

    return Math.round(text).toFixed(1);
  }

  /**
   * Int32 is just a number. However, if passed in as a string, will need to
   * convert
   *
   * @param {FuncCallExpressionContext} ctx
   * @param {type} type - number type object
   *
   * @returns {string} - value
   */
  emitInt32(ctx, type) {
    const args = ctx.arguments().argumentList().singleExpression();
    const text = args[0].getText();

    if (type.id === '_hex' || type.id === '_decimal') {
      return `Convert.ToInt32(${text})`;
    }

    if (type.id === '_string') {
      return `Convert.ToInt32(${doubleQuoteStringify(text)})`;
    }

    return `${text}`;
  }

  /**
   * Number doesn't need a new keyword, so need to handle via emit. Depending
   * on whether it's passed in as a string, we will need to parse
   *
   * @param {FuncCallExpressionContext} ctx
   * @param {type} type - number type object
   *
   * @returns {string} - (int)value
   */
  emitNumber(ctx, type) {
    const args = ctx.arguments().argumentList().singleExpression();
    const text = args[0].getText();

    if (type.id === '_string') {
      return `int.Parse(${doubleQuoteStringify(text)})`;
    }

    return `(int)${text}`;
  }

  /**
   * We don't need `new` since we are always using a .Parse
   *
   * @param {FuncCallExpressionContext} ctx
   * @param {String} decimal
   *
   * @returns {string} - Decimal128.Parse(val)
   */
  emitDecimal128(ctx, decimal) {
    // decimal is always a number here, and looks something like this:
    // 5.3E-6175, so let's convert into into base10
    const expr = parseInt(decimal.toString(), 10);

    return `Decimal128.Parse(${doubleQuoteStringify(expr.toString())})`;
  }

  /**
   * BSON MinKey Constructor
   * needs to be in emit, since does not need a 'new' keyword
   *
   * @param {FuncCallExpressionContext} ctx
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
   * @param {FuncCallExpressionContext} ctx
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
   * @param {FuncCallExpressionContext} ctx
   *
   * @returns {string} - DateTime.Now
   */

  emitnow(ctx) {
    ctx.type = this.Types.Now;
    return 'DateTime.Now';
  }
};
