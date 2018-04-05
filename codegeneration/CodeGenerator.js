/* eslint complexity: 0 */
const ECMAScriptVisitor = require('../lib/ECMAScriptVisitor').ECMAScriptVisitor;
const bson = require('bson');
const Context = require('context-eval');
const {
  Types,
  SYMBOL_TYPE,
  BsonSymbols,
  Symbols,
  AllTypes
} = require('./SymbolTable');
const { CodeGenerationError } = require('./helpers');

/**
 * This is a Visitor superclass where helper methods used by all language
 * generators can be defined.
 *
 * @returns {object}
 */
function Visitor() {
  ECMAScriptVisitor.call(this);
  return this;
}
Visitor.prototype = Object.create(ECMAScriptVisitor.prototype);
Visitor.prototype.constructor = Visitor;

Visitor.prototype.start = Visitor.prototype.visitExpressionSequence;

/**
 * Selectively visits children of a node.
 *
 * @param {ParserRuleContext} ctx
 * @param {Object} options:
 *    start - child index to start iterating at.
 *    end - child index to end iterating after.
 *    step - how many children to increment each step, 1 visits all children.
 *    separator - a string separator to go between children.
 *    ignore - an array of child indexes to skip.
 *    children - the set of children to visit.
 * @returns {String}
 */
Visitor.prototype.visitChildren = function(ctx, options) {
  const opts = {
    start: 0, step: 1, separator: '', ignore: [], children: ctx.children
  };
  Object.assign(opts, options ? options : {});
  opts.end = ('end' in opts) ? opts.end : opts.children.length - 1;

  let code = '';
  for (let i = opts.start; i <= opts.end; i += opts.step) {
    if (opts.ignore.indexOf(i) === -1) {
      code += this.visit(opts.children[i]) + (i === opts.end ? '' : opts.separator);
    }
  }
  /* Set the node's type to the first child, if it's not already set.
     More often than not, type will be set directly by the visitNode method. */
  if (ctx.type === undefined) {
    ctx.type = opts.children.length ? opts.children[0].type : Types._undefined;
  }
  return code.trim();
};

/**
 * Child nodes: literal
 * @param {LiteralExpressionContext} ctx
 * @return {String}
 */
Visitor.prototype.visitLiteralExpression = function(ctx) {
  ctx.type = this.getPrimitiveType(ctx.literal());

  if (`emit${ctx.type.id}` in this) {
    return this[`emit${ctx.type.id}`](ctx);
  }

  if (ctx.type.template) {
    return ctx.type.template(this.visitChildren(ctx));
  }

  return this.visitChildren(ctx);
};

/**
 * Child nodes: propertyNameAndValueList?
 * @param {ObjectLiteralContext} ctx
 * @return {String}
 */
Visitor.prototype.visitObjectLiteral = function(ctx) {
  ctx.type = Types._object;
  let args = '';
  if (ctx.propertyNameAndValueList()) {
    const properties = ctx.propertyNameAndValueList().propertyAssignment();
    if (ctx.type.argsTemplate) {
      args = ctx.type.argsTemplate(...properties.map((pair) => {
        return [this.visit(pair.propertyName()), this.visit(pair.singleExpression())];
      }));
    }
  }
  if (ctx.type.template) {
    return ctx.type.template(args);
  }
};

/**
 * Child nodes: elementList*
 * @param {ArrayLiteralContext} ctx
 * @return {String}
 */
Visitor.prototype.visitArrayLiteral = function(ctx) {
  ctx.type = Types._array;
  let args = '';
  if (ctx.elementList()) {
    const children = ctx.elementList().children.filter((child) => {
      return child.constructor.name !== 'TerminalNodeImpl';
    });
    if (ctx.type.argsTemplate) {
      args = ctx.type.argsTemplate(children.map((c) => { return this.visit(c); }));
    } else {
      args = children.map((c) => { return this.visit(c); }).join(', ');
    }
  }
  if (ctx.type.template) {
    return ctx.type.template(args);
  }
};

/**
 * One terminal child.
 * @param {ElisionContext} ctx
 * @return {String}
 */
Visitor.prototype.visitElision = function(ctx) {
  ctx.type = Types._null;
  if (ctx.type.template) {
    return ctx.type.template();
  }
  return 'null';
};


/**
 * Child nodes: singleExpression arguments
 * @param {FuncCallExpressionContext} ctx
 * @return {String}
 */
Visitor.prototype.visitFuncCallExpression = function(ctx) {
  const lhs = this.visit(ctx.singleExpression());
  let lhsType = ctx.singleExpression().type;
  if (typeof lhsType === 'string') {
    lhsType = AllTypes[lhsType];
  }

  // Special case types
  if (`emit${lhsType.id}` in this) {
    return this[`emit${lhsType.id}`](ctx);
  }

  const expectedArgs = lhsType.args;
  let rhs = this.checkArguments(expectedArgs, ctx.arguments().argumentList());

  ctx.type = lhsType.type;
  if (!lhsType.callable) {
    throw new CodeGenerationError(`${lhsType.id} is not callable`);
  }

  // TODO: don't need for other languages
  const newStr = lhsType.callable === SYMBOL_TYPE.CONSTRUCTOR ? 'new ' : '';
  if (lhsType.argsTemplate) {
    let l = lhs;
    if ('identifierName' in ctx.singleExpression()) {
      l = this.visit(ctx.singleExpression().singleExpression());
    }
    rhs = lhsType.argsTemplate(l, ...rhs);
  } else {
    rhs = `(${rhs.join(', ')})`;
  }
  return `${newStr}${lhs}${rhs}`;
};

