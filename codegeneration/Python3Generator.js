const CodeGenerator = require('./CodeGenerator.js');

/**
 * This Visitor walks the tree generated by parsers and produces Python code.
 *
 * @returns {object}
 */
function Visitor() {
  CodeGenerator.call(this);

  return this;
}
Visitor.prototype = Object.create(CodeGenerator.prototype);
Visitor.prototype.constructor = Visitor;

// /////////////////////////// //
// Nodes that differ in syntax //
// /////////////////////////// //

/**
 * Visit String Literal
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitStringLiteral = function(ctx) {
  ctx.type = this.types.STRING;

  return this.singleQuoteStringify(this.visitChildren(ctx));
};

/**
 * Visit Property Expression Assignment
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitPropertyExpressionAssignment = function(ctx) {
  const key = this.singleQuoteStringify(this.visit(ctx.getChild(0)));
  const value = this.visit(ctx.getChild(2));

  return `${key}: ${value}`;
};

/**
 * Because python doesn't need `New`, we can skip the first child
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitNewExpression = function(ctx) {
  const child = this.visitChildren(ctx, {start: 1});

  ctx.type = ctx.getChild(1).type;

  return child;
};

/**
 * Visit Object Literal
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitObjectLiteral = function(ctx) {
  ctx.type = this.types.OBJECT;

  return this.visitChildren(ctx);
};

Visitor.prototype.visitElementList = function(ctx) {
  return this.visitChildren(ctx, { step: 2, separator: ', '});
};

/**
 * Visit Code Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitBSONCodeConstructor = function(ctx) {
  const args = ctx.getChild(1);

  if (
    args.getChildCount() !== 3 || (
      args.getChild(1).getChildCount() !== 1 &&
      args.getChild(1).getChildCount() !== 3
    )
  ) {
    return 'Error: Code requires one or two arguments';
  }

  const code = this.singleQuoteStringify(
    args.getChild(1).getChild(0).getText()
  );

  if (args.getChild(1).getChildCount() === 3) {
    /* NOTE: we have to visit the subtree first before type checking or type may
     not be set. We might have to just suck it up and do two passes, but maybe
     we can avoid it for now. */
    const scope = this.visit(args.getChild(1).getChild(2));

    if (args.getChild(1).getChild(2).type !== this.types.OBJECT) {
      return 'Error: Code requires scope to be an object';
    }

    return `Code(${code}, ${scope})`;
  }

  return `Code(${code})`;
};

