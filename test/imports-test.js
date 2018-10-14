const chai = require('chai');
const expect = chai.expect;
const transpiler = require('../index');
const { readYAML } = require('./helpers');
const path = require('path');
const fs = require('fs');


describe('imports', () => {
  const testpath = path.join(__dirname, 'json', 'imports');
  fs.readdirSync(testpath).map((file) => {
    const tests = readYAML(path.join(testpath, file));
    for (const type of Object.keys(tests.tests)) {
      describe(`${type}`, () => {
        for (const test of tests.tests[type]) {
          describe(`${test.description}`, () => {
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
