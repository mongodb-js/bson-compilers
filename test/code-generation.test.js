/* eslint no-sync: 0 */
const path = require('path');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;

const { readJSON, readYAML, runTest } = require('./helpers');
const transpiler = require('../index');

const outputLanguages = process.env.OUTPUT ? process.env.OUTPUT.split(',') : [ 'csharp', 'python', 'java', 'javascript', 'shell'];
const inputLanguages = process.env.INPUT ? process.env.INPUT.split(',') : [ 'shell', 'javascript', 'python' ];
const modes = process.env.MODE ? process.env.MODE.split(',') : ['success', 'error'];

describe('Test', () => {
  modes.forEach((mode) => {
    const testpath = path.join(__dirname, 'json', mode);
    inputLanguages.forEach((inputLang) => {
      fs.readdirSync(path.join(testpath, inputLang)).map((file) => {
        const tests = readJSON(path.join(testpath, inputLang, file)).tests;
        const testname = file.replace('.json', '');

        outputLanguages.forEach((outputLang) => {
          // runTest(mode, testname, inputLang, outputLang, tests);
        });
      });
    });
  });
});

for (const mode of ['imports', 'idiomatic', 'non-idiomatic']) {
  describe(mode, () => {
    const testpath = path.join(__dirname, 'json');
    fs.readdirSync(testpath).map((file) => {
      if (file === 'error' || file === 'success') {
        return; // TODO: remove old JSON tests
      }
      const tests = readYAML(path.join(testpath, file));
      for (const type of Object.keys(tests.tests)) {
        describe(`${type}`, () => {
          for (const test of tests.tests[type]) {
            const description = test.description
              ? (d) => {
                describe(`${test.description}`, () => (d()));
              }
              : (d) => ( d() );
            description(() => {
              for (const input of Object.keys(test.input)) {
                for (const output of Object.keys(test.output)) {
                  if (input !== output) {
                    tests.runner(it, expect, input, output, transpiler, test);
                  }
                }
              }
            });
          }
        });
      }
    });
  });
}
