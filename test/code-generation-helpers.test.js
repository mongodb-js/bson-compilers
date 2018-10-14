/* eslint new-cap: 0 */
const path = require('path');
const chai = require('chai');
const expect = chai.expect;

const { getTree } = require('../');
const yaml = require('js-yaml');

const tests = [
  {
    description: "defaults to long",
    input: {
      javascript: {
        code: "1",
        args: null
      },
      shell: {
        code: "1",
        args: null
      },
      python: {
        code: "1",
        args: null
      }
    },
    output: {
      java: "1L"
    }
  },
  {
    description: "casts double to int, decimal, hex and octal",
    input: {
      javascript: {
        code: "TestFunc(100, 200, 300, 400, -500)",
        args: [
          ["_integer"],
          ["_decimal"],
          ["_hex"],
          ["_octal"],
          ["_integer"]
        ]
      },
      shell: {
        code: "TestFunc(100, 200, 300, 400, -500)",
        args: [
          ["_integer"],
          ["_decimal"],
          ["_hex"],
          ["_octal"],
          ["_integer"]
        ]
      }
    },
    output: {
      java: "TestFunc(100, 200d, 300, 400, -500)"
    }
  },
  {
    description: "does not cast numeric",
    input: {
      javascript: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, Number(10), Number('10'), -10)",
        args: [
          ["_numeric"],
          ["_numeric"],
          ["_numeric"],
          ["_numeric"],
          ["_numeric"],
          ["_numeric"],
          ["_numeric"]
        ]
      },
      shell: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, Number(10), Number('10'), -10)",
        args: [
          ["_numeric"],
          ["_numeric"],
          ["_numeric"],
          ["_numeric"],
          ["_numeric"],
          ["_numeric"],
          ["_numeric"]
        ]
      }
    },
    output: {
      java: "TestFunc(10L, 10.01d, 0x6, 05, 10d, Double.parseDouble(\"10\"), -10L)"
    }
  },
  {
    description: "does not cast Number",
    input: {
      javascript: {
        code: "TestFunc(Number(10), Number('10'), Number(10), Number('10'))",
        args: [
          ["_numeric"],
          ["_long"],
          ["_decimal"],
          ["_integer"]
        ]
      },
      shell: {
        code: "TestFunc(Number(10), Number('10'), Number(10), Number('10'))",
        args: [
          ["_numeric"],
          ["_long"],
          ["_decimal"],
          ["_integer"]
        ]
      }
    },
    output: {
      java: "TestFunc(10d, Double.parseDouble(\"10\"), 10d, Double.parseDouble(\"10\"))"
    }
  },
  {
    description: "casts long, dec, hex, octal to long",
    input: {
      javascript: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, -10)",
        args: [
          ["_long"],
          ["_long"],
          ["_long"],
          ["_long"],
          ["_long"]
        ]
      },
      shell: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, -10)",
        args: [
          ["_long"],
          ["_long"],
          ["_long"],
          ["_long"],
          ["_long"]
        ]
      }
    },
    output: {
      java: "TestFunc(10L, new Long(10.01), new Long(0x6), new Long(05), -10L)"
    }
  },
  {
    description: "casts to integer by keeping original value",
    input: {
      javascript: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, -10)",
        args: [
          ["_integer"],
          ["_integer"],
          ["_integer"],
          ["_integer"],
          ["_integer"]
        ]
      },
      shell: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, -10)",
        args: [
          ["_integer"],
          ["_integer"],
          ["_integer"],
          ["_integer"],
          ["_integer"]
        ]
      }
    },
    output: {
      java: "TestFunc(10, 10.01, 0x6, 05, -10)"
    }
  },
  {
    description: "casts long, dec, hex, octal, and Number to decimal",
    input: {
      javascript: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, -10)",
        args: [
          ["_decimal"],
          ["_decimal"],
          ["_decimal"],
          ["_decimal"],
          ["_decimal"]
        ]
      },
      shell: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, -10)",
        args: [
          ["_decimal"],
          ["_decimal"],
          ["_decimal"],
          ["_decimal"],
          ["_decimal"]
        ]
      }
    },
    output: {
      java: "TestFunc(10d, 10.01d, (double) 0x6, (double) 05, -10d)"
    }
  },
  {
    description: "casts long, dec, hex, octal, and Number to hex",
    input: {
      javascript: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, -10)",
        args: [
          ["_hex"],
          ["_hex"],
          ["_hex"],
          ["_hex"],
          ["_hex"]
        ]
      },
      shell: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, -10)",
        args: [
          ["_hex"],
          ["_hex"],
          ["_hex"],
          ["_hex"],
          ["_hex"]
        ]
      }
    },
    output: {
      java: "TestFunc(10, 10.01, 0x6, 05, -10)"
    }
  },
  {
    description: "casts long, dec, hex, octal, and Number to octal",
    input: {
      javascript: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, -10)",
        args: [
          ["_octal"],
          ["_octal"],
          ["_octal"],
          ["_octal"],
          ["_octal"]
        ]
      },
      shell: {
        code: "TestFunc(10, 10.01, 0x6, 0o5, -10)",
        args: [
          ["_octal"],
          ["_octal"],
          ["_octal"],
          ["_octal"],
          ["_octal"]
        ]
      }
    },
    output: {
      java: "TestFunc(10, 10.01, 0x6, 05, -10)"
    }
  },
  {
    description: "casts with optional",
    input: {
      javascript: {
        code: "TestFunc(100)",
        args: [
          ["_decimal", null]
        ]
      },
      shell: {
        code: "TestFunc(100)",
        args: [
          ["_decimal", null]
        ]
      }
    },
    output: {
      java: "TestFunc(100d)"
    }
  },
  {
    description: "accepts Number",
    input: {
      javascript: {
        code: "Number(1)",
        args: null
      },
      shell: {
        code: "Number(1)",
        args: null
      }
    },
    output: {
      java: "1d"
    }
  }
];


describe('castTo', () => {
  for (const test of tests) {
    for (const input of Object.keys(test.input)) {
      for (const output of Object.keys(test.output)) {
        const Visitor = require(`../codegeneration/${input}/Visitor`);
        const Generator = require(`../codegeneration/${output}/Generator`);
        const symbols = require(`../lib/symbol-table/${input}to${output}`);

        const Transpiler = Generator(Visitor);
        const transpiler = new Transpiler();
        const doc = yaml.load(symbols);
        transpiler.Types = Object.assign({}, doc.BasicTypes, doc.BsonTypes);
        transpiler.Symbols = Object.assign(
          {
            TestFunc: {
              callable: 2,
              args: [],
              template: null,
              argsTemplate: null,
              id: 'TestFunc',
              type: null
            }
          },
          doc.BsonSymbols, doc.NativeSymbols);
        transpiler.Syntax = doc.Syntax;
        transpiler.SYMBOL_TYPE = doc.SymbolTypes;
        describe(`from ${input} to ${output}`, () => {
          it(test.description, () => {
            if (test.input[input].args) {
              transpiler.Symbols.TestFunc.args = test.input[input].args.map((t) => {
                return t.map((k) => ( k !== null ? transpiler.Types[k] : k ));
              });
            }
            const str = getTree[input](test.input[input].code);
            expect(transpiler.start(str)).to.equal(test.output[output]);
          });
        });
      }
    }
  }
});
