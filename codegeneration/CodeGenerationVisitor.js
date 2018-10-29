const {
  BsonTranspilersUnimplementedError,
  BsonTranspilersInternalError
} = require('../helper/error');

/**
 * Class for code generation. Goes in between ANTLR generated visitor and
 * language-specific visitor code. These are basically all helper methods
 * that are used for all input languages.
 *
 * @param {ANTLRVisitor} ANTLRVisitor - An ANTLR-generated visitor class
 * @returns {CodeGenerationVisitor}
 */
module.exports = (ANTLRVisitor) => class CodeGenerationVisitor extends ANTLRVisitor {
  constructor() {
    super();
    this.idiomatic = true;
    this.requiredImports = {};
  }

  start(ctx) {
    this.requiredImports = {};
    [300, 301, 302, 303, 304, 305, 306].forEach(
      (i) => (this.requiredImports[i] = [])
    );
    return this.startNode(ctx).trim();
  }


  deepCopyRequiredImports() {
    const copy = Object.assign({}, this.requiredImports);
    [300, 301, 302, 303, 304, 305, 306].forEach((i) => {
      copy[i] = Array.from(this.requiredImports[i]);
    });
    return copy;
  }

  /**
   * As code is generated, any classes that require imports are tracked in
   * this.Imports. Each class has a "code" that is defined in the symbol table.
   * The imports are then generated based on the output language templates.
   *
   *  @return {String} - The list of imports in the target language.
   */
  getImports() {
    const importTemplate = this.Imports.import.template ?
      this.Imports.import.template :
      (s) => (
        Object.values(s)
          .filter((a, i) => (Object.values(s).indexOf(a) === i))
          .join('\n')
      );
    // Remove empty arrays because js [] is not falsey :(
    [300, 301, 302, 303, 304, 305, 306].forEach(
      (i) => {
        if (i in this.requiredImports && this.requiredImports[i].length === 0) {
          this.requiredImports[i] = false;
        }
      });
    const imports = Object.keys(this.requiredImports)
      .filter((code) => {
        return (
          this.requiredImports[code] &&
          this.Imports[code] &&
          this.Imports[code].template
        );
      })
      .reduce((obj, c) => {
        obj[c] = this.Imports[c].template(this.requiredImports[c]);
        return obj;
      }, {});
    return importTemplate(imports);
  }

  unimplemented(ctx) {
    const name = this.renameNode(ctx.constructor.name);
    throw new BsonTranspilersUnimplementedError(
      `'${name}' not yet implemented`
    );
  }

  /**
   * This helper function checks for an emit method then applies the templates
   * if they exist for a function call node.
   *
   * @param {ParserRuleContext} ctx - The function call node
   * @param {Object} lhsType - The type
   * @param {Array} args - Arguments to the template
   * @param {String} defaultT - The default name if no template exists.
   * @param {String} defaultA - The default arguments if no argsTemplate exists.
   * @param {Boolean} skipNew - Optional: If true, never add new.
   * @param {Boolean} skipLhs - Optional: If true, don't add lhs to result.
   *
   * @return {String}
   */
  generateCall(ctx, lhsType, args, defaultT, defaultA, skipNew, skipLhs) {
    if (`emit${lhsType.id}` in this) {
      return this[`emit${lhsType.id}`](ctx);
    }
    const lhsArg = lhsType.template ? lhsType.template() : defaultT;
    const rhs = lhsType.argsTemplate ? lhsType.argsTemplate(lhsArg, ...args) : defaultA;
    const lhs = skipLhs ? '' : lhsArg;
    return this.Syntax.new.template
      ? this.Syntax.new.template(`${lhs}${rhs}`, skipNew, lhsType.code)
      : `${lhs}${rhs}`;
  }

  /**
   * Same as generateCall but for type literals instead of function calls.
   * @param {ParserRuleContext} ctx - The literal node
   * @param {Object} lhsType - The type
   * @param {Array} args - Arguments to the template
   * @param {String} defaultT - The default if no template exists.
   * @param {Boolean} skipNew - Optional: If true, never add new.
   *
   * @return {String}
   */
  generateLiteral(ctx, lhsType, args, defaultT, skipNew) {
    if (`emit${lhsType.id}` in this) {
      return this[`emit${lhsType.id}`](ctx);
    }
    if (lhsType.template) {
      const str = lhsType.template(...args);
      return this.Syntax.new.template
        ? this.Syntax.new.template(str, skipNew, lhsType.code)
        : str;
    }
    return defaultT;
  }

  getIndentDepth(ctx) {
    while (ctx.indentDepth === undefined) {
      ctx = ctx.parentCtx;
      if (ctx === undefined || ctx === null) {
        return -1;
      }
    }
    return ctx.indentDepth;
  }

  _getType(ctx) {
    if (ctx.type !== undefined) {
      return ctx;
    }
    if (!ctx.children) {
      return null;
    }
    for (const c of ctx.children) {
      const typed = this._getType(c);
      if (typed) {
        return typed;
      }
    }
    return null;
  }

  getTyped(actual) {
    const typed = this._getType(actual);
    if (!typed) {
      throw new BsonTranspilersInternalError('Type not set on any child nodes');
    }
    return typed;
  }


  /**
   * Selectively visits children of a node.
   *
   * @param {ParserRuleContext} ctx
   * @param {Object} options:
   *    start - child index to start iterating at.
   *    end - child index to end iterating after.
   *    step - how many children to increment each step, 1 visits all children.
   *    separator - a string separator to go between children.
   *    ignore - an array of child indexes to skip.
   *    children - the set of children to visit.
   * @returns {String}
   */
  visitChildren(ctx, options) {
    const opts = {
      start: 0, step: 1, separator: '', ignore: [], children: ctx.children
    };
    Object.assign(opts, options ? options : {});
    opts.end = ('end' in opts) ? opts.end : opts.children.length - 1;

    let code = '';
    for (let i = opts.start; i <= opts.end; i += opts.step) {
      if (opts.ignore.indexOf(i) === -1) {
        code = `${code}${this.visit(
          opts.children[i]
        )}${(i === opts.end) ? '' : opts.separator}`;
      }
    }
    return code;
  }

  /**
   * Visit a end-of-file symbol.
   * *
   * @returns {String}
   */
  visitEof() {
    if (this.Syntax.eof.template) {
      return this.Syntax.eof.template();
    }
    return '';
  }

  /**
   * Visit a end-of-line symbol.
   * *
   * @returns {String}
   */
  visitEos() {
    if (this.Syntax.eos.template) {
      return this.Syntax.eos.template();
    }
    return '\n';
  }

  /**
   * Visit a leaf node and return a string.
   * *
   * @param {ParserRuleContext} ctx
   * @returns {String}
   */
  visitTerminal(ctx) {
    return ctx.getText();
  }



};
