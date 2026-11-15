// Maakt de schermafbeeldingen voor layout-r.html. Draai vanuit redactietool/ met een draaiende `npx vite preview --port 4215 --strictPort`.
import { chromium } from 'playwright';
import fs from 'node:fs';

const UIT = process.env.UIT ?? 'ontwerp/layout-r';
const POORT = process.env.POORT ?? 4215;
const alleen = process.env.ALLEEN ? process.env.ALLEEN.split(',') : null;
fs.mkdirSync(UIT, { recursive: true });
const browser = await chromium.launch();
const layouts = ['nu', 'r1', 'r2', 'r3', 'r4', 'p1', 'p2', 'p3'];
const fouten = [];
for (const breedte of [1440, 1920]) {
  for (const layout of layouts) {
    if (alleen && !alleen.includes(layout)) continue;
    const url = `http://localhost:${POORT}/BET/${layout === 'nu' ? '' : `?layout=${layout}`}#/lukas/4`;
    const page = await browser.newPage({ viewport: { width: breedte, height: 1000 } });
    page.on('console', (m) => { if (m.type() === 'error') fouten.push(`${layout} ${breedte}: ${m.text()}`); });
    page.on('pageerror', (e) => fouten.push(`${layout} ${breedte}: ${e.message}`));
    await page.goto(url);
    await page.waitForSelector('table.verzen tr.vers');
    await page.waitForTimeout(600);
    const foto = async (naam) => { await page.screenshot({ path: `${UIT}/${layout}-${breedte}-${naam}.png` }); };
    await foto('dicht');
    if (layout === 'r2') {
      const knoppen = page.locator('button.regelsknop');
      for (const i of [1, 2, 4]) await knoppen.nth(i).click();
      await page.waitForTimeout(200);
      await foto('uitgeklapt');
      await page.locator('button.regelsknop[aria-expanded=true]').first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator('button.alleregels').click();
      await page.waitForTimeout(200);
      await foto('alles');
      await page.locator('button.alleregels').click();
      await page.reload();
      await page.waitForSelector('table.verzen tr.vers');
    }
    if (layout === 'r3') {
      const knop = page.locator('button.regelsvastzetter').nth(2);
      await knop.hover();
      await page.waitForTimeout(600);
      await foto('zwevend');
      await knop.click();
      await page.mouse.move(5, 5);
      await page.waitForTimeout(400);
      await foto('vastgezet');
      await page.keyboard.press('Escape');
      await page.mouse.move(5, 5);
    }
    // naslag open: de eerste verwijzing "precedent"
    const zichtbaar = page.locator('button.verwijzing:visible', { hasText: 'precedent' });
    if (layout === 'r2') {
      for (let i = 0; i < 12 && (await zichtbaar.count()) === 0; i++) await page.locator('button.regelsknop[aria-expanded=false]').first().click();
    }
    if (layout === 'r3') {
      for (let i = 0; i < 12 && (await zichtbaar.count()) === 0; i++) { await page.locator('button.regelsvastzetter').nth(i).click(); }
    }
    const verwijzing = zichtbaar.first();
    await verwijzing.click();
    await page.waitForTimeout(500);
    if (layout !== 'p3') await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(5, 5);
    await foto('naslag');
    if (layout === 'p3') {
      const par = page.locator('button.verwijzing:visible', { hasText: '§' }).first();
      await page.keyboard.press('Escape');
      await par.click();
      await page.waitForTimeout(400);
      await foto('naslag-richtlijn');
    }
    await page.close();
  }
}
console.log('consolefouten:', fouten.length, fouten.slice(0, 5).join(' | '));
await browser.close();
