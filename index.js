'use strict';

const chalk = require('chalk');
const Phantom = require('phantom');
const cssnano = require('cssnano');

const getCSS = require('./get-css');
const waitFor = require('./wait-for');
const renderDiff = require('./diff');

const DEFAULT_OPTIONS = {
  phantom: ['--ignore-ssl-errors=yes'],
  width: 1200,
  height: 800,
  threshold: 800,
  timeout: 5000
};

module.exports = function critical(url, options) {

  options = Object.assign(DEFAULT_OPTIONS, options);

  let instance;
  let page;

  const done = (css) => {
    page.close();
    instance.exit();
    return css;
  };

  const notify = function() {
    arguments[0] = chalk.yellow(arguments[0]);
    console.warn.apply(console, arguments);
  };

  notify('starting up...');
  return Phantom.create(options.phantom)
    .then(phantom => {
      instance = phantom;
      notify('creating page...');
      return instance.createPage();
    })
    .then(thepage => {
      page = thepage;
      notify('opening:', url);
      return page.open(url);
    })
    .then(status => {
      notify('status:', status);
      notify('waiting for document ready...');
      return waitFor(page, function() {
        return document.readyState === 'complete';
      }, options.timeout);
    })
    .then(() => {
      notify('setting viewport size: %d x %d', options.width, options.height);
      return page.property('viewportSize', {
        width: options.width,
        height: options.height
      });
    })
    .then(() => {
      return page.evaluate(getCSS, options.threshold);
    })
    .then(result => {
      if (!result) {
        console.error('no styles found!');
        return done();
      }
      if (result.errors.length) {
        let errors = result.errors;
        notify('got %d invalid selectors (per PhantomJS):', errors.length);
        errors.forEach((error, i) => {
          notify((i + 1) + '.', chalk.red(error));
        });
      }
      return result.styles.join('\n');
    })
    .then(css => {
      return cssnano.process(css);
    })
    .then(css => {
      return options.diff
        ? renderDiff(page, css, options, notify)
            .then(done)
        : done(css);
    }, error => {
      done();
      return error;
    });
};
