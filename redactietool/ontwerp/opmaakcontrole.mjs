import { chromium } from 'playwright';
const POORT = process.env.POORT ?? 4200;
const hoofdstukken = [1, 4, 22];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
async function meet(variant, h) {
  await page.goto(`http://localhost:${POORT}${process.env.PAD ?? '/BET/'}${variant === 'huidig' ? '' : '?ontwerp=' + variant}#/lukas/${h}`);
  await page.waitForTimeout(800);
  return page.evaluate(() => [...document.querySelectorAll('table.verzen tr.vers > td:nth-child(2) :is(p, p span), table.verzen tr.vers > td:nth-child(3) :is(p, p span)')].map((el) => {
    const s = getComputedStyle(el);
    return [el.textContent.slice(0, 30), s.color, s.backgroundColor, s.fontWeight >= 600 ? 'vet' : 'normaal', s.fontStyle, s.textDecorationLine].join(' | ');
  }));
}
for (const h of hoofdstukken) {
  const basis = await meet('huidig', h);
  for (const v of (process.env.VARIANTEN ?? 'a,b,c').split(',')) {
    const ander = await meet(v, h);
    const wordZwart = (r) => r.replace('rgb(31, 35, 40)', 'rgb(0, 0, 0)');
    const verschil = basis.map((r, i) => (wordZwart(r) === ander[i] ? null : `${r}\n    ${v}: ${ander[i]}`)).filter(Boolean);
    console.log(`Lukas ${h}, ${v}: ${basis.length} stukken, ${verschil.length} verschillen`);
    for (const d of verschil.slice(0, 3)) console.log('  ' + d);
  }
}
for (const v of ['huidig', ...(process.env.VARIANTEN ?? 'a,b,c').split(',')]) {
  await page.goto(`http://localhost:${POORT}${process.env.PAD ?? '/BET/'}${v === 'huidig' ? '' : '?ontwerp=' + v}#/lukas/22/12`);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^Bewerken, vers 12$/ }).click();
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => [...document.querySelectorAll('.ProseMirror p, .ProseMirror p span')].map((el) => { const s = getComputedStyle(el); return [el.textContent.slice(0, 25), s.color, s.backgroundColor, s.fontWeight, s.fontStyle, s.textDecorationLine].join(' | '); }));
  console.log('editor 22:12', v, JSON.stringify(r).slice(0, 300));
}
await browser.close();
