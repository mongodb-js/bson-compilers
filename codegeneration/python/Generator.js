/* eslint complexity: 0 */
/**
 * Handling emit methods binded with visitor.
 *
 * @param {class} superClass
 * @returns {object}
 */
module.exports = (superClass) => class ExtendedVisitor extends superClass {
  constructor() {
    super();
    this.regexFlags = {
      i: 'i', // re.IGNORECASE
      m: 'm', // re.MULTILINE
      u: 'a', // re.ASCII
      y: '', // Sticky flag matches only from the index indicated by the lastIndex property
      g: 's' // re.DOTALL matches all
      // re.DEBUG - Display debug information. No corresponding inline flag.
      // re.LOCALE - Case-insensitive matching dependent on the current locale. Inline flag (?L)
      // re.VERBOSE - More readable way of writing patterns (eg. with comments)
    };
    this.bsonRegexFlags = {
      i: 'i', // Case insensitivity to match
      m: 'm', // Multiline match
      x: 'x', // Ignore all white space characters
      s: 's', // Matches all
      l: 'l', // Case-insensitive matching dependent on the current locale?
      u: 'u' // Unicode?
    };
  }

  /**
   * Accepts date or number, if date then don't convert to date.
   *
   * @param {FuncCallExpressionContext} ctx
   * @return {String}
   */
  emitObjectIdCreateFromTime(ctx) {
    ctx.type = 'createFromTime' in this.Symbols.ObjectId.attr ?
      this.Symbols.ObjectId.attr.createFromTime :
      this.Symbols.ObjectId.attr.fromDate;

    const args = this.checkArguments(
      ctx.type.args, this.getArguments(ctx), 'ObjectId.createFromTime'
    );
    const template = ctx.type.template ? ctx.type.template() : '';
    if (this.getArgumentAt(ctx, 0).type.id === 'Date') {
      return `${template}${ctx.type.argsTemplate('', args[0])}`;
    }
    return `${template}${ctx.type.argsTemplate(
      '', `datetime.datetime.fromtimestamp(${args[0]} / 1000)`)}`;
  }
};
