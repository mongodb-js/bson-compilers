/* eslint no-sync: 0 */
const parse = require('fast-json-parse');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;
const transpiler = require('../');

const unsupported = {
  success: {
    python: {
      java: {
        'language-types': [
          're.compile'
        ],
        'bson-constructors': [
          'Code', 'ObjectId', 'DBRef', 'Int64', 'MinKey/MaxKey', 'Regexp', 'Timestamp', 'Decimal128'
        ]
      },
      javascript: {
        'language-types': [
          're.compile'
        ],
        'bson-constructors': [
          'Code', 'ObjectId', 'DBRef', 'Int64', 'MinKey/MaxKey', 'Regexp', 'Timestamp', 'Decimal128'
        ]
      },
      shell: {
        'language-types': [
          're.compile'
        ],
        'bson-constructors': [
          'Code', 'ObjectId', 'DBRef', 'Int64', 'MinKey/MaxKey', 'Regexp', 'Timestamp', 'Decimal128'
        ]
      },
      csharp: {
        'language-types': [
          're.compile'
        ],
        'bson-constructors': [
          'Code', 'ObjectId', 'DBRef', 'Int64', 'MinKey/MaxKey', 'Regexp', 'Timestamp', 'Decimal128'
        ]
      }
    }
  },
  error: {
    python: '*'
  }
};

const checkResults = {
  success: function(inputLang, outputLang, test) {
    expect(transpiler[inputLang][outputLang].compile(test[inputLang])).to.equal(
      test[outputLang]
    );
  },

  error: function(inputLang, outputLang, test) {
    let thrown = false;
    try {
      transpiler[inputLang][outputLang].compile(test.query);
    } catch (error) {
      thrown = true;
      expect(error.code).to.equal(test.errorCode);
      if (test.message) {
        expect(error.message).to.be.a('string');
        expect(
          error.message.includes(test.message),
          `Expected error message to contain ${test.message} but got ${error.message}`
        ).to.be.true;
      }
    } finally {
      if (!thrown) {
        expect.fail(0, 0, `Expected error with code ${test.errorCode} to throw`);
      }
    }
  }
};

const readJSON = (filename) => {
  const parseResult = parse(fs.readFileSync(filename));
  // if an error is returned from parsing json, just throw it
  if (parseResult.err) throw new Error(parseResult.err.message);
  return parseResult.value;
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

module.exports = { readJSON, runTest };
