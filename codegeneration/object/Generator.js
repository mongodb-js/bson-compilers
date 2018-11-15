/* eslint new-cap: 0 camelcase: 0 */
const bson = require('bson');
const {
  BsonTranspilersReferenceError
} = require('../../helper/error');

/*
 * Class for handling edge cases for shell code generation. Defines "emit" methods.
 */
module.exports = (Visitor) => class Generator extends Visitor {
  constructor() {
    super();
    this.IGNORE = 'a unique thing';
  }

  start(ctx) {
    return this.returnResult(ctx);
  }

  /**
   * Overrides the helper function to instantiate the object instead of
   * concatenating the strings.
   *
   * @param {ParserRuleContext} ctx - The function call node
   * @param {Object} lhsType - The type
   * @param {Array} args - Arguments to the template
   *
   * @return {String}
   */
  generateCall(ctx, lhsType, args) {
    if (`emit${lhsType.id}` in this) {
      return this[`emit${lhsType.id}`](ctx, ...args);
    }
    const lhs = this.visit(this.getFunctionCallName(ctx));
    // let rhs = lhsType.argsTemplate
    //   ? lhsType.argsTemplate(lhs, ...args)
    //   : args;
    //
    // if (rhs.length === 1 && rhs[0] === undefined) {
    //   rhs = [];
    // }
    return this.returnFunctionCallLhsRhs(lhs, args, lhsType);
  }

  /**
   * Don't concatenate child nodes, return them as array.
   *
   * @param {ParserRuleContext} ctx
   * @param {Object} options
   * @return {Array}
   */
  visitChildren(ctx, options) {
    const opts = {
      start: 0, step: 1, separator: '', ignore: [], children: ctx.children
    };
    Object.assign(opts, options ? options : {});
    opts.end = ('end' in opts) ? opts.end : opts.children.length - 1;

    const code = [];
    for (let i = opts.start; i <= opts.end; i += opts.step) {
      if (opts.ignore.indexOf(i) === -1) {
        code.push(this.visit(
          opts.children[i]
        ));
      }
    }
    const result = code.filter((c) => c !== this.IGNORE);
    if (result.length === 1) {
      return result[0];
    }
    return result;
  }

  returnFunctionCallRhs(rhs) {
    return rhs;
  }

  returnFunctionCallLhs(code, name) {
    const types = {
      100: bson.Code, 101: bson.ObjectId, 102: bson.Binary, 103: bson.DBRef,
      104: bson.Double, 105: bson.Int32, 106: bson.Long, 107: bson.MinKey,
      108: bson.MaxKey, 109: bson.BSONRegExp, 110: bson.Timestamp,
      111: bson.Symbol, 112: bson.Decimal128, 200: Date, 8: RegExp, 2: Number,
      10: Object
    };
    const result = types[code];
    if (result === undefined) {
      throw new BsonTranspilersReferenceError(`Cannot instantiate ${name} with code=${code}`);
    }
    return result;
  }

  returnFunctionCallLhsRhs(lhs, args, lhsType) {
    if (args.length === 1 && args[0] === undefined) {
      args = [];
    }

    if (lhsType && lhsType.argsTemplate) {
      return lhsType.argsTemplate(lhs, ...args);
    }

    let expr;
    try {
      expr = new lhs(...args);
    } catch (e) {
      if (e.message.includes('constructor')) {
        try {
          expr = lhs(...args);
        } catch (e2) {
          e2.message = `Error constructing type ${lhs}: ${e2.message}`;
          throw e2;
        }
      } else {
        e.message = `Error constructing type ${lhs}: ${e.message}`;
        throw e;
      }
    }
    return expr;
  }

  returnAttributeAccess(lhs, rhs, type) {
    let expr = lhs[rhs];
    if (type.attr[rhs].template) {
      expr = type.attr[rhs].template(lhs, rhs);
    }
    if (typeof expr === 'function') {
      return () => lhs[rhs](...arguments);
    }
    return expr;
  }

  returnParenthesis(expr) {
    return expr;
  }

  returnSet(args) {
    return args;
  }

  emit_array(ctx) {
    ctx.type = this.Types._array;
    this.requiredImports[9] = true;
    return this.getList(ctx).map((child) => ( this.visit(child) ));
  }

  emit_object(ctx) {
    ctx.type = this.Types._object;
    this.requiredImports[10] = true;
    const object = {};
    this.getKeyValueList(ctx).map((k) => {
      object[this.getKeyStr(k)] = this.visit(this.getValue(k));
    });
    return object;
  }

  emitdatetime(ctx, date, isString) {
    if (date === null && isString) {
      return Date();
    } else if (date === null) {
      return new Date();
    }
    return date;
  }
  emitDate(ctx, date, isString) {
    if (date === null && isString) {
      return Date();
    } else if (date === null) {
      return new Date();
    }
    return date;
  }

  /* Numbers need emit methods because they also take type args */

  emitNumber(ctx, arg) {
    return Number(arg);
  }

  emitint(ctx, arg) {
    return new bson.Int32(arg);
  }

  emitfloat(ctx, arg) {
    return new bson.Double(arg);
  }
};
