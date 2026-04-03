const puppeteer = require('puppeteer');

let browserPromise;

async function getBrowser() {
  if (!browserPromise) {
    const launchOpts = {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    browserPromise = puppeteer.launch(launchOpts);
  }
  return browserPromise;
}

const DEFAULT_NAVIGATION_TIMEOUT_MS = 10000;

async function fetchRenderedHtml(pageUrl, rule, overrides = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const navigationTimeoutMs =
    overrides.navigationTimeoutMs ??
    rule.navigationTimeoutMs ??
    DEFAULT_NAVIGATION_TIMEOUT_MS;
  const waitForSelectorTimeoutMs =
    overrides.waitForSelectorTimeoutMs ??
    rule.waitForSelectorTimeoutMs ??
    navigationTimeoutMs;
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(pageUrl, {
      waitUntil: rule.waitUntil || 'networkidle2',
      timeout: navigationTimeoutMs,
    });
    if (rule.waitForSelector) {
      await page.waitForSelector(rule.waitForSelector, {
        timeout: waitForSelectorTimeoutMs,
      });
    }
    return await page.content();
  } finally {
    await page.close();
  }
}

module.exports = { fetchRenderedHtml, getBrowser };
