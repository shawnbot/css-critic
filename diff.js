'use strict';

const fs = require('fs-promise');
const chalk = require('chalk');
const BlinkDiff = require('blink-diff');

const CRLF = '\n';

module.exports = function renderDiff(page, css, options, notify) {
  notify('diffing...');

  const diff = Object.assign({
    before: 'before.png',
    after: 'after.png',
    nocss: 'nocss.png',
    result: 'diff.png',
    // 1% threshold
    threshold: 0.01
  }, typeof options.diff === 'object' ? options.diff : {});

  const clipRect = {
    top: 0,
    left: 0,
    width: options.width,
    height: options.height
  };

  notify('rendering before.png');
  return page.property('clipRect', clipRect)
    .then(() => {
      return page.property('content')
        .then(content => fs.writeFile('before.html', content));
    })
    .then(() => {
      notify('rendering before:', diff.before);
      return page.render(diff.before);
    })
    .then(() => {
      notify('disabling stylesheets');
      return page.evaluate(function() {
        var sheets = document.querySelectorAll('link[rel=stylesheet], style');
        [].forEach.call(sheets, function(sheet) {
          sheet.parentNode.removeChild(sheet);
        });
      })
    })
    .then(() => {
      if (diff.nocss) {
        notify('rendering without CSS:', diff.nocss);
        return page.render(diff.nocss);
      }
    })
    .then((css) => {
      notify('inserting critical CSS');
      return page.evaluate(function(css) {
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
      }, [
        '/* critical CSS */',
        css,
        ''
      ].join(CRLF));
    })
    .then(() => {
      return page.property('content')
        .then(content => fs.writeFile('after.html', content));
    })
    .then(() => {
      return page.render(diff.after);
    })
    .then(() => {
      notify('rendering diff:', diff.result);
      const blink = new BlinkDiff({
        imageAPath: diff.before,
        imageBPath: diff.after,

        thresholdType: BlinkDiff.THRESHOLD_PERCENT,
        threshold: diff.threshold,

        imageOutputPath: diff.result
      });

      return new Promise((resolve, reject) => {
        blink.run((error, result) => {
          if (error) {
            reject(error);
          } else {
            notify(blink.hasPassed(result.code)
                   ? chalk.green('Passed')
                   : chalk.red('Failed'));
            notify('Found',
                   chalk.bold(result.differences.toLocaleString()),
                   'differences');
            resolve(css);
          }
        });
      });
    });
};

