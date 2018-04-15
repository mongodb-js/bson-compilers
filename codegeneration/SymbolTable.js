/* eslint key-spacing:0, no-multi-spaces:0 */
const path = require('path');

// const SYMBOL_TYPE = { VAR: 0, CONSTRUCTOR: 1, FUNC: 2 };

const yaml = require('js-yaml');
const fs = require('fs');

const files = fs.readdirSync('symbols');
const contents = files.reduce((str, file) => {
  return str + fs.readFileSync(path.join('symbols', file));
}, '');

// write a file so debugging is easier with linenumbers
fs.writeFileSync('concatted.yaml', contents);
const doc = yaml.load(contents);

const Types = doc.BasicTypes;
const BsonTypes = doc.BsonTypes;
const YamlBsonSymbols = doc.BsonSymbols;
const SYMBOL_TYPE = doc.SymbolTypes;

/**
 * Symbols represent classes, variables, and functions.
 *
 * @param {String} id - identifier. TODO: for now, internals start with _
 * @param {Number} callable - if it's a function, constructor, or variable.
 * @param {Array} args - arguments if its callable. An array of tuples where
 * each tuple has each possible type for the argument at that index.
 * @param {Symbol} type - the type the symbol returns. Could be a Symbol or
 * 0 if it's a primitive type.
 * @param {Scope} attrs - the attributes of the returned type. TODO: do we want to strictly check all objs or just BSON/Built-in.
 * @param {Function} template - the string template for this type. This is the first
 * step in (slowly) extracting any language-specific code out of the visitor so that
 * we can use the same visitor for every export language. Eventually, each type that
 * needs translation will include a string template that we can swap out depending
 * on what language we're compiling to. The visitor will be mostly be controlling
 * the order of nodes visited and handling edge cases.
 * @param {Function} argsTemplate - the string template for the arguments if this
 * is a call.
 *
 * @returns {Symbol}
 */
function Symbol(id, callable, args, type, attrs, template, argsTemplate) {
  return {
    id: id,
    callable: callable,
    args: args,
    type: type,
    attr: attrs,
    template: template,
    argsTemplate: argsTemplate
  };
}

/**
 * Scope represents both namespaces and variable scope. Eventually the
 * data structure we're going to use for scopes will have the ability to
 * push/pop scopes, lookup variables, add variables to scope, and handle
 * collisions. For now it's just an object.
 *
 * @param {Object} attrs - The Symbols within the scope.
 * @return {Scope}
 */
function Scope(attrs) {
  return attrs;
}

/**
 * Symbols representing the BSON symbols, so the built-in methods and utils
 * accessible from calling `ObjectId.*`. It's callable because it includes the
 * constructor of each type.
 */
