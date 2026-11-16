import { chromium } from 'playwright';
import fs from 'node:fs';
const [, , query, uitvoer] = process.argv; // query: '?ontwerp=v8e' of ''
const browser = await chromium.launch();
const resultaat = {};
const fouten = [];
const rectSrc = `(el) => el === null ? null : (({ x, y, width, height }) => ({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, w: Math.round(width * 10) / 10, h: Math.round(height * 10) / 10 }))(el.getBoundingClientRect())`;
for (const breedte of [1440, 1920]) {
  const page = await browser.newPage({ viewport: { width: breedte, height: 900 } });
  page.on('pageerror', (e) => fouten.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });
  for (const hash of ['#/lukas/1', '#/lukas/4', '#/lukas/22', '#/lukas/begrippen/vragen', '#/lukas/bewaard', '#/galerij']) {
    await page.goto(`http://localhost:4260/BET/${query}${hash}`);
    await page.reload();
    await page.waitForTimeout(1200);
    const r = await page.evaluate((src) => {
      const rect = eval(src);
      const q = (s) => document.querySelector(s);
      const stijl = (s, ...props) => { const e = q(s); if (!e) return null; const c = getComputedStyle(e); return Object.fromEntries(props.map((p) => [p, c[p]])); };
      const cellen = [...document.querySelectorAll('table.verzen tr.vers > td')].slice(0, 6).map((td) => rect(td).w);
      return {
        htmlFont: getComputedStyle(document.documentElement).fontSize,
        bovenbalk: rect(q('.bovenbalk')),
        boekbalk: rect(q('.bovenbalk-boekbalk')),
        hoofdstukbalk: rect(q('.bovenbalk-hoofdstukbalk')),
        titel: rect(q('.bovenbalk-titel')),
        strip: rect(q('.hoofdstukstrip')),
        stripKnoppen: document.querySelectorAll('.hoofdstukstrip li a').length,
        pijlen: [...document.querySelectorAll('.strip-pijl')].map((p) => ({ hidden: p.hidden, ...rect(p) })),
        tabbladen: [...document.querySelectorAll('.boekplekken a')].map((a) => a.textContent.trim()),
        tabbladRects: [...document.querySelectorAll('.boekplekken a')].map((a) => rect(a)),
        zijbalk: !!q('.zijbalk, aside'),
        bewaard: rect(q('.bovenbalk-bewaarstatus')),
        grootte: rect(q('.bovenbalk-grootte')),
        acties: rect(q('.bovenbalk-acties')),
        indeling: rect(q('.indeling')),
        main: rect(q('main')),
        cellen,
        mainFont: stijl('main', 'fontSize', 'lineHeight', 'fontFamily'),
        versFont: stijl('table.verzen tr.vers > td:not(.regels) p', 'fontSize', 'lineHeight'),
        regelsFont: stijl('table.verzen tr.vers > td.regels', 'fontSize'),
        h1: stijl('main h1', 'fontSize', 'marginTop'),
        h1Rect: rect(q('main h1')),
        aantalVerzen: document.querySelectorAll('tr.vers').length,
        scrollBreedte: document.documentElement.scrollWidth,
        galerijRect: rect(q('.galerij')),
        body: rect(document.body),
        dataOntwerp: document.documentElement.dataset.ontwerp ?? null,
      };
    }, rectSrc);
    resultaat[`${breedte} ${hash}`] = r;
  }
  await page.close();
}
resultaat.fouten = fouten;
fs.writeFileSync(uitvoer, JSON.stringify(resultaat, null, 1));
console.log('klaar', Object.keys(resultaat).length, 'fouten', fouten.length);
await browser.close();
