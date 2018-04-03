const { readJSON, runSuccessfulTest, runErrorTest } = require('./helpers');

const languages = ['java', 'python', 'csharp'];
const inputLang = 'query';

describe('BSONConstructors Success', () => {
  const tests = readJSON('./bson-constructors-success.json').bsonTypes;
  languages.forEach((outputLang) => {
    runSuccessfulTest(inputLang, outputLang, tests);
  });
});

describe('Built-in Object Constructors Success', () => {
  const tests = readJSON('./built-in-types-success.json').types;
  languages.forEach((outputLang) => {
    runSuccessfulTest(inputLang, outputLang, tests);
  });
});

describe('BSONConstructors Error', () => {
  const tests = readJSON('./bson-constructors-error.json').bsonTypes;
  languages.forEach((outputLang) => {
    runErrorTest(inputLang, outputLang, tests);
  });
});


