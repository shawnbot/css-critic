'use strict';
const critical = require('./');
const fs = require('fs');
const args = process.argv.slice(2);
const url = args.shift() || 'http://localhost:4000';

critical(url, {diff: true})
  .then(
    styles => {
      fs.writeFileSync('critical.css', styles.join('\n'));
    },
    error => {
      console.error(error);
      process.exit(1);
    }
  );
