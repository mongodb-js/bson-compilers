const ECMAScriptVisitor = require('../lib/ECMAScriptVisitor').ECMAScriptVisitor;

/**
 * This Visitor walks the tree generated by parsers and produces Python code.
 */
function Visitor() {
  ECMAScriptVisitor.call(this);
  return this;
}
Visitor.prototype = Object.create(ECMAScriptVisitor.prototype);
Visitor.prototype.constructor = Visitor;

/**
 * Instead of returning nodes, we want our tree to return a string built from
 * visiting each child.
 *
 * @param ctx
 * @returns {string}
 */
Visitor.prototype.visitChildren = function(ctx) {
  let code = '';
  for (let i = 0; i < ctx.getChildCount(); i++) {
    code += this.visit(ctx.getChild(i));
  }
  return code.trim();
};

/**
 * Visit a leaf node and return a string.
 * @param ctx
 */
Visitor.prototype.visitTerminal = function(ctx) {
  return ctx.getText();
};

/**
 * Add the BSON constructors to the language.
 * The keys are the names we expect as input
 * and the values are the constructors in Python.
 */
const bson_symbol_table = {
  ObjectId: 'ObjectId',
  Code: 'Code',
  Binary: 'Binary',
  DBRef: 'DBRef',
  Long: 'Int64', // TODO: do they take the same types?
  Decimal128: 'Decimal128',
  MinKey: 'MinKey', MaxKey: 'MaxKey',
  ISODate: 'datetime.date', // TODO: do they take the same types?
  Regexp: 'Regexp',
  TimeStamp: 'TimeStamp'
};

/////////////////////////////////
// Nodes that differ in syntax //
/////////////////////////////////

/**
 * Because python dict's need the keys to be strings.
 * Far-Away-TODO: PropertyName used also in getters/setters.
 */
Visitor.prototype.visitPropertyName = function(ctx) {
  return '\'' + this.visitChildren(ctx) + '\'';
};

/**
 * Because python doesn't need `New`, we can skip the first child.
 */
Visitor.prototype.visitNewExpression = function(ctx) {
  let code = '';
  for (let i = 1; i < ctx.getChildCount(); i++) {
    code += this.visit(ctx.getChild(i));
  }
  return code.trim();
};

/**
 * Visit function/constructor calls. First check if the function is
 * defined, and if so replace the function name with the Python equivalent.
 */
Visitor.prototype.visitArgumentsExpression = function(ctx) {
  const funcName = this.visit(ctx.getChild(0));
  if (!(funcName in bson_symbol_table)) {
    // TODO: handle errors
  } else {
    let code = bson_symbol_table[funcName];
    for (let i = 1; i < ctx.getChildCount(); i++) {
      code += this.visit(ctx.getChild(i));
    }
    return code.trim();
  }
};

Visitor.prototype.visitBSONBinaryConstructor = function(ctx) {
  return this.visitChildren(ctx);
};

module.exports = Visitor;
