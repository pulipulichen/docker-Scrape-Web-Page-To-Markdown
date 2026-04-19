const express = require('express');
const { createSerialQueue } = require('./queue');
const { parsePage: parsePageWithPuppet } = require('./puppet');
const { parsePageViaMarkdownNew } = require('./markdownNew');

const PORT = Number(process.env.PORT || 3000);
const enqueue = createSerialQueue(0);
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 120000;

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

/**
 * Optional `timeoutMs` for Puppeteer navigation (and default selector wait).
 * Body wins over query on POST. Omitted means use rule default or service default (10s).
 */
function parseTimeoutMs(raw) {
  if (raw == null || raw === '') return { ok: true, value: undefined };
  const n = typeof raw === 'string' ? Number(String(raw).trim()) : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: 'invalid timeoutMs' };
  }
  if (n < MIN_TIMEOUT_MS || n > MAX_TIMEOUT_MS) {
    return {
      ok: false,
      error: `timeoutMs must be an integer between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS}`,
    };
  }
  return { ok: true, value: n };
}

function timeoutMsFromParserRequest(query, body) {
  let raw;
  if (body && body.timeoutMs != null && body.timeoutMs !== '') {
    raw = body.timeoutMs;
  } else if (query && query.timeoutMs != null && query.timeoutMs !== '') {
    raw = query.timeoutMs;
  } else {
    raw = undefined;
  }
  return parseTimeoutMs(raw);
}

const VALID_MODES = new Set(['markdown.new', 'puppet']);

/** Body wins over query on POST; omitted defaults to markdown.new. */
function modeFromParserRequest(query, body) {
  let raw;
  if (body && body.mode != null && body.mode !== '') {
    raw = body.mode;
  } else if (query && query.mode != null && query.mode !== '') {
    raw = query.mode;
  } else {
    raw = 'markdown.new';
  }
  const s = String(raw).trim();
  if (!VALID_MODES.has(s)) {
    return {
      ok: false,
      error: 'invalid mode (use markdown.new or puppet)',
    };
  }
  return { ok: true, value: s };
}

async function runParser(mode, url, excludePlugins, fetchOverrides) {
  if (mode === 'puppet') {
    return parsePageWithPuppet(url, excludePlugins, fetchOverrides);
  }
  return parsePageViaMarkdownNew(url, fetchOverrides);
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
  const tm = timeoutMsFromParserRequest(req.query, undefined);
  if (!tm.ok) {
    res.status(400).json({ error: tm.error });
    return;
  }
  const fetchOverrides =
    tm.value != null ? { navigationTimeoutMs: tm.value } : {};
  const md = modeFromParserRequest(req.query, undefined);
  if (!md.ok) {
    res.status(400).json({ error: md.error });
    return;
  }
  const excludePlugins = excludePluginsFromQuery(req.query);
  try {
    // const result = await enqueue(() => runParser(md.value, url, excludePlugins, fetchOverrides));
    const result = await runParser(
      md.value,
      url,
      excludePlugins,
      fetchOverrides
    );
    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }
    res.json(result.body);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    res.status(502).json({
      error: 'fetch failed',
      detail: msg,
      url: url.href,
    });
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
  const tm = timeoutMsFromParserRequest(req.query, req.body);
  if (!tm.ok) {
    res.status(400).json({ error: tm.error });
    return;
  }
  const fetchOverrides =
    tm.value != null ? { navigationTimeoutMs: tm.value } : {};
  const md = modeFromParserRequest(req.query, req.body);
  if (!md.ok) {
    res.status(400).json({ error: md.error });
    return;
  }
  const excludePlugins = [
    ...excludePluginsFromBody(req.body),
    ...excludePluginsFromQuery(req.query),
  ];
  try {
    // const result = await enqueue(() => runParser(md.value, url, excludePlugins, fetchOverrides));
    console.log('runParser', md.value, url.href);
    const result = await runParser(
      md.value,
      url,
      excludePlugins,
      fetchOverrides
    );
    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }
    res.json(result.body);
    console.log('result preview', JSON.stringify(result.body).slice(0, 200));
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    console.error(msg);
    res.status(502).json({
      error: 'fetch failed',
      detail: msg,
      url: url.href,
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`scrape-to-markdown listening on :${PORT}`);
});
