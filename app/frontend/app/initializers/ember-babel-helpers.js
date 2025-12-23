function arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) {
    len = arr.length;
  }
  var newArray = new Array(len);
  for (var i = 0; i < len; i++) {
    newArray[i] = arr[i];
  }
  return newArray;
}

function unsupportedIterableToArray(obj, minLen) {
  if (!obj) {
    return;
  }
  if (typeof obj === 'string') {
    return arrayLikeToArray(obj, minLen);
  }
  var type = Object.prototype.toString.call(obj).slice(8, -1);
  if (type === 'Object' && obj.constructor) {
    type = obj.constructor.name;
  }
  if (type === 'Map' || type === 'Set') {
    return Array.from(obj);
  }
  if (/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(type)) {
    return arrayLikeToArray(obj, minLen);
  }
}

export function initialize() {
  // Access ember-babel at runtime to avoid module loading issues.
  // The module system will make this available when this initializer runs.
  try {
    var require = window.require;
    if (require) {
      var EmberBabel = require('ember-babel').default;
      if (EmberBabel) {
        if (!EmberBabel.arrayLikeToArray) {
          EmberBabel.arrayLikeToArray = arrayLikeToArray;
        }
        if (!EmberBabel.unsupportedIterableToArray) {
          EmberBabel.unsupportedIterableToArray = unsupportedIterableToArray;
        }
      }
    }
  } catch (e) {
    // If we can't access ember-babel, that's okay - the polyfill might not be needed
    // or may already be provided by the build
  }
}

export default {
  initialize
};
