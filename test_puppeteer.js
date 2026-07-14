import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    console.log('Navigating to local preview server...');
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
    
    console.log('Page loaded. Checking for root content...');
    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML);
    console.log('Root HTML length:', rootHtml?.length);
    console.log('Root HTML:', rootHtml);

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Puppeteer Script Error:', err);
    process.exit(1);
  }
})();
