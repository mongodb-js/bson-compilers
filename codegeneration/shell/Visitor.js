/* eslint complexity: 0 */
const JavascriptVisitor = require('../javascript/Visitor');
const bson = require('bson');
const Context = require('context-eval');
// const { } = require('../../helper/error');

/**
 * This is a Visitor superclass where helper methods used by all language
 * generators can be defined.
 *
 * @returns {object}
 */
class Visitor extends JavascriptVisitor {
  constructor() {
    super();
    this.new = '';
  }

  /**
   * New in the shell is the same as calling without arguments.
   * @param {NewExpressionContext} ctx
   * @return {String}
   */
  visitNewExpression(ctx) {
    ctx.singleExpression().wasNew = true;
    if (!('arguments' in ctx.singleExpression())) {
      ctx.arguments = () => { return { argumentList: () => { return false; }}; };
      ctx.type = ctx.singleExpression().type;
      ctx.getText = () => { return `${ctx.singleExpression().getText()}`; };
      return this.visitFuncCallExpression(ctx);
    }
    if ('emitNew' in this) {
      return this.emitNew(ctx);
    }
    return this.visitChildren(ctx);
  }

  executeJavascript(input) {
    const sandbox = {
      RegExp: RegExp,
      DBRef: bson.DBRef,
      Map: bson.Map,
      MaxKey: bson.MaxKey,
      MinKey: bson.MinKey,
      ObjectId: bson.ObjectID,
      Symbol: bson.Symbol,
      Timestamp: bson.Timestamp,
      Code: function(c, s) {
        return new bson.Code(c, s);
      },
      NumberDecimal: function(s) {
        if (s === undefined) {
          s = '0';
        }
        return bson.Decimal128.fromString(s.toString());
      },
      NumberInt: function(s) {
        return parseInt(s, 10);
      },
      NumberLong: function(v) {
        if (v === undefined) {
          v = 0;
        }
        return bson.Long.fromNumber(v);
      },
      ISODate: function(s) {
        return new Date(s);
      },
      Date: function(s) {
        const args = Array.from(arguments);

        if (args.length === 1) {
          return new Date(s);
        }

        return new Date(Date.UTC(...args));
      },
      Buffer: Buffer,
      __result: {}
    };
    const ctx = new Context(sandbox);
    const res = ctx.evaluate('__result = ' + input);
    ctx.destroy();
    return res;
  }
}

module.exports = Visitor;
