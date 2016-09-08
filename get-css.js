module.exports = function(height) {

  var forEach = function(d, f) {
    return Array.prototype.forEach.call(d, f);
  };

  var filter = function(d, f) {
    return Array.prototype.filter.call(d, f);
  };

  var styles = [];
  forEach(document.styleSheets, function(sheet) {
    forEach(sheet.cssRules, function(rule) {
      // only include CSSRule.STYLE_RULE
      if (rule.type === 1) {
        var text = rule.cssText;
        styles.push({
          text: text,
          selector: text.match(/^([^\{])+/)[0].trim()
        });
      }
    });
  });

  var errors = [];
  styles = styles.filter(function(style) {
    if (!style.selector) {
      return false;
    }
    try {
      document.body.webkitMatchesSelector(style.selector);
    } catch (error) {
      errors.push(style.selector);
      return false;
    }
    return true;
  });

  var inView = filter(document.querySelectorAll('*'), function(el) {
    return el.offsetTop < height;
  });

  return {
    errors: errors,
    styles: styles
      .filter(function(style) {
        return inView.some(function(el) {
          return el.webkitMatchesSelector(style.selector);
        });
      })
      .map(function(style) { return style.text; })
  };
};