const OldBsonSymbols = new Scope({
  // Code: new Symbol(
  //   'Code',
  //   SYMBOL_TYPE.CONSTRUCTOR,
  //   [ [Types._string], [Types._object, null] ], // This isn't technically correct, since the first argument could be anything. It has an emit method though, so not checked.
  //   BsonTypes.Code,
  //   new Scope({})
  // ),
  // ObjectId: new Symbol(
  //   'ObjectId',
  //   SYMBOL_TYPE.CONSTRUCTOR,
  //   [ [null, Types._string, Types._numeric] ],
  //   BsonTypes.ObjectId,
  //   new Scope({
  //     createFromHexString: Symbol('createFromHexString', SYMBOL_TYPE.FUNC, [ [Types._string] ],  BsonTypes.ObjectId,  new Scope({}), () => { return ''; }, (lhs, arg) => { return `new ObjectId(${arg})`; }),
  //     createFromTime:      Symbol('createFromTime',      SYMBOL_TYPE.FUNC, [ [Types._numeric] ], BsonTypes.ObjectId,  new Scope({}), () => { return ''; }, (lhs, arg) => { return `new ObjectId(new java.util.Date(${arg}))`; }),
  //     isValid:             Symbol('isValid',             SYMBOL_TYPE.FUNC, [ [Types._string] ],  Types._bool,           new Scope({}))
  //   })
  // ),
  Binary: new Symbol(
    'Binary',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._string, Types._numeric, Types._object], [Types._numeric, null] ],
    BsonTypes.Binary,
    new Scope({
      SUBTYPE_DEFAULT:    Symbol('SUBTYPE_DEFAULT',      SYMBOL_TYPE.VAR,   null,                 Types._integer,       new Scope({}), () => { return 'org.bson.BsonBinarySubType.BINARY'; }),
      SUBTYPE_FUNCTION:   Symbol('SUBTYPE_FUNCTION',     SYMBOL_TYPE.VAR,   null,                 Types._integer,       new Scope({}), () => { return 'org.bson.BsonBinarySubType.FUNCTION'; }),
      SUBTYPE_BYTE_ARRAY: Symbol('SUBTYPE_BYTE_ARRAY',   SYMBOL_TYPE.VAR,   null,                 Types._integer,       new Scope({}), () => { return 'org.bson.BsonBinarySubType.OLD_BINARY'; }),
      SUBTYPE_UUID_OLD:   Symbol('SUBTYPE_UUID_OLD',     SYMBOL_TYPE.VAR,   null,                 Types._integer,       new Scope({}), () => { return 'org.bson.BsonBinarySubType.UUID_LEGACY'; }),
      SUBTYPE_UUID:       Symbol('SUBTYPE_UUID',         SYMBOL_TYPE.VAR,   null,                 Types._integer,       new Scope({}), () => { return 'org.bson.BsonBinarySubType.UUID'; }),
      SUBTYPE_MD5:        Symbol('SUBTYPE_MD5',          SYMBOL_TYPE.VAR,   null,                 Types._integer,       new Scope({}), () => { return 'org.bson.BsonBinarySubType.MD5'; }),
      SUBTYPE_USER_DEFINED: Symbol('SUBTYPE_USER_DEFINED', SYMBOL_TYPE.VAR, null,                 Types._integer,       new Scope({}), () => { return 'org.bson.BsonBinarySubType.USER_DEFINED'; })
    })
  ),
  DBRef: new Symbol(
    'DBRef',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._string], [BsonTypes.ObjectId], [Types._string, null] ],
    BsonTypes.DBRef,
    new Scope({})
  ),
  Double: new Symbol(
    'Double',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._numeric, Types._string] ],
    BsonTypes.Double,
    new Scope({}),
    () => { return 'java.lang.Double'; }
  ),
  Int32: new Symbol(
    'Int32',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._numeric, Types._string] ],
    BsonTypes.Int32,
    new Scope({}),
    () => { return 'java.lang.Integer'; }
  ),
  Long: new Symbol(
    'Long',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._numeric], [Types._numeric] ],
    BsonTypes.Long,
    new Scope({
      MAX_VALUE:          Symbol('MAX_VALUE',            SYMBOL_TYPE.VAR,   null,                 BsonTypes.Long,     new Scope({})),
      MIN_VALUE:          Symbol('MIN_VALUE',            SYMBOL_TYPE.VAR,   null,                 BsonTypes.Long,     new Scope({})),
      ZERO:               Symbol('ZERO',                 SYMBOL_TYPE.VAR,   null,                 BsonTypes.Long,     new Scope({}), () => { return 'new java.lang.Long(0)'; }),
      ONE:                Symbol('ONE',                  SYMBOL_TYPE.VAR,   null,                 BsonTypes.Long,     new Scope({}), () => { return 'new java.lang.Long(1)'; }),
      NEG_ONE:            Symbol('NEG_ONE',              SYMBOL_TYPE.VAR,   null,                 BsonTypes.Long,     new Scope({}), () => { return 'new java.lang.Long(-1)'; }),
      fromBits:           Symbol('LongfromBits',         SYMBOL_TYPE.FUNC,  [ [Types._integer],
                                                                              [Types._integer] ], BsonTypes.Long,     new Scope({})),
      fromInt:            Symbol('fromInt',              SYMBOL_TYPE.FUNC,  [ [Types._integer] ], BsonTypes.Long,     new Scope({}), () => { return 'new java.lang.Long'; }),
      fromNumber:         Symbol('fromNumber',           SYMBOL_TYPE.FUNC,  [ [Types._numeric] ], BsonTypes.Long,     new Scope({}), () => { return 'new java.lang.Long'; }),
      fromString:         Symbol('fromString',           SYMBOL_TYPE.FUNC,  [ [Types._string], [Types._integer, null] ], BsonTypes.Long, new Scope({}), (lhs) => { return `${lhs}.parseLong`; })
    }),
    () => { return 'java.lang.Long'; },
  ),
  MinKey: new Symbol(
    'MinKey',
    SYMBOL_TYPE.CONSTRUCTOR,
    [],
    BsonTypes.MinKey,
    new Scope({})
  ),
  MaxKey: new Symbol(
    'MaxKey',
    SYMBOL_TYPE.CONSTRUCTOR,
    [],
    BsonTypes.MaxKey,
    new Scope({})
  ),
  Timestamp: new Symbol(
    'Timestamp',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._numeric ], [Types._numeric] ],
    BsonTypes.Timestamp,
    new Scope({}),
    () => { return 'BSONTimestamp'; },
  ),
  Symbol: new Symbol(
    'Symbol',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._string] ],
    BsonTypes.Symbol,
    new Scope({})
  ),
  BSONRegExp: new Symbol(
    'BSONRegExp',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._string], [BsonTypes._string, null] ],
    BsonTypes.BSONRegExp,
    new Scope({})
  ),
  Decimal128: new Symbol(
    'Decimal128',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._object] ],
    BsonTypes.Decimal128,
    new Scope({
      fromString:         Symbol('fromString',           SYMBOL_TYPE.FUNC,  [ [Types._string] ],  BsonTypes.Decimal128, new Scope({}), (lhs) => { return `${lhs}.parse`; })
    })
  )
});

