const antlr4 = require('antlr4');
const ECMAScriptLexer = require('./lib/ECMAScriptLexer.js');
const ECMAScriptParser = require('./lib/ECMAScriptParser.js');

const Python3Generator = require('./codegeneration/Python3Generator.js');
const CSharpGenerator = require('./codegeneration/CSharpGenerator.js');
const JavaGenerator = require('./codegeneration/JavaGenerator.js');
const CodeGenerator = require('./codegeneration/CodeGenerator.js');

const ErrorListener = require('./codegeneration/ErrorListener.js');

const { loadSymbolTable } = require('./codegeneration/SymbolTable');

/**
 * Compiles an ECMAScript string into another language.
 *
 * @param {String} input - Code to compile
 * @param {CodeGenerator} generator - Target language generator
 * @returns {String}
 */
const compileECMAScript = (input, generator) => {
  const chars = new antlr4.InputStream(input);
  const lexer = new ECMAScriptLexer.ECMAScriptLexer(chars);
  lexer.strictMode = false;

  const tokens = new antlr4.CommonTokenStream(lexer);
  const parser = new ECMAScriptParser.ECMAScriptParser(tokens);
  parser.buildParseTrees = true;

  const listener = new ErrorListener();
  parser.removeErrorListeners(); // Remove the default ConsoleErrorListener
  parser.addErrorListener(listener); // Add back a custom error listener

  const tree = parser.expressionSequence();

  return generator.start(tree);
};

const toJava = (input) => {
  const symbols = loadSymbolTable('ecmascript', 'java');
  CodeGenerator.prototype.SYMBOL_TYPE = symbols[0];
  CodeGenerator.prototype.BsonTypes = symbols[1];
  CodeGenerator.prototype.Symbols = symbols[2];
  CodeGenerator.prototype.AllTypes = symbols[3];
  return compileECMAScript(
    input,
    new JavaGenerator(),
  );
};
const toCSharp = (input) => {
  return compileECMAScript(
    input,
    new CSharpGenerator(),
    loadSymbolTable('ecmascript', 'csharp')
  );
};
const toPython = (input) => {
  return compileECMAScript(
    input,
    new Python3Generator(),
    loadSymbolTable('ecmascript', 'python')
  );
};

console.log(toJava('{x: 1}'));

module.exports = {
  toJava, toCSharp, toPython
};
