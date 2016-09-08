module.exports = function(height) {

  var INDENT = '\t';

  var forEach = function(d, f) {
    return Array.prototype.forEach.call(d, f);
  };

  var filter = function(d, f) {
    return Array.prototype.filter.call(d, f);
  };

  var styles = [];
  var errors = [];

  var addRule = function(rule) {
    styles.push({
      text: rule.cssText
        .replace(/\bcontent: (\w+);/g, 'content: "$1";'),
      selector: rule.selectorText
        .replace(/:{1,2}(before|after)/g, '')
    });
  };

  var matchMedia = function(media) {
    return true; // window.matchMedia(media).matches;
  };

  var processRule = function(rule) {
    switch (rule.type) {
      case CSSRule.STYLE_RULE:
        addRule(rule);
        break;
      case CSSRule.MEDIA_RULE:
        var media = rule.media.mediaText;
        if (matchMedia(media)) {
          var index = styles.length;
          forEach(rule.cssRules, processRule);
          if (styles.length > index) {
            styles.splice(index, 0, {
              text: ['@media', media, '{'].join(' ')
            });
            styles.push({
              text: ['} /* end', media, '*/'].join(' ')
            });
          }
        }
        break;
    }
  };

  filter(document.styleSheets, function(sheet) {
    return ![].some.call(sheet.media, function(media) {
      return media === 'print';
    });
  })
  .forEach(function(sheet) {
    forEach(sheet.cssRules, processRule);
  });

  var valid = styles.filter(function(style, index) {
    if (!style.selector) {
      return true;
    }
    try {
      document.body.webkitMatchesSelector(style.selector);
    } catch (error) {
      errors.push(style.selector);
      return false;
    }
    style.index = index;
    return true;
  });

  var inView = filter(
    document.querySelectorAll('*'),
    function(el) {
      var rect = el.getBoundingClientRect();
      return rect.top < height && rect.bottom > 0;
    }
  );

  return {
    errors: errors,
    styles: valid
      .filter(function(style) {
        return !style.selector || inView.some(function(el) {
          return el.webkitMatchesSelector(style.selector);
        });
      })
      .map(function(style) { return style.text; })
  };

};
