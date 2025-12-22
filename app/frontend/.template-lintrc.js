'use strict';

module.exports = {
  extends: 'recommended',
  rules: {
    'quotes': false, // TODO: blech
    'no-inline-styles': false,
    'block-indentation': false,
    'img-alt-attributes': false, // TODO: yeah prolly
    'self-closing-void-elements': false,
    'simple-unless': false, // their bad
    'no-html-comments': false,
    'link-rel-noopener': false,
    'no-invalid-interactive': false, // TODO: this seems busted
    'no-partial': 'error', // All partials converted to components for Ember 3.16
  }
};
