# Contributing to bson-compilers

## Setting up your environment
`bson-compilers` uses
[antlr](https://github.com/antlr/antlr4/blob/master/doc/javascript-target.md)
to help create an AST. As `antlr` is written in Java, you will need to set up a
few tools before being able to compile this locally. 

Make sure you have Java installed:
```shell
$ brew cask install java
```

Download `antlr`:
```shell
$ cd /usr/local/lib && curl -O http://www.antlr.org/download/antlr-4.7.1-complete.jar
```

You will then need to add it to your `$CLASSPATH`:
```shell
$ export CLASSPATH=".:/usr/local/lib/antlr-4.7.1-complete.jar:$CLASSPATH"
```

Alias `antlr4` and `grun`:
```shell
$ alias antlr4='java -Xmx500M -cp "/usr/local/lib/antlr-4.7.1-complete.jar:$CLASSPATH" org.antlr.v4.Tool' && alias grun='java org.antlr.v4.gui.TestRig'
```

Then compile and run tests locally with:
```shell
$ npm run compile && npm run test
```

You can provide a few environmental variables to help you test your specific
output and input languages. If none are provided, everything will run.
- __INPUT=:__ input language you want to test
- __OUTPUT=:__ output language you want to test
- __MODE=:__ works with either success or error test modes

```shell
OUTPUT=csharp INPUT=shell MODE=success npm run test 
```

## Project Structure
Entry point to the project is `index.js`. It currently exports [two
APIs](https://github.com/mongodb-js/bson-compilers#api), compiling a string
given `inputLang` and `outputLang`, and accesing language's import statements
you might need.

To get all the moving components ready, `index.js` needs a few things:
- `Generator.js` files for output languages
- `Visitor.js` files for input languages
- `Symbol Tables` for each permutation of `input` to `output` file

<img alt="indexjs" width="60%" align="right" src="/img-docs/indexjs.jpg"/>

<p align="left">
  <br><br>
  <code>getCompiler()</code> function takes in three arguments:
  <code>visitor</code>, <code>generator</code> and <code>symbols</code> to create
  a compiler
  and a <code>parse tree</code> that can be walked.
  <br><br>
  Output returned gets processed in either input language's
</code>Visitor.js</code> or output language's <code>Generator.js</code>.
  The result is then returned from the <code>Symbol Table</code>'s
  template file.
  <br><br><br>
</div>


### Visitor.js
`Visitor` class in each `visitor.js` file inherits from `ECMAScriptVisitor`
provided by antlr4. `ECMAScriptVisitor` is generated during the compile process
(`npm run compile`) and is part of the final package. Visitor's job is to
selectively visit children of a node and provide the next functions with
context to be able to process the nodes properly.

It will also assign the type of a node it's processing based on the information
from the input language symbol table. The types are important to the output
language, as they can be then looked up in the output language's template
symbol table or `Generator.js` fileand adjusted accordingly.



### Generator.js

### Symbol Tables

### Tests

## Adding an Output Language

1. Create a directory in `symbols` directory for your output language:
```shell
mkdir symbols/{OUTPUT_LANG}
```
2. Create a `templates.yaml` file to store your language's templates. Inside
   you'll probably want to copy the contents from an existing `templates` file,
clear all `!!js/function >` and replace them with `null`
```shell
touch symbols/{OUTPUT_LANG}/templates.yaml
```
3. You should now run `npm run compile` to generate a complete symbol table.
   This will be generated in `lib/symbol-table/javascriptto{OUTPUT_LANG}` and
`lib/symbol-table/shellto{OUTPUT_LANG}`.
4. You will have to require the generated symbol tables in `index.js`:
```js
const javascript{OUTPUT_LANG}symbols = require('lib/symbol-table/javascriptto{OUTPUT_LANG}')
const shell{OUTPUT_LANG}symbols = require('lib/symbol-table/shellto{OUTPUT_LANG}')
// and then add another export to module.exports at the bottom of the file:

module.exports = {
  javascript: {
    // all those js exports,
    {OUTPUT_LANG}: getCompiler(JavascriptVisitor, {OUTPUT_LANG}Generator, javascrip{OUTPUT_LANG}symbols)
  }
  shell: {
    // all those js exports,
    {OUTPUT_LANG}: getCompiler(ShellVisitor, {OUTPUT_LANG}Generator, shell{OUTPUT_LANG}symbols)
  }
}
```
5. We still don't have a `Generator.js` file required above, so that won't
   quite work yet. So next, create a new directory in `codegeneration` for your
output language:
```shell
mkidr codegenration/{OUTPUT_LANG}
```
6. And create a generator file:
```shell
touch codegeneration/{OUTPUT_LANG}/Generator.js
```
7. You will need some boiler plate to get you going as the input language's
   Visitor file will be looking for a few things. We'd recommend you start with
something like this:
```js
// a lot of languages prefer double quote strings, so there is a helper method
// for that. All other formatters can be found or adjusted in the same file.

const { doubleQuoteStringify } = require('../../helper/format');

// superclass is the input language's visitor file
module.exports = (superclass) => class ExtendedVisitor extends superclass {
  constructor() {
    super();
    // whether or not your output language needs the word new. If that's not
    // the case, remove this line
    this.new = 'new ';
    // regex flags might vary, so we create this object in the Generator file
    this.regexFlags = {
      i: 'i',  // ignore case
      m: 'm',  // multiline
      u: '', // unicode
      y: '',   // sticky search
      g: ''    // global
    };
    // same goes for bsonRegexFlags
    this.bsonRegexFlags = {
      'i': 'i', // Case insensitivity to match
      'm': 'm', // Multiline match
      'x': 'x', // Ignore all white space characters
      's': 's', // Matches all
      'l': '', // Case-insensitive matching dependent on the current locale?
      'u': '' // Unicode?
    };
  }
  // if any emit methods are necessary, they will go here, for example:
  emitDate(ctx, date) {
    // handle date conversion to output lang
  }
  // certain types need to be processed in the visitor file first. To check if
  // your emit function should take parameters, check the input language's
  // Visitor file.
};
```
8. You can now require the generator file in `index.js`:
```
const {OUTPUT_LANG}Generator = require('./codegeneration/{OUTPUT_LANG}/Generator')
```
9. Next thing is tests! Tests are organized under two modes: `error` and
   `success`. Each input language has it's own directory. You can edit output test
cases in each file in those directories based on what the output should be. For example:
```json
// this test is in /test/json/success/javascript/bson-constructors.json
// it's testing different ouptut based on on javascript intput of {x: {y: '2'}}
  {
    "description": "Doc with subdoc",
    "javascript": "{x: {y: '2'}}",
    "python": "{'x': {'y': '2'}}",
    "java": "new Document(\"x\", new Document(\"y\", \"2\"))",
    "csharp": "new BsonDocument(\"x\", new BsonDocument(\"y\", \"2\"))",
    "shell": "{x: {y: '2'}}",
    "OUTPUT_LANG": "OUTPUT_CODE"
  },
```

## Adding an Input Language
