/* eslint no-sync: 0 */
const parse = require('fast-json-parse');
const yaml = require('js-yaml');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;
const transpiler = require('../');

const unsupported = {
  success: {
    python: {
      java: {
        'language-types': ['re.compile'],
        'bson-utils': ['Regex']
      },
      javascript: {
        'language-types': ['re.compile'],
        'bson-utils': ['Regex']
      },
      shell: {
        'language-types': ['re.compile'],
        'bson-utils': ['Regex']
      },
      csharp: {
        'language-types': ['re.compile'],
        'bson-utils': ['Regex']
      }
    }
  },
  error: {
  }
};

const checkResults = {
  success: function(inputLang, outputLang, test) {
    expect(transpiler[inputLang][outputLang].compile(test[inputLang])).to.equal(
      test[outputLang]
    );
  },

  error: function(inputLang, outputLang, test) {
  }
};

const readJSON = (filename) => {
  const parseResult = parse(fs.readFileSync(filename));
  // if an error is returned from parsing yaml, just throw it
  if (parseResult.err) throw new Error(parseResult.err.message);
  return parseResult.value;
};

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

const runTest = function(mode, testname, inputLang, outputLang, tests) {
  if (inputLang === outputLang) {
    return;
  }
  describe(`${testname}:${inputLang} ==> ${outputLang}`, () => {
    Object.keys(tests).forEach((key) => {
      describe(key, () => {
        tests[key].map((test) => {
          const skip = (
            inputLang in unsupported[mode] &&
            outputLang in unsupported[mode][inputLang] &&
            testname in unsupported[mode][inputLang][outputLang] &&
            (unsupported[mode][inputLang][outputLang][testname].indexOf('*') !== -1 ||
             unsupported[mode][inputLang][outputLang][testname].indexOf(key) !== -1)
          );
          (skip ? xit : it)(
            test.description,
            () => checkResults[mode](inputLang, outputLang, test)
          );
        });
      });
    });
  });
};

module.exports = { readJSON, runTest, readYAML };
