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