const BsonSymbols = Object.assign({}, OldBsonSymbols, YamlBsonSymbols);

const JSTypes = new Scope({
  Date: new Symbol(
    'Date',
    SYMBOL_TYPE.VAR, null, Types._object,
    new Scope({})
  ),
  RegExp: new Symbol(
    'RegExp',
    SYMBOL_TYPE.VAR, null, Types._object,
    new Scope({})
  )
});

const JSSymbols = new Scope({
  'Object': new Symbol(
    'Object',
    SYMBOL_TYPE.VAR, null, Types._object,
    new Scope({
      create:             Symbol('create',               SYMBOL_TYPE.FUNC,        [ [Types._object] ], Types._object,     new Scope({}), () => { return ''; },    (lhs, arg) => { return arg; })
    })
  ),
  Number: new Symbol(
    'Number',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._numeric, Types._string] ],
    Types._numeric,
    new Scope({}),
    () => { return 'java.lang.Integer'; }
  ),
  Date: new Symbol(
    'Date',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [] ], // This isn't set because it needs an emit method for each target language, and there are too many options.
    JSTypes.Date,
    new Scope({
      now:                Symbol('now',                  SYMBOL_TYPE.CONSTRUCTOR, [],             'Date',                 new Scope({}), () => { return 'java.util.Date'; })
    })
  ),
  RegExp: new Symbol(
    'RegExp',
    SYMBOL_TYPE.CONSTRUCTOR,
    [ [Types._string], [Types._string, null] ],
    JSTypes.RegExp,
    new Scope({})
  )
});

/**
 * This is the global scope object. Eventually it will include the built-in
 * language types, the BSON types, and any user-defined types within a scope
 * object.
 */
const Symbols = new Scope(Object.assign({}, BsonSymbols, JSSymbols));
const AllTypes = new Scope(Object.assign({}, Types, BsonTypes, JSTypes));

module.exports = {
  BsonTypes,
  Symbols,
  SYMBOL_TYPE,
  AllTypes
};

