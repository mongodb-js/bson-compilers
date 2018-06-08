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

A more visual representation:

<img alt="indexjs" width="700" align="left " src="/img-docs/indexjs.jpg"/>

`getCompiler()` function takes in three arguments: `visitor`, `generator` and `symbols` to create a compiler and a `parse tree` that can be walked.

Output returned gets processed in either input language's `Visitor.js` or
output language's `Generator.js`. The result is then returned from the `Symbol
Table`'s template file.

## Adding an Output Language

## Adding an Input Language
