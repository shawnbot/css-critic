'use strict';
const critical = require('./');
const url = process.argv[3] || 'http://localhost:4000';

critical(url, {diff: true})
  .then(
    styles => console.log(styles.join('\n')),
    error => console.error(error)
  );
