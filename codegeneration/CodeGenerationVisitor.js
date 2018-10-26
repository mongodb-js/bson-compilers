/**
 * Class for code generation. Goes in between ANTLR generated visitor and
 * language-specific visitor code. These are basically all helper methods
 * that are used for all input languages.
 *
 * @param ANTLRVisitor - An ANTLR-generated visitor class
 * @returns {CodeGenerationVisitor}
 */
module.exports = (ANTLRVisitor) => class CodeGenerationVisitor extends ANTLRVisitor {
  constructor() {
    super();
  }
};
