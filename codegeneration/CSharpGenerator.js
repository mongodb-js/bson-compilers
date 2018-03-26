const CodeGenerator = require('./CodeGenerator.js');

function Visitor() {
  CodeGenerator.call(this);

  return this;
}

Visitor.prototype = Object.create(CodeGenerator.prototype);
Visitor.prototype.constructor = Visitor;

// assign a string type to current ctx
// get double quotes around the string
Visitor.prototype.visitStringLiteral = function(ctx) {
  ctx.type = this.types.STRING;
  return this.doubleQuoteStringify(this.visitChildren(ctx));
};

// similar to java, we also want to ignore js's `new` expression, and c# always
// needs it
Visitor.prototype.visitNewExpression = function(ctx) {
  const expr = this.visit(ctx.singleExpression());
  ctx.type = ctx.singleExpression().type;
  return expr;
};

/*  ************** built-in js identifiers **************** */

// adjust the Number constructor;
// returns new int(num)
Visitor.prototype.visitNumberConstructorExpression = function(ctx) {
  const argList = ctx.arguments().argumentList();

  if (!argList || argList.singleExpression().length !== 1) {
    return 'Error: Number requires one argument';
  }

  const arg = argList.singleExpression()[0];
  const number = this.removeQuotes(this.visit(arg));

  if (isNaN(parseInt(number, 10)) ||
    ( arg.type !== this.types.STRING &&
      arg.type !== this.types.DECIMAL &&
      arg.type !== this.types.INTEGER)
  ) {
    return 'Error: Number requires a number or a string argument';
  }

  return `new int(${number})`;
};

module.exports = Visitor;
