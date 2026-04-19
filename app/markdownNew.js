const fetch = require('node-fetch');
const AbortController = require('abort-controller');

const MIN_MARKDOWN_CHARS = 10;

/**
 * Fetch Markdown from markdown.new (GET https://markdown.new/<targetUrl>).
 * @param {URL} url
 * @param {{ navigationTimeoutMs?: number }} [fetchOverrides]
 */
async function parsePageViaMarkdownNew(url, fetchOverrides) {
  const endpoint = `https://markdown.new/${url.href}`;
  const navigationTimeoutMs = fetchOverrides?.navigationTimeoutMs ?? 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), navigationTimeoutMs);
  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: 'text/markdown',
      },
    });
    let text = (await res.text()).trim();

    // 如果 text 開頭有 \n---\n\n <!doctype html> ，取得之後的內容
    let headerNeedle = '\n---\n\n <!doctype html>'
    const htmlStartIndex = text.indexOf(headerNeedle);
    if (htmlStartIndex !== -1) {
      text = text.slice(htmlStartIndex + headerNeedle.length).trim();
    }

    let titleNeedle = '\n\n# '
    const htmlTitleIndex = text.indexOf(titleNeedle);
    if (htmlTitleIndex !== -1) {
      text = text.slice(htmlTitleIndex + titleNeedle.length - 2).trim();
    }

    // 如果 text 最後有 \n\n```json\n{\n ，則把這後面的內容都移除
    const jsonEndIndex = text.lastIndexOf('\n\n```json\n{\n');
    if (jsonEndIndex !== -1) {
      text = text.slice(0, jsonEndIndex).trim();
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status >= 400 && res.status < 600 ? res.status : 502,
        body: {
          error: 'markdown.new request failed',
          detail: text.slice(0, 500) || res.statusText,
          url: url.href,
        },
      };
    }
    if (text.length < MIN_MARKDOWN_CHARS) {
      return {
        ok: false,
        status: 422,
        body: {
          error: 'extracted content too short',
          detail: `Markdown length is ${text.length}; minimum is ${MIN_MARKDOWN_CHARS}.`,
        },
      };
    }
    return {
      ok: true,
      body: {
        url: url.href,
        content: text,
      },
    };
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    const isAbort =
      e &&
      (e.name === 'AbortError' ||
        /aborted|timeout/i.test(msg));
    return {
      ok: false,
      status: isAbort ? 504 : 502,
      body: {
        error: isAbort ? 'markdown.new timeout' : 'markdown.new fetch failed',
        detail: msg,
        url: url.href,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { parsePageViaMarkdownNew };
