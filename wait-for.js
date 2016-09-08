'use strict';

module.exports = function(page, condition, timeout) {
  const start = Date.now();
  const check = () => {
    let elapsed = Date.now() - start;
    if (!isNaN(timeout) && elapsed > timeout) {
      return Promise.reject('timed out after ' + elapsed + 'ms');
    }
    return page.evaluate(condition)
      .then(result => {
        console.warn('checking again');
        return result || check();
      });
  };
  return check();
};
