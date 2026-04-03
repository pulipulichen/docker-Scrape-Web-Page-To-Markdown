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

async function fetchRenderedHtml(pageUrl, rule) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(pageUrl, {
      waitUntil: rule.waitUntil || 'networkidle2',
      timeout: rule.navigationTimeoutMs || 60000,
    });
    if (rule.waitForSelector) {
      await page.waitForSelector(rule.waitForSelector, {
        timeout: rule.waitForSelectorTimeoutMs || 30000,
      });
    }
    return await page.content();
  } finally {
    await page.close();
  }
}

module.exports = { fetchRenderedHtml, getBrowser };
