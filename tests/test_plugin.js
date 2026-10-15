/**
 * Offline tests for docsify-ai-chatbot.
 *
 * The file runs twice: once through require() to test the parts, and once in a
 * vm sandbox with a fake browser window, the way a <script> tag runs it. The
 * fake docsify calls the plugin with a hook object and a vm, like docsify does.
 *
 * Run: node plugins/docsify/tests/test_plugin.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, '..', 'src', 'docsify-ai-chatbot.js');
const SOURCE = fs.readFileSync(FILE, 'utf8');
const api = require(FILE);
const { readOptions, DEFAULT_SCRIPT_URL } = api;

const passed = [];
const failed = [];

function check(name, fn) {
  try {
    fn();
    passed.push(name);
    console.log('  PASS  ' + name);
  } catch (err) {
    failed.push(name);
    console.log('  FAIL  ' + name + '  -> ' + err.message);
  }
}

const ID = 'asyntai_1a2b3c4d5e6f';

/** A small fake browser: enough DOM for the loader, plus a console spy. */
function fakeWindow(opts) {
  const o = opts || {};
  const head = [];
  const listeners = {};
  const errors = [];
  const existing = o.existing || null;
  const doc = {
    readyState: o.readyState || 'complete',
    head: { appendChild: (el) => head.push(el) },
    createElement: (tag) => ({
      tag,
      attrs: {},
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
    }),
    querySelector: (sel) => {
      if (sel !== 'script[data-asyntai-id]') return null;
      if (existing) return existing;
      return head.find((el) => el.attrs && el.attrs['data-asyntai-id']) || null;
    },
  };
  const win = {
    document: doc,
    console: { error: (m) => errors.push(m) },
    addEventListener: (ev, fn) => {
      (listeners[ev] = listeners[ev] || []).push(fn);
    },
    fire: (ev) => (listeners[ev] || []).forEach((fn) => fn()),
    head,
    errors,
  };
  if ('docsify' in o) win.$docsify = o.docsify;
  return win;
}

/** Runs the file as a browser <script> would: no module, `window` global. */
function runAsScript(win) {
  const sandbox = { window: win };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
}

/** Does what docsify does with window.$docsify: builds config, runs plugins. */
function fakeDocsify(win) {
  const hooks = { mounted: [] };
  const vmObj = { config: null };
  const config =
    typeof win.$docsify === 'function' ? win.$docsify(vmObj) : win.$docsify;
  vmObj.config = config;
  const hook = {
    init() {},
    beforeEach() {},
    afterEach() {},
    doneEach() {},
    ready() {},
    mounted: (fn) => hooks.mounted.push(fn),
  };
  (config.plugins || []).forEach((p) => p(hook, vmObj));
  hooks.mounted.forEach((fn) => fn());
  return config;
}

console.log('\nOptions');

check('object form with a valid widget ID is accepted', () => {
  assert.deepStrictEqual(readOptions({ asyntai: { widgetId: ID } }), {
    widgetId: ID,
    scriptUrl: DEFAULT_SCRIPT_URL,
  });
});

check('short string form is accepted', () => {
  assert.strictEqual(readOptions({ asyntai: ID }).widgetId, ID);
});

check('spaces around the widget ID are trimmed', () => {
  assert.strictEqual(readOptions({ asyntai: { widgetId: '  ' + ID + ' ' } }).widgetId, ID);
});

check('missing asyntai key gives a clear error', () => {
  assert.match(readOptions({}).error, /add your widget ID/);
});

check('missing config gives a clear error', () => {
  assert.match(readOptions(undefined).error, /add your widget ID/);
});

check('empty widget ID gives a clear error', () => {
  assert.match(readOptions({ asyntai: { widgetId: '' } }).error, /add your widget ID/);
});

check('a widget ID without the asyntai_ prefix is refused', () => {
  assert.match(readOptions({ asyntai: { widgetId: '1a2b3c' } }).error, /does not look like/);
});

check('a widget ID with markup in it is refused', () => {
  assert.match(
    readOptions({ asyntai: { widgetId: 'asyntai_1"><script>' } }).error,
    /does not look like/,
  );
});

check('a number as widget ID is refused', () => {
  assert.ok(readOptions({ asyntai: { widgetId: 123 } }).error);
});

check('scriptUrl overrides the default', () => {
  const o = readOptions({ asyntai: { widgetId: ID, scriptUrl: 'https://x.test/w.js' } });
  assert.strictEqual(o.scriptUrl, 'https://x.test/w.js');
});

check('blank scriptUrl falls back to the default', () => {
  assert.strictEqual(
    readOptions({ asyntai: { widgetId: ID, scriptUrl: ' ' } }).scriptUrl,
    DEFAULT_SCRIPT_URL,
  );
});

console.log('\nRegistration (run as a <script> tag)');

check('creates window.$docsify when the page has none', () => {
  const win = fakeWindow({});
  runAsScript(win);
  assert.strictEqual(typeof win.$docsify, 'object');
  assert.strictEqual(win.$docsify.plugins.length, 1);
});

