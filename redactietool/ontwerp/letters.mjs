import { chromium } from 'playwright';
const uit = process.argv[2];
const basis = `http://localhost:${process.env.POORT ?? 4200}${process.env.PAD ?? '/BET/'}?ontwerp=${process.env.ONTWERP ?? 'a'}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const fouten = [];
page.on('pageerror', (e) => fouten.push(e.message));
for (const n of (process.env.LETTERS ?? "1,2,3,5,7,9").split(",").map(Number)) {
  for (const [naam, hash] of [['lezen', '#/lukas/22'], ['opmaak', '#/lukas/4']]) {
    await page.goto(`${basis}&letter=${n}${hash}`);
    await page.waitForTimeout(500);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const pad = `${uit}/letter-${String(n).padStart(2, '0')}-${naam}.png`;
    if (naam === 'lezen') await page.screenshot({ path: pad });
    else await page.locator('table.verzen tbody tr').nth(0).screenshot({ path: pad });
  }
  const geladen = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i));
  console.log(n, 'geladen:', geladen.join(', '));
}
console.log('fouten', fouten);
await browser.close();
