const express = require('express');
const rulesConfig = require('./rules');
const { createSerialQueue } = require('./queue');
const { resolveRule, extractMainHtml, htmlToMarkdown } = require('./extract');
const { fetchRenderedHtml } = require('./scrape');

const PORT = Number(process.env.PORT || 3000);
const enqueue = createSerialQueue(0);
const MIN_MARKDOWN_CHARS = 10;

const app = express();
app.use(express.json({ limit: '32kb' }));

function parseUrlParam(raw) {
  if (raw == null || raw === '') return { error: 'missing url' };
  let u;
  try {
    u = new URL(String(raw).trim());
  } catch {
    return { error: 'invalid url' };
  }
  if (!/^https?:$/i.test(u.protocol)) {
    return { error: 'only http and https are supported' };
  }
  return { url: u };
}

/** Collect excludePlugins from query (comma-separated and/or repeated key). */
function excludePluginsFromQuery(query) {
  const raw = query && query.excludePlugins;
  if (raw == null) return [];
  const parts = Array.isArray(raw) ? raw : [raw];
  const out = [];
  for (const p of parts) {
    for (const s of String(p).split(',')) {
      const t = s.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

/** Collect excludePlugins from JSON body (array or comma-separated string). */
function excludePluginsFromBody(body) {
  const raw = body && body.excludePlugins;
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

async function parsePage(url, excludePlugins) {
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
  const html = await fetchRenderedHtml(url.href, rule);
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

app.get('/health', (_req, res) => {
  res.type('json').send({ ok: true });
});

app.get('/parser', async (req, res) => {
  const parsed = parseUrlParam(req.query.url);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { url } = parsed;
  const excludePlugins = excludePluginsFromQuery(req.query);
  try {
    // const result = await enqueue(() => parsePage(url, excludePlugins));
    const result = await parsePage(url, excludePlugins);
    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }
    res.json(result.body);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    res.status(502).json({ error: 'fetch failed', detail: msg });
  }
});

app.post('/parser', async (req, res) => {
  const bodyUrl = req.body && (req.body.url ?? req.body.URL);
  const parsed = parseUrlParam(bodyUrl);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { url } = parsed;
  const excludePlugins = [
    ...excludePluginsFromBody(req.body),
    ...excludePluginsFromQuery(req.query),
  ];
  try {
    // const result = await enqueue(() => parsePage(url, excludePlugins));
    const result = await parsePage(url, excludePlugins);
    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }
    res.json(result.body);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    console.error(msg);
    res.status(502).json({ error: 'fetch failed', detail: msg });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`scrape-to-markdown listening on :${PORT}`);
});