check('keeps the existing config and its plugins', () => {
  const other = function other() {};
  const win = fakeWindow({ docsify: { name: 'Docs', plugins: [other] } });
  runAsScript(win);
  assert.strictEqual(win.$docsify.name, 'Docs');
  assert.strictEqual(win.$docsify.plugins.length, 2);
  assert.strictEqual(win.$docsify.plugins[1], other);
});

check('wraps a function-style $docsify config', () => {
  const win = fakeWindow({
    docsify: function (vmArg) {
      return { name: 'Fn', asyntai: { widgetId: ID }, plugins: [] };
    },
  });
  runAsScript(win);
  assert.strictEqual(typeof win.$docsify, 'function');
  const config = win.$docsify({});
  assert.strictEqual(config.name, 'Fn');
  assert.strictEqual(config.plugins.length, 1);
});

check('nothing is exported to the page', () => {
  const win = fakeWindow({});
  runAsScript(win);
  assert.deepStrictEqual(
    Object.keys(win).filter((k) => !['document', 'console', 'addEventListener', 'fire', 'head', 'errors', '$docsify'].includes(k)),
    [],
  );
});

console.log('\nWidget loading (through a fake docsify)');

check('adds one widget script with the widget ID', () => {
  const win = fakeWindow({ docsify: { asyntai: { widgetId: ID } } });
  runAsScript(win);
  fakeDocsify(win);
  assert.strictEqual(win.head.length, 1);
  assert.strictEqual(win.head[0].tag, 'script');
  assert.strictEqual(win.head[0].src, DEFAULT_SCRIPT_URL);
  assert.strictEqual(win.head[0].async, true);
  assert.strictEqual(win.head[0].attrs['data-asyntai-id'], ID);
});

check('function-style config loads the widget too', () => {
  const win = fakeWindow({ docsify: () => ({ asyntai: ID }) });
  runAsScript(win);
  fakeDocsify(win);
  assert.strictEqual(win.head.length, 1);
  assert.strictEqual(win.head[0].attrs['data-asyntai-id'], ID);
});

check('custom scriptUrl is used', () => {
  const win = fakeWindow({ docsify: { asyntai: { widgetId: ID, scriptUrl: 'https://x.test/w.js' } } });
  runAsScript(win);
  fakeDocsify(win);
  assert.strictEqual(win.head[0].src, 'https://x.test/w.js');
});

check('waits for the load event when the page is still loading', () => {
  const win = fakeWindow({ readyState: 'interactive', docsify: { asyntai: ID } });
  runAsScript(win);
  fakeDocsify(win);
  assert.strictEqual(win.head.length, 0);
  win.fire('load');
  assert.strictEqual(win.head.length, 1);
});

check('a page that already has the Asyntai snippet gets no second one', () => {
  const win = fakeWindow({ existing: { attrs: {} }, docsify: { asyntai: ID } });
  runAsScript(win);
  fakeDocsify(win);
  assert.strictEqual(win.head.length, 0);
});

check('loading the plugin file twice still adds one widget', () => {
  const win = fakeWindow({ docsify: { asyntai: ID } });
  runAsScript(win);
  runAsScript(win);
  fakeDocsify(win);
  assert.strictEqual(win.head.length, 1);
});

check('missing widget ID: no script, one console error', () => {
  const win = fakeWindow({ docsify: { name: 'Docs' } });
  runAsScript(win);
  fakeDocsify(win);
  assert.strictEqual(win.head.length, 0);
  assert.strictEqual(win.errors.length, 1);
  assert.match(win.errors[0], /docsify-ai-chatbot/);
});

check('wrong widget ID: no script, one console error', () => {
  const win = fakeWindow({ docsify: { asyntai: 'abc' } });
  runAsScript(win);
  fakeDocsify(win);
  assert.strictEqual(win.head.length, 0);
  assert.match(win.errors[0], /does not look like/);
});

check('a wrong widget ID does not stop other plugins', () => {
  let ran = false;
  const win = fakeWindow({ docsify: { asyntai: 'abc', plugins: [(hook) => hook.mounted(() => (ran = true))] } });
  runAsScript(win);
  fakeDocsify(win);
  assert.strictEqual(ran, true);
});

console.log('\nPackage');

const pkg = require('../package.json');

check('package entry points all name the plugin file', () => {
  for (const k of ['main', 'browser', 'unpkg', 'jsdelivr']) {
    assert.strictEqual(path.normalize(pkg[k]), path.normalize('./src/docsify-ai-chatbot.js'), k);
  }
});

check('keywords include docsify and docsify-plugin', () => {
  assert.ok(pkg.keywords.includes('docsify'));
  assert.ok(pkg.keywords.includes('docsify-plugin'));
});

check('homepage is the asyntai.com docs page', () => {
  assert.strictEqual(pkg.homepage, 'https://asyntai.com/documentation/integrations/docsify/');
});

check('the source parses as plain ES5-era script (no import/export)', () => {
  assert.ok(!/^\s*(import|export)\s/m.test(SOURCE));
  new vm.Script(SOURCE);
});

console.log('\n' + passed.length + ' passed, ' + failed.length + ' failed');
process.exit(failed.length ? 1 : 0);
