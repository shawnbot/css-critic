'use strict';
const critical = require('./');

critical('http://localhost:4000', {diff: true})
  .then(
    styles => console.log(styles.join('\n')),
    error => console.error(error)
  );
