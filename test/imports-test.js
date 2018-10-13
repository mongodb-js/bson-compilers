const chai = require('chai');
const expect = chai.expect;
const transpiler = require('../index');
const { readJSON } = require('./helpers');
const path = require('path');
const fs = require('fs');


describe('imports', () => {
  const testpath = path.join(__dirname, 'json', 'imports');
  fs.readdirSync(testpath).map((file) => {
    const tests = readJSON(path.join(testpath, file)).tests;
    for (const type of Object.keys(tests)) {
      describe(`${type}`, () => {
        for (const test of tests[type]) {
          describe(`${test.description}`, () => {
            for (const input of Object.keys(test.input)) {
              for (const output of Object.keys(test.output)) {
                if (input !== output) {
                  it(`correct ${output} imports from ${input}`, () => {
                    transpiler[input][output].compile(test.input[input]);
                    expect(
                      transpiler[input][output].getImports()
                    ).to.equal(test.output[output]);
                  });
                }
              }
            }
          });
        }
      });
    }
  });
});
