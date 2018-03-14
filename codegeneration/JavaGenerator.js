const CodeGenerator = require('./CodeGenerator.js');

/**
 * This Visitor walks the tree generated by parsers and produces Java code.
 *
 * @returns {object}
 */
function Visitor() {
  CodeGenerator.call(this);
  return this;
}
Visitor.prototype = Object.create(CodeGenerator.prototype);
Visitor.prototype.constructor = Visitor;

/////////////////////////////////
// Nodes that differ in syntax //
/////////////////////////////////

Visitor.prototype.visitStringLiteral = function(ctx) {
  ctx.type = this.types.STRING;
  return this.doubleQuoteStringify(this.visitChildren(ctx));
};

Visitor.prototype.visitObjectLiteral = function(ctx) {
  let doc = 'new Document()';
  
  for (let i = 1; i < ctx.getChildCount() - 1; i++) {
    doc += this.visit(ctx.getChild(i));
  }
  ctx.type = this.types.OBJECT;
  return doc;
};

Visitor.prototype.visitPropertyNameAndValueList = function(ctx) {
  return this.visitChildren(ctx, {step: 2});
};

Visitor.prototype.visitPropertyExpressionAssignment = function(ctx) {
  const key = this.doubleQuoteStringify(this.visit(ctx.getChild(0)));
  const value = this.visit(ctx.getChild(2));
  return `.append(${key}, ${value})`;
};

Visitor.prototype.visitArrayLiteral = function(ctx) {
  ctx.type = this.types.ARRAY;
  return 'Arrays.asList(' + this.visit(ctx.getChild(1)) + ')';
};

/**
 * Ignore the new keyword because JS could either have it or not, but we always
 * need it in Java so we'll add it when we call constructors.
 */
Visitor.prototype.visitNewExpression = function(ctx) {
  const child = this.visitChildren(ctx, { start: 1 });
  ctx.type = ctx.getChild(1).type;
  return child;
};

/**
 * The arguments to Code can be either a string or actual javascript code.
 * TODO: should we bother actually visiting the code argument subtree? Or just
 * pass it through as a string directly.
 *
 * @param ctx
 * @returns {*}
 */
Visitor.prototype.visitBSONCodeConstructor = function(ctx) {
  const arguments = ctx.getChild(1);
  if (arguments.getChildCount() === 2 ||
     !(arguments.getChild(1).getChildCount() === 3 ||
       arguments.getChild(1).getChildCount() === 1)) {
    return "Error: Code requires one or two arguments";
  }
  const argList = arguments.getChild(1);
  const code = this.doubleQuoteStringify(argList.getChild(0).getText());

  if(argList.getChildCount() === 3) {
    /* NOTE: we have to visit the subtree first before type checking or type may
       not be set. We might have to just suck it up and do two passes, but maybe
       we can avoid it for now. */
    const scope = this.visit(argList.getChild(2));
    if(argList.getChild(2).type !== this.types.OBJECT) {
      return "Error: Code requires scope to be an object";
    }
    return `new CodeWithScope(${code}, ${scope})`;
  }
  return `new Code(${code})`;
};

/**
 *  This evaluates the code in a sandbox and gets the hex string out of the
 *  ObjectId.
 */
Visitor.prototype.visitBSONObjectIdConstructor = function(ctx) {
  const code = 'new ObjectId(';
  const arguments = ctx.getChild(1);
  if(arguments.getChildCount() === 2) {
    return code + ')';
  }
  let hexstr;
  try {
    hexstr = this.executeJavascript(ctx.getText()).toHexString();
  } catch (error) {
    return error.message;
  }
  return code + this.doubleQuoteStringify(hexstr) + ')';
};

