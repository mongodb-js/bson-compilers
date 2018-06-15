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
  // emitDate(ctx, date) {
    // handle date conversion to output lang
  // }
  // certain types need to be processed in the visitor file first. To check if
  // your emit function should take parameters, check the input language's
  // visitor file.
};
