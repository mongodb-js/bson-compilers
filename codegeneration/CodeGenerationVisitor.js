const {
  BsonTranspilersUnimplementedError
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
    const name = ctx.constructor.name ?
      ctx.constructor.name.replace('Context', '') : 'Expression';
    throw new BsonTranspilersUnimplementedError(
      `'${name}' not yet implemented`
    );
  }


};
