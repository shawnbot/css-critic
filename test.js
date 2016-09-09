'use strict';
const critical = require('./');
const args = process.argv.slice(2);
const url = args.shift() || 'http://localhost:4000';

critical(url, {diff: true})
  .then(
    styles => console.log(styles.join('\n')),
    error => console.error(error)
  );