Visitor.prototype.visitBSONBinaryConstructor = function(ctx) {
  let type;
  let binobj;
  try {
    binobj = this.executeJavascript(ctx.getText());
    console.log(binobj);
    type = binobj.sub_type;
  } catch (error) {
    return error.message;
  }
  const subtypes = {
    0 : 	'org.bson.BsonBinarySubType.BINARY',
  	1 : 	'org.bson.BsonBinarySubType.FUNCTION',
  	2 : 	'org.bson.BsonBinarySubType.BINARY',
  	3 : 	'org.bson.BsonBinarySubType.UUID_LEGACY',
  	4 :	  'org.bson.BsonBinarySubType.UUID',
    5 :	  'org.bson.BsonBinarySubType.MD5',
  	128 : 'org.bson.BsonBinarySubType.USER_DEFINED'
  };
  
  const bytes = this.doubleQuoteStringify(binobj.toString());
  return `new Binary(${subtypes[type]}, ${bytes}.getBytes("UTF-8"))`
};

// TODO: should we even support DBRef bc deprecated?
Visitor.prototype.visitBSONDBRefConstructor = function(ctx) {
  const arguments = ctx.getChild(1);
  if (arguments.getChildCount() === 2 ||
    !(arguments.getChild(1).getChildCount() === 5 ||
      arguments.getChild(1).getChildCount() === 3)) {
    return "Error: DBRef requires two or three arguments";
  }
  // TODO: Should we check types or implicitly case to Java expected type?
  const argList = arguments.getChild(1);
  const ns = this.visit(argList.getChild(0));
  if(argList.getChild(0).type !== this.types.STRING) {
    return "Error: DBRef requires string namespace";
  }
  const oid = this.visit(argList.getChild(2));
  if(argList.getChild(2).type !== this.types.OBJECT) {
    return "Error: DBRef requires object OID";
  }
  
  if(argList.getChildCount() === 5) {
    const db = this.visit(argList.getChild(4));
    if (argList.getChild(4).type !== this.types.STRING) {
      return "Error: DbRef requires string collection";
    }
    return `new DBRef(${ns}, ${oid}, ${db})`;
  }
  return `new DBRef(${ns}, ${oid})`;
};

Visitor.prototype.visitBSONDoubleConstructor = function(ctx) {
  const arguments = ctx.getChild(1);
  if (arguments.getChildCount() === 2 || arguments.getChild(1).getChildCount() !== 1) {
    return "Error: Double requires one argument";
  }
  const arg = arguments.getChild(1).getChild(0);
  const value = this.visit(arg);
  if(arg.type !== this.types.STRING && !this.isNumericType(arg)) {
    // This is actually what java accepts
    return "Error: Double requires either string or number";
  }
  return `new java.lang.Double(${value})`;
};

Visitor.prototype.visitBSONLongConstructor = function(ctx) {
  let longstr;
  try {
    longstr = this.executeJavascript(ctx.getText()).toString();
  } catch (error) {
    return error.message;
  }
  return `new java.lang.Long(${this.doubleQuoteStringify(longstr)})`;
};

Visitor.prototype.visitBSONMaxKeyConstructor = function(ctx) {
  return 'new MaxKey()';
};

Visitor.prototype.visitBSONMinKeyConstructor = function(ctx) {
  return 'new MinKey()';
};

Visitor.prototype.visitBSONRegExpConstructor = function(ctx) {

}

Visitor.prototype.visitDateConstructor = function(ctx) {
  // TODO: any Date.now() calls should stay as now calls in java
  // TODO: test JS input formats
  let epoch;
  try {
    epoch = this.executeJavascript(ctx.getText()).getTime();
  } catch (error) {
    return error.message;
  }
  return `new java.util.Date(${epoch})`;
};

Visitor.prototype.visitRegularExpressionLiteral = function(ctx) {
  let pattern;
  let flags;
  try {
    const regexobj = this.executeJavascript(ctx.getText());
    pattern = regexobj.pattern;
    flags = regexobj.flags;
  } catch (error) {
    return error.message;
  }
  return `Pattern.compile(${pattern}, ${flags})`;
};

module.exports = Visitor;
