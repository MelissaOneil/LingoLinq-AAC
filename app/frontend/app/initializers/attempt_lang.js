import stashes from '../utils/_stashes';
import i18n from '../utils/i18n';
import persistence from '../utils/persistence';
import extras from '../utils/extras';
import capabilities from '../utils/capabilities';

export default {
  name: 'attempt_lang',
  initialize: function() {
    var lang = stashes.get('display_lang');
    var translated = i18n.locales_translated || [];
    var advance = function() {
      extras.advance('lang');
      i18n.lang_overrides = {};
      i18n.load_lang_override(i18n.langs.preferred || i18n.langs.fallback);
    };
    if(!lang) {
      var nav_lang = navigator.language;
      var base_lang = nav_lang.split(/-|_/)[0];
      // Don't use any of the auto-translated
      // locales by default, should only default
      // to user-translated locales
      if(translated.indexOf(base_lang) != -1) {
        lang = nav_lang;
      } else if(translated.indexOf(base_lang + '*') != -1) {
        // Allow an auto-translated language, as it's
        // better than nothing.
        lang = nav_lang;
      } else {
        lang = 'en';
      }
    }
    lang.replace(/-/, '_');
    i18n.langs = i18n.langs || {};
    var base_lang = lang.split(/-|_/)[0];
    i18n.langs.preferred = lang;
    i18n.langs.fallback = base_lang;
    if(lang.match(/^en/)) {
      if(document.body.parentNode) {
        document.body.parentNode.setAttribute('lang', 'en');
      }
      advance();
    } else {
      var try_lang = function(lang, success, error) {
        if(lang == 'en') {
          return success();
        }
        var path = "locales/" + lang + ".json";
        if(capabilities.installed_app && window.cordova) {
          capabilities.storage.local_json(path).then(function(res) {
            i18n.langs[lang] = res;
            success();
          }, function(err) {
            error();
          });
        } else {
          var ajax_path = "/" + path;
          if(capabilities.installed_app) { ajax_path = "." + ajax_path; }
          persistence.ajax(ajax_path, {type: 'GET'}).then(function(res) {
            i18n.langs[lang] = res;
            success();
          }, function(err) {
            if(err.result && typeof(err.result) == 'object') {
              i18n.langs[lang] = err.result;
              success();
            } else {
              error();
            }
          });  
        }
      };
      var get_base_lang = function() {
        try_lang(base_lang, function() {
          if(document.body.parentNode) {
            document.body.parentNode.setAttribute('lang', base_lang);
          }
          advance();
        }, function() {
          if(document.body.parentNode) {
            document.body.parentNode.setAttribute('lang', 'en');
          }
          // TODO: make a note somewhere that the lang couldn't load
          advance();
        });
      };
      // try to retrieve base lang
      if(lang != base_lang) {
        try_lang(lang, function() {
          // TODO: if the full lang is comprehensive,
          // don't need to load the base lang as well
          get_base_lang();
        }, function() { 
          get_base_lang(); 
        });
      } else {
        get_base_lang();
      }
    }
  }
};
