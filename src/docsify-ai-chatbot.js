/*!
 * docsify-ai-chatbot
 * Add the Asyntai AI chat assistant to your docsify site.
 * https://asyntai.com/documentation/integrations/docsify/
 * MIT License
 */

/**
 * docsify renders Markdown in the browser, so there is no build step to put a
 * script into the HTML. This plugin registers itself with docsify and adds the
 * ordinary Asyntai embed loader once, after docsify has mounted the page.
 *
 * Configuration lives in window.$docsify, like every other docsify plugin:
 *
 *   window.$docsify = { asyntai: { widgetId: 'asyntai_1a2b3c4d5e6f' } };
 *
 * docsify is a single-page app: moving between pages changes only the hash, so
 * the widget loads once and stays open with its conversation while the reader
 * moves around the docs.
 */
(function (root) {
  'use strict';

  var DEFAULT_SCRIPT_URL = 'https://widget.asyntai.com/static/js/chat-widget.js';
  var WIDGET_ID_PATTERN = /^asyntai_[A-Za-z0-9]+$/;
  var NAME = 'docsify-ai-chatbot';

  /**
   * Reads `asyntai` from the docsify config. Accepts the short form
   * `asyntai: 'asyntai_...'` as well. Returns null and logs a clear message
   * when the widget ID is missing or wrong: a docs site must never break
   * because of a chat setting.
   */
  function readOptions(config) {
    var raw = config && config.asyntai;
    var opts = typeof raw === 'string' ? { widgetId: raw } : raw || {};
    var widgetId = typeof opts.widgetId === 'string' ? opts.widgetId.trim() : '';

    if (!widgetId) {
      return {
        error:
          NAME +
          ': add your widget ID to window.$docsify, for example ' +
          "asyntai: { widgetId: 'asyntai_1a2b3c4d5e6f' }. Copy it from the " +
          'Install page of your Asyntai dashboard.',
      };
    }
    if (!WIDGET_ID_PATTERN.test(widgetId)) {
      return {
        error:
          NAME +
          ': "' +
          widgetId +
          '" does not look like a widget ID. It starts with asyntai_, for ' +
          'example asyntai_1a2b3c4d5e6f.',
      };
    }

    var scriptUrl =
      typeof opts.scriptUrl === 'string' && opts.scriptUrl.trim()
        ? opts.scriptUrl.trim()
        : DEFAULT_SCRIPT_URL;

    return { widgetId: widgetId, scriptUrl: scriptUrl };
  }

  /**
   * Adds the widget script once. It waits for the page's load event: an
   * ordinary async script holds the load event open until its own fetch
   * finishes, so an unreachable server would delay the docs page.
   * A page that already has an Asyntai snippet keeps it and gets no second one.
   */
  function loadWidget(win, options) {
    var doc = win.document;
    var add = function () {
      if (doc.querySelector('script[data-asyntai-id]')) return;
      var s = doc.createElement('script');
      s.src = options.scriptUrl;
      s.async = true;
      s.setAttribute('data-asyntai-id', options.widgetId);
      doc.head.appendChild(s);
    };
    if (doc.readyState === 'complete') {
      add();
    } else {
      win.addEventListener('load', add);
    }
  }

  function createPlugin(win) {
    return function asyntaiDocsifyPlugin(hook, vm) {
      hook.mounted(function () {
        var options = readOptions(vm && vm.config);
        if (options.error) {
          if (win.console) win.console.error(options.error);
          return;
        }
        loadWidget(win, options);
      });
    };
  }

  /**
   * Puts the plugin first in window.$docsify.plugins. docsify also accepts
   * window.$docsify as a function that returns the config; that form is
   * wrapped so the plugin still lands in the returned config.
   */
  function register(win) {
    var plugin = createPlugin(win);
    var current = win.$docsify;

    if (typeof current === 'function') {
      win.$docsify = function (vm) {
        var config = current.call(this, vm) || {};
        config.plugins = [plugin].concat(config.plugins || []);
        return config;
      };
    } else {
      win.$docsify = current || {};
      win.$docsify.plugins = [plugin].concat(win.$docsify.plugins || []);
    }
    return plugin;
  }

  var api = {
    readOptions: readOptions,
    loadWidget: loadWidget,
    createPlugin: createPlugin,
    register: register,
    DEFAULT_SCRIPT_URL: DEFAULT_SCRIPT_URL,
  };

  if (typeof module === 'object' && module.exports) {
    // Required from Node (the tests): export the parts, register nothing.
    module.exports = api;
  } else if (root && root.document) {
    register(root);
  }
})(typeof window !== 'undefined' ? window : this);
