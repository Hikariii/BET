import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const h of [1, 4, 22]) {
  await page.goto(`http://localhost:${process.env.POORT ?? 4200}${process.env.PAD ?? '/BET/'}#/lukas/${h}`);
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const fout = [];
    let n = 0;
    for (const el of document.querySelectorAll('table.verzen tr.vers > td:not(.regels) :is(p, p span)')) {
      n++;
      const s = getComputedStyle(el);
      let eigen = el; let verwacht = 'rgb(0, 0, 0)';
      while (eigen && eigen.tagName !== 'TD') { if (eigen.style.color) { const t = document.createElement('span'); t.style.color = eigen.style.color; document.body.append(t); verwacht = getComputedStyle(t).color; t.remove(); break; } eigen = eigen.parentElement; }
      if (s.color !== verwacht) fout.push(`${el.textContent.slice(0, 20)}: ${s.color} i.p.v. ${verwacht}`);
      if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && !el.style.backgroundColor) fout.push(`${el.textContent.slice(0, 20)}: achtergrond ${s.backgroundColor} niet uit Word`);
    }
    return { n, fout: fout.slice(0, 5), aantalFout: fout.length };
  });
  console.log(`Lukas ${h}: ${r.n} stukken, ${r.aantalFout} afwijkingen`, r.fout.join(' | '));
}
await browser.close();
