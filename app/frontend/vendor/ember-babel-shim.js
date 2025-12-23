/*
 * Predefine an `ember-babel` AMD module with all expected helpers before
 * vendor modules execute. This avoids runtime errors when earlier modules
 * call `(0, _emberBabel.arrayLikeToArray)(...)`.
 */
(function() {
  function arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) {
      len = arr.length;
    }
    var out = new Array(len);
    for (var i = 0; i < len; i++) {
      out[i] = arr[i];
    }
    return out;
  }

  function unsupportedIterableToArray(o, minLen) {
    if (!o) {
      return;
    }
    if (typeof o === 'string') {
      return arrayLikeToArray(o, minLen);
    }
    var type = Object.prototype.toString.call(o).slice(8, -1);
    if (type === 'Object' && o.constructor) {
      type = o.constructor.name;
    }
    if (type === 'Map' || type === 'Set') {
      return Array.from(o);
    }
    if (type === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(type)) {
      return arrayLikeToArray(o, minLen);
    }
  }

  // Minimal implementations mirroring vendor's ember-babel exports
  var setPrototypeOf = Object.setPrototypeOf || function (obj, proto) { obj.__proto__ = proto; return obj; };
  var nativeWrapperCache = typeof Map !== 'undefined' ? new Map() : { get: function(){}, has: function(){}, set: function(){} };
  function wrapNativeSuper(Class) {
    if (nativeWrapperCache.has && nativeWrapperCache.has(Class)) {
      return nativeWrapperCache.get(Class);
    }
    function Wrapper() {}
    Wrapper.prototype = Object.create(Class && Class.prototype || {}, {
      constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true }
    });
    nativeWrapperCache.set && nativeWrapperCache.set(Class, Wrapper);
    return setPrototypeOf(Wrapper, Class);
  }
  function classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }
  function inheritsLoose(subClass, superClass) {
    if (typeof superClass !== 'function' && superClass !== null) {
      throw new TypeError('Super expression must either be null or a function');
    }
    subClass.prototype = Object.create(superClass === null ? null : superClass.prototype, {
      constructor: { value: subClass, writable: true, configurable: true }
    });
    if (superClass !== null) {
      setPrototypeOf(subClass, superClass);
    }
  }
  function taggedTemplateLiteralLoose(strings, raw) {
    if (!raw) { raw = strings.slice(0); }
    strings.raw = raw; return strings;
  }
  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function createClass(Constructor, protoProps, staticProps) {
    if (protoProps !== null && protoProps !== undefined) {
      _defineProperties(Constructor.prototype, protoProps);
    }
    if (staticProps !== null && staticProps !== undefined) {
      _defineProperties(Constructor, staticProps);
    }
    return Constructor;
  }
  function assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
  }
  function possibleConstructorReturn(self, call) {
    if (typeof call === 'object' && call !== null || typeof call === 'function') {
      return call;
    }
    return assertThisInitialized(self);
  }
  function objectDestructuringEmpty(obj) {
    if (obj === null || obj === undefined) {
      throw new TypeError('Cannot destructure undefined');
    }
  }

  // Store helpers globally for easy access
  if (typeof window !== 'undefined') {
    window.__emberBabelHelpers = {
      arrayLikeToArray: arrayLikeToArray,
      unsupportedIterableToArray: unsupportedIterableToArray,
      assertThisInitialized: assertThisInitialized,
      classCallCheck: classCallCheck,
      createClass: createClass,
      inheritsLoose: inheritsLoose,
      objectDestructuringEmpty: objectDestructuringEmpty,
      possibleConstructorReturn: possibleConstructorReturn,
      taggedTemplateLiteralLoose: taggedTemplateLiteralLoose,
      wrapNativeSuper: wrapNativeSuper
    };
  }

  try {
    var defineFn = (typeof window !== 'undefined' && window.define) || (typeof define !== 'undefined' && define);
    if (defineFn && typeof defineFn === 'function') {
      // If a previous definition exists and loader supports unsee, reset it
      var requireFn = (typeof window !== 'undefined' && window.require) || (typeof require !== 'undefined' && require);
      if (requireFn && typeof requireFn.unsee === 'function') {
        try { requireFn.unsee('ember-babel'); } catch (_) {}
      }

      defineFn('ember-babel', ['exports'], function(_exports) {
        _exports.arrayLikeToArray = arrayLikeToArray;
        _exports.unsupportedIterableToArray = unsupportedIterableToArray;
        _exports.assertThisInitialized = assertThisInitialized;
        _exports.classCallCheck = classCallCheck;
        _exports.createClass = createClass;
        _exports.inheritsLoose = inheritsLoose;
        _exports.objectDestructuringEmpty = objectDestructuringEmpty;
        _exports.possibleConstructorReturn = possibleConstructorReturn;
        _exports.taggedTemplateLiteralLoose = taggedTemplateLiteralLoose;
        _exports.wrapNativeSuper = wrapNativeSuper;
      });
    }
  } catch (e) {
    // Non-fatal: the loader wasn't ready yet; in practice Ember loader is present
  }

  // Critical: Hook define() to patch Ember's ember-babel definition so it includes our helpers
  if (typeof window !== 'undefined' && typeof window.define === 'function') {
    var originalDefine = window.define;
    window.define = function(moduleName, deps, factory) {
      // Check if this is Ember's ember-babel definition (not ours)
      if (moduleName === 'ember-babel' && typeof factory === 'function' && 
          factory.toString().indexOf('arrayLikeToArray') === -1) {
        // This is Ember's version that's missing arrayLikeToArray
        // Wrap the factory to add our missing helpers
        var emberFactory = factory;
        factory = function(exports) {
          // Call Ember's factory
          var result = emberFactory(exports);
          // Patch in missing helpers
          if (!exports.arrayLikeToArray) {
            exports.arrayLikeToArray = window.__emberBabelHelpers.arrayLikeToArray;
          }
          if (!exports.unsupportedIterableToArray) {
            exports.unsupportedIterableToArray = window.__emberBabelHelpers.unsupportedIterableToArray;
          }
          return result;
        };
      }
      return originalDefine.call(this, moduleName, deps, factory);
    };
    // Copy all properties from original define
    for (var prop in originalDefine) {
      if (originalDefine.hasOwnProperty(prop)) {
        window.define[prop] = originalDefine[prop];
      }
    }
  }
})();
