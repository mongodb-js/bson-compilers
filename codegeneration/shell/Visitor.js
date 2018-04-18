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
   * Child nodes: literal
   * @param {LiteralExpressionContext} ctx
   * @return {String}
   */
  visitLiteralExpression(ctx) {
    ctx.type = this.getPrimitiveType(ctx.literal());

    if (`emit${ctx.type.id}` in this) {
      return this[`emit${ctx.type.id}`](ctx);
    }

    if (ctx.type.template) {
      return ctx.type.template(this.visitChildren(ctx));
    }

    return this.visitChildren(ctx);
  }

  /**
   * Get the type of a node. TODO: nicer way to write it?
   * @param {LiteralContext} ctx
   * @return {Symbol}
   */
  getPrimitiveType(ctx) {
    if ('NullLiteral' in ctx) {
      return this.Types._null;
    }
    if ('UndefinedLiteral' in ctx) {
      return this.Types._undefined;
    }
    if ('BooleanLiteral' in ctx) {
      return this.Types._bool;
    }
    if ('StringLiteral' in ctx) {
      return this.Types._string;
    }
    if ('RegularExpressionLiteral' in ctx) {
      return this.Types._regex;
    }
    if ('numericLiteral' in ctx) {
      const number = ctx.numericLiteral();
      if ('IntegerLiteral' in number) {
        return this.Types.Double;
      }
      if ('DecimalLiteral' in number) {
        return this.Types._decimal;
      }
      if ('HexIntegerLiteral' in number) {
        return this.Types._hex;
      }
      if ('OctalIntegerLiteral' in number) {
        return this.Types._octal;
      }
    }
    // TODO: or raise error?
    return this.Types._undefined;
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
