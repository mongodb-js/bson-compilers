const fs = require('fs');
const parse = require('fast-json-parse');
const path = require('path');

const pSuccess = path.join(__dirname, 'test', 'json', 'success');

const { singleQuoteStringify, doubleQuoteStringify } = require('./helper/format');

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

const javaLineTemplate = (description, output) => {
  return `\n\t\t\t.append(${doubleQuoteStringify(description)}, ${output})`;
};

const pythonFileTemplate = (code) => {
  return `
#!bin/python
from bson import *
import datetime
x = {
    ${code}
}
print(x)
`;
};

const pythonDocTemplate = (name, code) => {
  return `\n    ${singleQuoteStringify(name)}: {${code}\n    },\n`;
};

const pythonLineTemplate = (description, output) => {
  return `\n        ${singleQuoteStringify(description)}: ${output},`;
};

const csharpFileTemplate = (code) => {
  return `
using MongoDB.Bson;
using MongoDB.Driver;

using System;
using System.Text.RegularExpressions;

namespace csharp_test
{
    class Program
    {
        static void Main(string[] args)
        {
            ${code}
            Console.WriteLine("executed chsarp testfile");
        }
    }
}`;
};

const csharpDocTemplate = (name, code) => {
  return `
\t\tvar ${name} = new BsonDocument{${code}};`;
};

const csharpLineTemplate = (description, output) => {
  return `\n\t\t\t{ ${doubleQuoteStringify(description)}, ${output} },`;
};

const templates = {
  python: {
    file: pythonFileTemplate,
    doc: pythonDocTemplate,
    line: pythonLineTemplate
  },
  java: {
    file: javaFileTemplate,
    doc: javaDocTemplate,
    line: javaLineTemplate
  },
  csharp: {
    file: csharpFileTemplate,
    doc: csharpDocTemplate,
    line: csharpLineTemplate
  }
};

const readJSON = (filename) => {
  const parseResult = parse(fs.readFileSync(filename));
  if (parseResult.err) {
    throw new Error(parseResult.err.message);
  }
  return parseResult.value;
};

const makeFile = (input, output) => {
  return templates[output].file(fs.readdirSync(path.join(pSuccess, input)).reduce(
    (str0, file) => {
      const tests = readJSON(path.join(pSuccess, input, file)).tests;
      return str0 + Object.keys(tests).reduce(
        (str, key) => {
          return str + templates[output].doc(file.replace(/-/g, '').slice(0, -5) + key, tests[key].reduce(
            (str2, test) => {
              return str2 + templates[output].line(test.description, test[output]);
            }, ''));
        }, '');
    }, ''));
};
console.log(process.argv);
if (process.argv.length !== 3) {
  console.log('Usage: <outputLanguage>');
  process.exit();
}
console.log(makeFile('javascript', process.argv[2]));
