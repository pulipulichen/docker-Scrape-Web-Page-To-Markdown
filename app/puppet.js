const rulesConfig = require('./rules');
const { resolveRule, extractMainHtml, htmlToMarkdown } = require('./extract');
const { fetchRenderedHtml } = require('./scrape');

const MIN_MARKDOWN_CHARS = 10;

/** Scrape with Puppeteer, apply rules, convert HTML fragment to Markdown. */
async function parsePage(url, excludePlugins, fetchOverrides) {
  let rule;
  try {
    rule = resolveRule(url, rulesConfig, { excludePlugins });
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return {
      ok: false,
      status: 400,
      body: { error: 'invalid request', detail: msg },
    };
  }
  const html = await fetchRenderedHtml(url.href, rule, fetchOverrides);
  const { htmlFragment } = extractMainHtml(html, rule);
  const markdown = htmlToMarkdown(htmlFragment).trim();
  if (markdown.length < MIN_MARKDOWN_CHARS) {
    return {
      ok: false,
      status: 422,
      body: {
        error: 'extracted content too short',
        detail: `Markdown length is ${markdown.length}; minimum is ${MIN_MARKDOWN_CHARS}.`,
      },
    };
  }
  return {
    ok: true,
    body: {
      url: url.href,
      content: markdown,
    },
  };
}

module.exports = { parsePage, MIN_MARKDOWN_CHARS };