Visitor.prototype.visitIdentifierExpression = function(ctx) {
  const name = this.visitChildren(ctx);
  ctx.type = Symbols[name];
  if (ctx.type === undefined) {
    throw new CodeGenerationError(`symbol "${name}" is undefined`);
  }
  if (ctx.type.template) {
    return ctx.type.template();
  }
  return name;
};

/**
 * This will check the type of the attribute, and error if it's a BSON symbol
 * or a JS Symbol and it is undefined. If it's not either of those symbols, it
 * doesn't error. TODO: should always error? never error?
 *
 * Child nodes: singleExpression identifierName
 * @param {GetAttributeExpressionContext} ctx
 * @return {String}
 */
Visitor.prototype.visitGetAttributeExpression = function(ctx) {
  const lhs = this.visit(ctx.singleExpression());
  const rhs = this.visit(ctx.identifierName());

  let type = ctx.singleExpression().type;
  if (typeof type === 'string') {
    type = AllTypes[type];
  }
  while (type !== null) {
    if (!(type.attr.hasOwnProperty(rhs))) {
      if (type.id in BsonSymbols) {
        throw new CodeGenerationError(`${rhs} not an attribute of ${type.id}`);
      }
      type = type.type;
      if (typeof type === 'string') {
        type = AllTypes[type];
      }
    } else {
      break;
    }
  }
  if (type === null) {
    ctx.type = Types._undefined;
    // TODO: how strict do we want to be?
    return `${lhs}.${rhs}`;
  }
  ctx.type = type.attr[rhs];
  if (type.attr[rhs].template) {
    return type.attr[rhs].template(lhs, rhs);
  }

  return `${lhs}.${rhs}`;
};


/**
 * Visit a leaf node and return a string.
 * *
 * @param {ParserRuleContext} ctx
 * @returns {String}
 */
Visitor.prototype.visitTerminal = function(ctx) {
  return ctx.getText();
};

// //////////
// Helpers //
// //////////
/**
 * Get the type of a node. TODO: nicer way to write it?
 * @param {LiteralContext} ctx
 * @return {Symbol}
 */
Visitor.prototype.getPrimitiveType = function(ctx) {
  if ('NullLiteral' in ctx) {
    return Types._null;
  }
  if ('UndefinedLiteral' in ctx) {
    return Types._undefined;
  }
  if ('BooleanLiteral' in ctx) {
    return Types._bool;
  }
  if ('StringLiteral' in ctx) {
    return Types._string;
  }
  if ('RegularExpressionLiteral' in ctx) {
    return Types._regex;
  }
  if ('numericLiteral' in ctx) {
    const number = ctx.numericLiteral();
    if ('IntegerLiteral' in number) {
      return Types._integer;
    }
    if ('DecimalLiteral' in number) {
      return Types._decimal;
    }
    if ('HexIntegerLiteral' in number) {
      return Types._hex;
    }
    if ('OctalIntegerLiteral' in number) {
      return Types._octal;
    }
  }
  // TODO: or raise error?
  return Types._undefined;
};

Visitor.prototype.executeJavascript = function(input) {
  const sandbox = {
    RegExp: RegExp,
    BSONRegExp: bson.BSONRegExp,
    Binary: bson.Binary,
    DBRef: bson.DBRef,
    Decimal128: bson.Decimal128,
    Double: bson.Double,
    Int32: bson.Int32,
    Long: bson.Long,
    Int64: bson.Long,
    Map: bson.Map,
    MaxKey: bson.MaxKey,
    MinKey: bson.MinKey,
    ObjectID: bson.ObjectID,
    ObjectId: bson.ObjectID,
    Symbol: bson.Symbol,
    Timestamp: bson.Timestamp,
    Code: function(c, s) {
      return new bson.Code(c, s);
    },
    NumberDecimal: function(s) {
      return bson.Decimal128.fromString(s);
    },
    NumberInt: function(s) {
      return parseInt(s, 10);
    },
    NumberLong: function(v) {
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
};

/**
 *
 * @param {Array} expected - An array of arrays where each subarray represents
 * possible argument types for that index.
 * @param {ArgumentListContext} argumentList - null if empty.
 *
 * @returns {Array}
 */
Visitor.prototype.checkArguments = function(expected, argumentList) {
  const argStr = [];
  if (!argumentList) {
    if (expected.length === 0) {
      return argStr;
    }
    throw new CodeGenerationError('arguments required');
  }
  const args = argumentList.singleExpression();
  if (args.length > expected.length) {
    throw new CodeGenerationError('too many arguments');
  }
  for (let i = 0; i < expected.length; i++) {
    if (args[i] === undefined) {
      if (expected[i].indexOf(null) !== -1) {
        return argStr;
      }
      throw new CodeGenerationError('too few arguments');
    }
    argStr.push(this.visit(args[i]));
    if (expected[i].indexOf(Types._numeric) !== -1 && (
        args[i].type === Types._integer ||
        args[i].type === Types._decimal ||
        args[i].type === Types._hex ||
        args[i].type === Types._octal)) {
      continue;
    }
    if (expected[i].indexOf(args[i].type) === -1 && expected[i].indexOf(args[i].type.id) === -1) {
      throw new CodeGenerationError(`expected types ${expected[i].map((e) => {
        return e.id ? e.id : e;
      })} but got type ${args[i].type.id} for argument at index ${i}`);
    }
  }
  return argStr;
};

module.exports = Visitor;
