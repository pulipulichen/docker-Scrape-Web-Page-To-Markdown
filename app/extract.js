const cheerio = require('cheerio');
const TurndownService = require('turndown');
const { applyCheerioPlugins } = require('./rules/plugin-runner');

function normalizeHost(hostname) {
  return String(hostname || '')
    .replace(/^www\./i, '')
    .toLowerCase();
}

function resolveRule(parsedUrl, rulesConfig) {
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
  if (!extra) return d;
  return {
    ...d,
    ...extra,
    removeSelectors: [
      ...(d.removeSelectors || []),
      ...(extra.removeSelectors || []),
    ],
    plugins: [...(d.plugins || []), ...(extra.plugins || [])],
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
      return { title: extractTitle($, rule), htmlFragment: $.html(node) };
    }
  }

  const body = $('body');
  if (body.length) {
    return { title: extractTitle($, rule), htmlFragment: $.html(body) };
  }

  return { title: extractTitle($, rule), htmlFragment: $.html() };
}

function htmlToMarkdown(html) {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  return td.turndown(html || '').trim();
}

module.exports = {
  resolveRule,
  extractMainHtml,
  htmlToMarkdown,
};