/**
 * This evaluates the code in a sandbox and gets the hex string out of the
 * ObjectId.
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitBSONObjectIdConstructor = function(ctx) {
  const args = ctx.getChild(1);

  if (
      (args.getChildCount() !== 2 && args.getChildCount() !== 3) || (
      args.getChild(1).getChildCount() !== 0 &&
      args.getChild(1).getChildCount() !== 1
    )
  ) {
    return 'Error: ObjectId requires zero or one argument';
  }

  if (args.getChildCount() === 2) {
    return 'ObjectId()';
  }

  let hexstr;

  try {
    hexstr = this.executeJavascript(ctx.getText()).toHexString();
  } catch (error) {
    return error.message;
  }

  return `ObjectId(${this.singleQuoteStringify(hexstr)})`;
};

/**
 * Visit Binary Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitBSONBinaryConstructor = function(ctx) {
  const args = ctx.getChild(1);
  let type = '';
  let binobj = {};
  const subtypes = {
    '0': 'bson.binary.BINARY_SUBTYPE',
    '1': 'bson.binary.FUNCTION_SUBTYPE',
    '2': 'bson.binary.OLD_BINARY_SUBTYPE',
    '3': 'bson.binary.OLD_UUID_SUBTYPE',
    '4': 'bson.binary.UUID_SUBTYPE',
    '5': 'bson.binary.MD5_SUBTYPE',
    '6': 'bson.binary.CSHARP_LEGACY',
    '128': 'bson.binary.USER_DEFINED_SUBTYPE'
  };

  if (
    args.getChildCount() !== 3 || (
      args.getChild(1).getChildCount() !== 1 &&
      args.getChild(1).getChildCount() !== 3
    )
  ) {
    return 'Error: Binary requires one or two argument';
  }

  try {
    binobj = this.executeJavascript(ctx.getText());
    type = binobj.sub_type;
  } catch (error) {
    return error.message;
  }

  const bytes = this.singleQuoteStringify(binobj.toString());

  if (args.getChild(1).getChildCount() === 1) {
    return `Binary(bytes(${bytes}, 'utf-8'))`;
  }

  return `Binary(bytes(${bytes}, 'utf-8'), ${subtypes[type]})`;
};

/**
 * Visit Double Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitBSONDoubleConstructor = function(ctx) {
  const args = ctx.getChild(1);

  if (args.getChildCount() !== 3 || args.getChild(1).getChildCount() !== 1) {
    return 'Error: Double requires one argument';
  }

  const double = this.removeQuotes(this.visit(args.getChild(1)));

  if (
    (
      args.getChild(1).type !== this.types.STRING &&
      args.getChild(1).type !== this.types.DECIMAL &&
      args.getChild(1).type !== this.types.INTEGER
    ) ||
    isNaN(parseInt(double, 10))
  ) {
    return 'Error: Double requires a number or a string argument';
  }

  return `float(${double})`;
};

/**
 * Visit Long Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitBSONLongConstructor = function(ctx) {
  const args = ctx.getChild(1);

  if (
    args.getChildCount() !== 3 || (
      args.getChild(1).getChildCount() !== 1 &&
      args.getChild(1).getChildCount() !== 3
    )
  ) {
    return 'Error: Long requires one or two argument';
  }

  let longstr = '';

  try {
    longstr = this.executeJavascript(ctx.getText()).toString();
  } catch (error) {
    return error.message;
  }

  return `Int64(${longstr})`;
};

/**
 * Visit Date Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitDateConstructorExpression = function(ctx) {
  const args = ctx.getChild(1);

  if (args.getChild(1).getChildCount() === 0) {
    return 'datetime.date.today()';
  }

  let dateStr = '';

  try {
    const date = this.executeJavascript(ctx.getText());

    dateStr = [
      date.getUTCFullYear(),
      (date.getUTCMonth() + 1),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    ].join(', ');
  } catch (error) {
    return error.message;
  }

  return `datetime.datetime(${dateStr})`;
};

/**
 * Visit Date Now Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitDateNowConstructorExpression = function() {
  return 'datetime.datetime.now()';
};

/**
 * Visit Number Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitNumberConstructorExpression = function(ctx) {
  const args = ctx.getChild(1);

  if (args.getChildCount() !== 3 || args.getChild(1).getChildCount() !== 1) {
    return 'Error: Number requires one argument';
  }

  const number = this.removeQuotes(this.visit(args.getChild(1)));

  if (
    (
      args.getChild(1).type !== this.types.STRING &&
      args.getChild(1).type !== this.types.DECIMAL &&
      args.getChild(1).type !== this.types.INTEGER
    ) ||
    isNaN(parseInt(number, 10))
  ) {
    return 'Error: Number requires a number or a string argument';
  }

  return `int(${number})`;
};

/**
 * Visit MaxKey Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitBSONMaxKeyConstructor = function() {
  return 'MaxKey()';
};

/**
 * Visit MinKey Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitBSONMinKeyConstructor = function() {
  return 'MinKey()';
};

/**
 * Visit Symbol Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitBSONSymbolConstructor = function(ctx) {
  const args = ctx.getChild(1);

  if (args.getChildCount() === 2 || args.getChild(1).getChildCount() !== 1) {
    return 'Error: Symbol requires one argument';
  }

  const arg = args.getChild(1).getChild(0);
  const symbol = this.visit(arg);

  if (arg.type !== this.types.STRING) {
    return 'Error: Symbol requires a string argument';
  }

  return `unicode(${symbol}, 'utf-8')`;
};

/**
 * Visit Object.create() Constructor
 *
 * @param {object} ctx
 * @returns {string}
 */
Visitor.prototype.visitObjectCreateConstructorExpression = function(ctx) {
  const args = ctx.getChild(1);

  if (args.getChildCount() === 2 || args.getChild(1).getChildCount() !== 1) {
    return 'Error: Object.create() requires one argument';
  }

  const arg = args.getChild(1).getChild(0);
  const obj = this.visit(arg);

  if (arg.type !== this.types.OBJECT) {
    return 'Error: Object.create() requires an object argument';
  }

  return obj;
};

module.exports = Visitor;
