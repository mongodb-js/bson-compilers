const fs = require('fs');
const parse = require('fast-json-parse');
const path = require('path');

const outputLang = 'java';
const inputLang = 'javascript';
const pSuccess = path.join(__dirname, 'test', 'json', 'success');

const javaFileTemplate = (code) => {
  return `
package com.example.test;

import com.mongodb.DBRef;
import org.bson.BsonBinarySubType;
import org.bson.BsonRegularExpression;
import org.bson.Document;
import org.bson.types.*;
import org.bson.BsonUndefined;

import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.regex.Pattern;

public class Test {
    public void all() throws Exception {
        try {
            ${code}
        } catch (Exception e) {
            System.out.println("failure");
            throw e;
        }

    }
    public static void main(String[] args) throws Exception {
        Test test = new Test();
        test.all();
    }
}`;
};

const javaDocTemplate = (name, code) => {
  return `
\t\tDocument ${name} = new Document()${code};`;
};

const readJSON = (filename) => {
  const parseResult = parse(fs.readFileSync(filename));
  if (parseResult.err) {
    throw new Error(parseResult.err.message);
  }
  return parseResult.value;
};

const makeFile = () => {
  return javaFileTemplate(fs.readdirSync(path.join(pSuccess, inputLang)).reduce(
    (str0, file) => {
      const tests = readJSON(path.join(pSuccess, inputLang, file)).tests;
      return str0 + Object.keys(tests).reduce(
        (str, key) => {
          return str + javaDocTemplate(file.replace(/-/g, '').slice(0, -5) + key, tests[key].reduce(
            (str2, test) => {
              return str2 + `\n\t\t\t.append("${test.description}", ${test[outputLang]})`;
            }, ''));
        }, '');
    }, ''));
};
console.log(makeFile());
