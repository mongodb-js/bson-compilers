/* eslint no-sync: 0 */
const path = require('path');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;

const { readYAML } = require('./helpers');
const transpiler = require('../index');

const outputLanguages = process.env.OUTPUT ? process.env.OUTPUT.split(',') : [ 'csharp', 'python', 'java', 'javascript', 'shell'];
const inputLanguages = process.env.INPUT ? process.env.INPUT.split(',') : [ 'shell', 'javascript', 'python' ];
const modes = process.env.MODE ? process.env.MODE.split(',') : [];

// describe('Test', () => {
  // modes.forEach((mode) => {
  //   const testpath = path.join(__dirname, 'json', mode);
  //   inputLanguages.forEach((inputLang) => {
  //     fs.readdirSync(path.join(testpath, inputLang)).map((file) => {
  //       const tests = readJSON(path.join(testpath, inputLang, file)).tests;
  //       const testname = file.replace('.json', '');
  //
  //       outputLanguages.forEach((outputLang) => {
  //         // runTest(mode, testname, inputLang, outputLang, tests);
  //       });
  //     });
  //   });
  // });
// });

const skipType = [];

const testpath = path.join(__dirname, 'json');
fs.readdirSync(testpath).map((file) => {
  if (file === 'error' || file === 'success' || file === 'edge-cases') {
    return; // TODO: remove old JSON tests
  }
  const mode = file.replace('.yaml', '');
  if (modes.length > 0 && modes.indexOf(mode) === -1) {
    return;
  }
  describe(mode, () => {
    const tests = readYAML(path.join(testpath, file));
    for (const type of Object.keys(tests.tests)) {
      if (skipType.indexOf(type) !== -1) {
        continue;
      }
      describe(`${type}`, () => {
        for (const test of tests.tests[type]) {
          const description = test.description
            ? (d) => {
              describe(`${test.description}`, () => (d()));
            }
            : (d) => (d());
          description(() => {
            for (const input of Object.keys(test.input)) {
              if (inputLanguages.indexOf(input) === -1) {
                continue;
              }
              for (const output of Object.keys(test.output)) {
                if (outputLanguages.indexOf(output) === -1) {
                  continue;
                }
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
