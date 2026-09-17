const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = path.resolve(
  "C:/Users/dev/Desktop/Real-Time Fraud  Anomaly Detection Dashboard/docs/screenshots"
);
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.APP_URL || "http://127.0.0.1:5181";

async function shot(page, name, url) {
  console.log("capturing", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", file, fs.existsSync(file) ? fs.statSync(file).size : 0);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await shot(page, "01-landing.png", `${BASE}/`);
  await shot(page, "02-dashboard.png", `${BASE}/app/dashboard`);
  await shot(page, "03-live-monitor.png", `${BASE}/app/live`);
  await shot(page, "04-events.png", `${BASE}/app/events`);
  await shot(page, "05-alerts.png", `${BASE}/app/alerts`);
  await shot(page, "06-analytics.png", `${BASE}/app/analytics`);
  await shot(page, "07-model.png", `${BASE}/app/model`);

  await page.goto(`${BASE}/app/events`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  const firstRow = page.locator("tbody tr").first();
  if (await firstRow.count()) {
    await firstRow.click();
    await page.waitForTimeout(2500);
    const file = path.join(OUT, "08-event-details.png");
    await page.screenshot({ path: file, fullPage: false });
    console.log("saved", file, fs.statSync(file).size);
  }

  await browser.close();
  console.log("files", fs.readdirSync(OUT));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
