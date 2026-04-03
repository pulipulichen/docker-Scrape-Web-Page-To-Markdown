const cheerio = require('cheerio');
const TurndownService = require('turndown');
const { applyCheerioPlugins } = require('./rules/plugin-runner');

function normalizeHost(hostname) {
  return String(hostname || '')
    .replace(/^www\./i, '')
    .toLowerCase();
}

const PLUGIN_NAME_RE = /^[a-zA-Z0-9_-]+$/;

function normalizeExcludePlugins(list) {
  const exclude = new Set();
  for (const item of list || []) {
    if (item == null || item === '') continue;
    const s = String(item).trim();
    if (!s) continue;
    if (!PLUGIN_NAME_RE.test(s)) {
      throw new Error(`Invalid plugin name in excludePlugins: "${s}"`);
    }
    exclude.add(s);
  }
  return exclude;
}

function mergeResolvedPlugins(d, extra, apiExclude) {
  const merged = [...(d.plugins || []), ...((extra && extra.plugins) || [])];
  const exclude = normalizeExcludePlugins([
    ...(d.excludePlugins || []),
    ...((extra && extra.excludePlugins) || []),
    ...(apiExclude || []),
  ]);
  const seen = new Set();
  const out = [];
  for (const name of merged) {
    if (exclude.has(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function resolveRule(parsedUrl, rulesConfig, options = {}) {
  const host = normalizeHost(parsedUrl.hostname);
  const domains = rulesConfig.domains || {};
  let extra = null;
  for (const [domain, cfg] of Object.entries(domains)) {
    const d = domain.toLowerCase();
    if (host === d || host.endsWith(`.${d}`)) {
      extra = cfg;
      break;
    }
  }
  const d = { ...rulesConfig.default };
  const apiExclude = options.excludePlugins;
  if (!extra) {
    return {
      ...d,
      plugins: mergeResolvedPlugins(d, null, apiExclude),
    };
  }
  const { plugins: _p, excludePlugins: _e, ...extraRest } = extra;
  return {
    ...d,
    ...extraRest,
    removeSelectors: [
      ...(d.removeSelectors || []),
      ...(extra.removeSelectors || []),
    ],
    plugins: mergeResolvedPlugins(d, extra, apiExclude),
    contentSelectors: extra.contentSelectors ?? d.contentSelectors,
  };
}

function textLen($, el) {
  return $(el).text().replace(/\s+/g, ' ').trim().length;
}

function extractTitle($, rule) {
  if (rule.titleSelector) {
    const t = $(rule.titleSelector).first().text().trim();
    if (t) return t;
  }
  const og = $('meta[property="og:title"]').attr('content');
  if (og && og.trim()) return og.trim();
  const title = $('title').first().text().trim();
  return title || '';
}

function extractMainHtml(html, rule) {
  let $ = cheerio.load(html);
  const minLen = rule.minTextLength ?? 120;

  for (const sel of rule.removeSelectors || []) {
    try {
      $(sel).remove();
    } catch {
      /* ignore invalid selector */
    }
  }

  $ = applyCheerioPlugins($, rule.plugins);

  for (const sel of rule.contentSelectors || []) {
    const node = $(sel).first();
    if (node.length && textLen($, node) >= minLen) {
      // console.log('matchedSelector', sel);
      // console.log('htmlFragment', $.html(node));
      return {
        title: extractTitle($, rule),
        htmlFragment: $.html(node),
        matchedSelector: sel,
      };
    }
  }

  const body = $('body');
  if (body.length) {
    return {
      title: extractTitle($, rule),
      htmlFragment: $.html(body),
      matchedSelector: 'body',
    };
  }

  return {
    title: extractTitle($, rule),
    htmlFragment: $.html(),
    matchedSelector: '(document)',
  };
}

function htmlToMarkdown(html) {
  // console.log('html', html);
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  // console.log('td.turndown(html)', td.turndown(html || ''));
  return td.turndown(html || '').trim();
}

module.exports = {
  resolveRule,
  extractMainHtml,
  htmlToMarkdown,
};
