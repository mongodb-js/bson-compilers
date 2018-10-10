const antlr4 = require('antlr4');
const ECMAScriptLexer = require('./lib/antlr/ECMAScriptLexer.js');
const ECMAScriptParser = require('./lib/antlr/ECMAScriptParser.js');
const Python3Lexer = require('./lib/antlr/Python3Lexer.js');
const Python3Parser = require('./lib/antlr/Python3Parser');

const ErrorListener = require('./codegeneration/ErrorListener.js');
const { BsonTranspilersInternalError } = require('./helper/error');

const yaml = require('js-yaml');

const JavascriptVisitor = require('./codegeneration/javascript/Visitor');
const ShellVisitor = require('./codegeneration/shell/Visitor');
const PythonVisitor = require('./codegeneration/python/Visitor');

const JavaGenerator = require('./codegeneration/java/Generator');
const PythonGenerator = require('./codegeneration/python/Generator');
const CsharpGenerator = require('./codegeneration/csharp/Generator');
const ShellGenerator = require('./codegeneration/shell/Generator');
const JavascriptGenerator = require('./codegeneration/javascript/Generator');

const javascriptjavasymbols = require('./lib/symbol-table/javascripttojava');
const javascriptpythonsymbols = require('./lib/symbol-table/javascripttopython');
const javascriptcsharpsymbols = require('./lib/symbol-table/javascripttocsharp');
const javascriptshellsymbols = require('./lib/symbol-table/javascripttoshell');

const shelljavasymbols = require('./lib/symbol-table/shelltojava');
const shellpythonsymbols = require('./lib/symbol-table/shelltopython');
const shellcsharpsymbols = require('./lib/symbol-table/shelltocsharp');
const shelljavascriptsymbols = require('./lib/symbol-table/shelltojavascript');

const pythonjavasymbols = require('./lib/symbol-table/pythontojava');
const pythonshellsymbols = require('./lib/symbol-table/pythontoshell');
const pythoncsharpsymbols = require('./lib/symbol-table/pythontocsharp');
const pythonjavascriptsymbols = require('./lib/symbol-table/pythontojavascript');

/**
 * Constructs the parse tree from the JS or Shell code given by the user.
 *
 * @param {String} input
 * @return {antlr4.ParserRuleContext} - The parse tree.
 */
const loadJSTree = (input) => {
  const chars = new antlr4.InputStream(input);
  const lexer = new ECMAScriptLexer.ECMAScriptLexer(chars);
  lexer.strictMode = false;

  const tokens = new antlr4.CommonTokenStream(lexer);
  const parser = new ECMAScriptParser.ECMAScriptParser(tokens);
  parser.buildParseTrees = true;

  const listener = new ErrorListener();
  parser.removeErrorListeners(); // Remove the default ConsoleErrorListener
  parser.addErrorListener(listener); // Add back a custom error listener

  return parser.program();
};

/**
 * Constructs the parse tree from the Python code given by the user.
 *
 * @param {String} input
 * @return {antlr4.ParserRuleContext} - The parse tree.
 */
const loadPyTree = (input) => {
  const chars = new antlr4.InputStream(input + '\n'); // requires newline
  const lexer = new Python3Lexer.Python3Lexer(chars);

  const tokens = new antlr4.CommonTokenStream(lexer);
  const parser = new Python3Parser.Python3Parser(tokens);
  parser.buildParseTrees = true;

  const listener = new ErrorListener();
  parser.removeErrorListeners(); // Remove the default ConsoleErrorListener
  parser.addErrorListener(listener); // Add back a custom error listener

  return parser.file_input();
};

const getTranspiler = (loadTree, visitor, generator, symbols) => {
  const Transpiler = generator(visitor);
  const transpiler = new Transpiler();

  const doc = yaml.load(symbols);
  Object.assign(transpiler, {
    SYMBOL_TYPE: doc.SymbolTypes,
    BsonTypes: doc.BsonTypes,
    Symbols: Object.assign({}, doc.BsonSymbols, doc.JSSymbols),
    Types: Object.assign({}, doc.BasicTypes, doc.BsonTypes, doc.JSTypes),
    Syntax: doc.Syntax,
    Imports: doc.Imports
  });
  return {
    compile: (input, idiomatic) => {
      try {
        const tree = loadTree(input);
        transpiler.idiomatic = idiomatic === undefined ?
          transpiler.idiomatic :
          idiomatic;
        return transpiler.start(tree);
      } catch (e) {
        if (e.code && e.code.includes('BSONTRANSPILERS')) {
          throw e;
        }
        throw new BsonTranspilersInternalError(e.message, e);
      } finally {
        transpiler.idiomatic = true;
      }
    },
    getImports: () => {
      return transpiler.getImports();
    }
  };
};


module.exports = {
  javascript: {
    java: getTranspiler(loadJSTree, JavascriptVisitor, JavaGenerator, javascriptjavasymbols),
    python: getTranspiler(loadJSTree, JavascriptVisitor, PythonGenerator, javascriptpythonsymbols),
    csharp: getTranspiler(loadJSTree, JavascriptVisitor, CsharpGenerator, javascriptcsharpsymbols),
    shell: getTranspiler(loadJSTree, JavascriptVisitor, ShellGenerator, javascriptshellsymbols)
  },
  shell: {
    java: getTranspiler(loadJSTree, ShellVisitor, JavaGenerator, shelljavasymbols),
    python: getTranspiler(loadJSTree, ShellVisitor, PythonGenerator, shellpythonsymbols),
    csharp: getTranspiler(loadJSTree, ShellVisitor, CsharpGenerator, shellcsharpsymbols),
    javascript: getTranspiler(loadJSTree, ShellVisitor, JavascriptGenerator, shelljavascriptsymbols)
  },
  python: {
    java: getTranspiler(loadPyTree, PythonVisitor, JavaGenerator, pythonjavasymbols),
    shell: getTranspiler(loadPyTree, PythonVisitor, ShellGenerator, pythonshellsymbols),
    csharp: getTranspiler(loadPyTree, PythonVisitor, CsharpGenerator, pythoncsharpsymbols),
    javascript: getTranspiler(loadPyTree, PythonVisitor, JavascriptGenerator, pythonjavascriptsymbols)
  },
  getTree: {
    javascript: loadJSTree,
    python: loadPyTree
  }
};
