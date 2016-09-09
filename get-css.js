module.exports = function(height) {

  var INDENT = '  ';

  var forEach = function(d, f) {
    return Array.prototype.forEach.call(d, f);
  };

  var filter = function(d, f) {
    return Array.prototype.filter.call(d, f);
  };

  var styles = [];
  var errors = [];
  var rejects = [];

  var addRule = function(rule) {
    styles.push({
      text: rule.cssText
        .replace(/\bcontent: (\w+);/g, 'content: "$1";'),
      selector: (rule.selectorText || '')
        // strip pseudo-classes
        .replace(/:{1,2}(before|after|-webkit-[-\w]+)/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/g, '')
    });
  };

  var matchMedia = function(media) {
    return true; // window.matchMedia(media).matches;
  };

  var processRule = function(rule) {
    switch (rule.type) {
      case CSSRule.STYLE_RULE:
      case CSSRule.FONT_FACE_RULE:
        addRule(rule);
        break;

      case CSSRule.MEDIA_RULE:
        var media = rule.media.mediaText;
        var index = styles.length;
        forEach(rule.cssRules, processRule);
        if (styles.length > index) {
          styles.slice(index, index + (styles.length - index))
            .forEach(function(style) {
              style.text = INDENT + style.text;
            });
          styles.splice(index, 0, {
            text: ['@media', media, '{'].join(' ')
          });
          styles.push({
            text: ['}', '/* end @media', media, '*/'].join(' ')
          });
        }
        break;

      case CSSRule.IMPORT_RULE:
        processStylesheet(rule.styleSheet);
        break;
    }
  };

  var isValidStylesheet = function(sheet) {
    return [].some.call(sheet.media, function(media) {
      return media === 'screen' || media === 'all';
    });
  };

  var processStylesheet = function(sheet) {
    forEach(sheet.cssRules, processRule);
  };

  filter(document.styleSheets, isValidStylesheet)
    .forEach(processStylesheet);

  var inView = filter(
    document.querySelectorAll('*'),
    function(el) {
      // XXX: if something has display: none, include its styles
      // because we can't calculate its bounding box
      var computed = window.getComputedStyle(el);
      if (computed.getPropertyValue('display') === 'none') {
        return true;
      }
      // otherwise, only include it if its bounding box's top and bottom fall
      // within the "visible" range
      var rect = el.getBoundingClientRect();
      return rect.top < height && rect.bottom > 0;
    }
  );

  var valid = styles.filter(function(style, index) {
    try {
      return !style.selector || inView.some(function(el) {
        return el.webkitMatchesSelector(style.selector);
      });
    } catch (error) {
      errors.push(style.selector);
      return false;
    }
  });

  // strip @media preamble and postamble lines without
  // any rules in between them
  for (var i = 0; i < valid.length; i++) {
    var style = valid[i];
    if (style.text.indexOf('@media') === 0) {
      if (valid[i + 1] && valid[i + 1].text.indexOf('end @media') > -1) {
        valid.splice(i, 2);
        i -= 2;
      }
    }
  }

  return {
    styles: valid.map(function(style) { return style.text; }),
    errors: errors
  };

};
