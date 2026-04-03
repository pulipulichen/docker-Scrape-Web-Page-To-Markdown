const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    //headless: false,
    args: ['--no-sandbox'],
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();

  //await page.setUserAgent(
  //   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36'
  //)

  console.log('URL', process.env['url'])
  await page.goto(process.env['url'], {waitUntil: 'networkidle0'})

  await page.waitForSelector('a[href="/p/cookie-policy.html"]', {visible: true})

  await page.evaluate((button) => {
     document.querySelector(button).click();
   }, 'a[href="/p/cookie-policy.html"]')

  await page.waitForNavigation({waitUntil: "networkidle0"})

  await page.screenshot({ path: '/app/example.png' })

  await browser.close();
})();
