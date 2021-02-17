// eslint-disable-next-line no-console
console.log('downloading antlr');

require('https').get('https://www.antlr.org/download/antlr-4.7.2-complete.jar',
  (r) => r.pipe(require('fs').createWriteStream('antlr-4.7.2-complete.jar')));
