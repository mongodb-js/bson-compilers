/* eslint new-cap: 0 */
const path = require('path');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;

const { getTree } = require('../');
const yaml = require('js-yaml');

const modes = process.env.MODE ? process.env.MODE.split(',') : [];

const readYAML = (filename) => {
  let parseResult;
  try {
    parseResult = yaml.load(fs.readFileSync(filename));
  } catch (err) {
    err.message = `${filename}: ${err.message}`;
    throw err;
  }
  return parseResult;
};

describe('Casting tests', () => {
  if (modes.length > 0 && modes.indexOf('casting') === -1) {
    return;
  }
  const testpath = path.join(__dirname, 'yaml', 'edge-cases', 'casting.yaml');
  const tests = readYAML(testpath).tests.all;
  for (const test of tests) {
    for (const input of Object.keys(test.input)) {
      for (const output of Object.keys(test.output)) {
        const Visitor = require(`../codegeneration/${input}/Visitor`);
        const Generator = require(`../codegeneration/${output}/Generator`);
        const symbols = require(`../lib/symbol-table/${input}to${output}`);

        const Transpiler = Generator(Visitor);
        const transpiler = new Transpiler();
        const doc = yaml.load(symbols);
        transpiler.Types = Object.assign({}, doc.BasicTypes, doc.BsonTypes);
        transpiler.Symbols = Object.assign(
          {
            TestFunc: {
              callable: 2,
              args: [],
              template: null,
              argsTemplate: null,
              id: 'TestFunc',
              type: null
            }
          },
          doc.BsonSymbols, doc.NativeSymbols);
        transpiler.Syntax = doc.Syntax;
        transpiler.SYMBOL_TYPE = doc.SymbolTypes;
        describe(`from ${input} to ${output}`, () => {
          it(test.description, () => {
            if (test.input[input].args) {
              transpiler.Symbols.TestFunc.args = test.input[input].args.map((t) => {
                return t.map((k) => ( k !== null ? transpiler.Types[k] : k ));
              });
            }
            const str = getTree[input](test.input[input].code);
            expect(transpiler.start(str)).to.equal(test.output[output]);
          });
        });
      }
    }
  }
});
