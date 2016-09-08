'use strict';

const Phantom = require('phantom');
const BlinkDiff = require('blink-diff');
const getCSS = require('./get-css');

module.exports = function critical(url, options) {

  options = Object.assign({
    width: 1024,
    height: 768,
    threshold: 512
  }, options);

  let instance;
  let page;

  const done = (styles) => {
    page.close();
    instance.exit();
    return styles;
  };

  const renderDiff = (styles) => {
    console.log('diffing...');

    const diff = Object.assign({
      before: 'before.png',
      after: 'after.png',
      nocss: 'nocss.png',
      result: 'diff.png',
      threshold: 0.01
    }, typeof options.diff === 'object' ? options.diff : {});

    const clipRect = {
      top: 0,
      left: 0,
      width: options.width,
      height: options.height
    };

    console.log('rendering before.png');
    return page.property('clipRect', clipRect)
      .then(() => {
        console.log('rendering before:', diff.before);
        return page.render(diff.before);
      })
      .then(() => {
        console.log('disabling stylesheets');
        return page.evaluate(function() {
          // disable stylesheets
          [].forEach.call(document.styleSheets, function(sheet) {
            sheet.disabled = true;
          });
        })
      })
      .then(() => {
        if (diff.nocss) {
          console.log('rendering without CSS:', diff.nocss);
          return page.render(diff.nocss);
        }
      })
      .then(() => {
        console.log('inserting critical CSS');
        return page.evaluate(function(css) {
          var style = document.createElement('style');
          style.textContent = css;
          document.head.appendChild(style);
        }, styles.join(''));
      })
      .then(() => {
        console.log('rendering after:', diff.after);
        return page.render(diff.after);
      })
      .then(() => {
        console.log('rendering diff:', diff.result);
        const blink = new BlinkDiff({
          imageAPath: diff.before,
          imageBPath: diff.after,

          thresholdType: BlinkDiff.THRESHOLD_PERCENT,
          threshold: 0.01, // 1% threshold

          imageOutputPath: diff.result
        });

        return new Promise((resolve, reject) => {
          blink.run((error, result) => {
            if (error) {
              return reject(error);
            } else {
              console.log(blink.hasPassed(result.code) ? 'Passed' : 'Failed');
              console.log('Found ' + result.differences + ' differences.');
              return done(styles);
            }
          });
        });
      });
  };

  return Phantom.create()
    .then(phantom => {
      instance = phantom;
      return instance.createPage();
    })
    .then(thepage => {
      page = thepage;
      return page.open(url);
    })
    .then(status => {
      console.warn('status:', status);
    })
    .then(() => {
      return page.property('viewportSize', {
        width: options.width,
        height: options.height
      });
    })
    .then(() => {
      return page.evaluate(getCSS, options.threshold);
    })
    .then(result => {
      if (result.errors && result.errors.length) {
        console.warn('bad selectors:', result.errors.join('\n'));
      }
      return options.diff
        ? renderDiff(result.styles)
        : done(result.styles);
    }, error => {
      done();
      return error;
    });
};
