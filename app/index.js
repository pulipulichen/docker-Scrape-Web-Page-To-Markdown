const express = require('express');
const rulesConfig = require('./rules');
const { createSerialQueue } = require('./queue');
const { resolveRule, extractMainHtml, htmlToMarkdown } = require('./extract');
const { fetchRenderedHtml } = require('./scrape');

const PORT = Number(process.env.PORT || 3000);
const enqueue = createSerialQueue(1000);

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

app.get('/health', (_req, res) => {
  res.type('json').send({ ok: true });
});

app.get('/api/parse', async (req, res) => {
  const parsed = parseUrlParam(req.query.url);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { url } = parsed;
  try {
    const payload = await enqueue(async () => {
      const rule = resolveRule(url, rulesConfig);
      const html = await fetchRenderedHtml(url.href, rule);
      const { title, htmlFragment } = extractMainHtml(html, rule);
      const markdown = htmlToMarkdown(htmlFragment);
      return {
        url: url.href,
        title,
        content: markdown,
      };
    });
    res.json(payload);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    res.status(502).json({ error: 'fetch failed', detail: msg });
  }
});

app.post('/api/parse', async (req, res) => {
  const bodyUrl = req.body && (req.body.url ?? req.body.URL);
  const parsed = parseUrlParam(bodyUrl);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { url } = parsed;
  try {
    const payload = await enqueue(async () => {
      const rule = resolveRule(url, rulesConfig);
      const html = await fetchRenderedHtml(url.href, rule);
      const { title, htmlFragment } = extractMainHtml(html, rule);
      const markdown = htmlToMarkdown(htmlFragment);
      return {
        url: url.href,
        title,
        content: markdown,
      };
    });
    res.json(payload);
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
