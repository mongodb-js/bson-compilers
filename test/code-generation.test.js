/* eslint no-sync: 0 */
const path = require('path');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;

const { readYAML, readJSON } = require('./helpers');
const transpiler = require('../index');

const outputLanguages = process.env.OUTPUT ? process.env.OUTPUT.split(',') : [ 'csharp', 'python', 'java', 'javascript', 'shell'];
const inputLanguages = process.env.INPUT ? process.env.INPUT.split(',') : [ 'shell', 'javascript', 'python' ];
const modes = process.env.MODE ? process.env.MODE.split(',') : [];

const testpath2 = path.join(__dirname, 'yaml', 'error');
const total = {};
const yaml = readJSON(path.join(testpath2, 'python', 'argument-error.json')).tests;
for (const i of Object.keys(yaml)) {
  total[i] = [];
  for (const j of yaml[i]) {
    const doc = {
      description: j.description,
      input: {
        python: j.query
      },
      errorCode: j.errorCode
    };
    total[i].push(doc);
  }
}
// console.log(JSON.stringify(total));

const skipType = [];

const testpath = path.join(__dirname, 'yaml');
fs.readdirSync(testpath).map((file) => {
  if (file === 'edge-cases' || file === 'error') {
    return; // Ignore edge case tests, they have their own runners
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
              const outputLang = test.output ? Object.keys(test.output) : outputLanguages;
              for (const output of outputLang) {
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
