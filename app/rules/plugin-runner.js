const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, 'plugins');
const cache = new Map();

function pluginExportToFn(mod, name) {
  if (typeof mod === 'function') return mod;
  if (mod && typeof mod.default === 'function') return mod.default;
  if (mod && typeof mod.filter === 'function') return mod.filter;
  throw new Error(`Cheerio plugin "${name}" must export a function (or { filter })`);
}

function getPluginFn(name) {
  if (cache.has(name)) return cache.get(name);
  if (!/^[a-zA-Z0-9_-]+$/.test(String(name))) {
    throw new Error(`Invalid cheerio plugin name: "${name}"`);
  }
  const file = path.join(PLUGINS_DIR, `${name}.js`);
  if (!fs.existsSync(file)) {
    throw new Error(`Unknown cheerio plugin: "${name}"`);
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const mod = require(file);
  const fn = pluginExportToFn(mod, name);
  cache.set(name, fn);
  return fn;
}

/**
 * Run named plugins in order. Each plugin receives the cheerio root from cheerio.load()
 * and must return that same root (or an equivalent cheerio instance for the same document).
 */
function applyCheerioPlugins($, names) {
  let out = $;
  for (const name of names || []) {
    const fn = getPluginFn(name);
    const next = fn(out);
    if (next == null) {
      throw new Error(`Cheerio plugin "${name}" must return the cheerio root`);
    }
    out = next;
  }
  return out;
}

module.exports = { applyCheerioPlugins, getPluginFn };
