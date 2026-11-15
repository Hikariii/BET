// Browsertest voor kopiëren naar Word: laat Chromium met de eigen copy-handler kopiëren en leest daarna het
// klembord van macOS. Controleert dat de HTML met `mso-style-name` er ongewijzigd op staat. Plakt niet in Word.
//
// Alleen op macOS, met een zichtbaar browservenster (het klembord van het systeem werkt niet zonder).
// Playwright is geen afhankelijkheid van redactietool/; geef de map van een installatie mee:
//   PLAYWRIGHT_MAP=/tmp/pw/node_modules/playwright mise x node@26.13.1 -- node src/klembord/chromiumKlembord.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rolldown } from 'rolldown';

const HIER = import.meta.dirname;
const PLAYWRIGHT_MAP = process.env.PLAYWRIGHT_MAP ?? '/tmp/pw/node_modules/playwright';
const { chromium } = await import(pathToFileURL(path.join(PLAYWRIGHT_MAP, 'index.mjs')).href);

const HOOFDMAP = path.resolve(HIER, '../../..');
const SJABLOON = path.join(HOOFDMAP, "bijbel/lukas/origineel/Lukas Jezus' woorden en highlights 1.0.docx");
const PROTOTYPE = path.join(HIER, 'prototype');

function bundelModule() {
	const invoer = path.join(mkdtempSync(path.join(tmpdir(), 'klembord-')), 'invoer.ts');
	writeFileSync(
		invoer,
		[
			`export { maakKlembordInhoud, vulKopieerGebeurtenis } from ${JSON.stringify(path.join(HIER, 'kopieer.ts'))};`,
			`export { parseerHoofdstuk } from ${JSON.stringify(path.join(HIER, '../formaat/parseer.ts'))};`,
			`export { leesStijlen } from ${JSON.stringify(path.join(HIER, '../sjabloon/leesStijlen.ts'))};`,
		].join('\n'),
	);
	return rolldown({ input: invoer }).then((bundel) => bundel.generate({ format: 'iife', name: 'BET' })).then((uitvoer) => uitvoer.output[0].code);
}

function leesKlembord(type) {
	const js = `ObjC.import('AppKit'); const s = $.NSPasteboard.generalPasteboard.stringForType('${type}'); s.isNil() ? '' : s.js`;
	return execFileSync('osascript', ['-l', 'JavaScript', '-e', js], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }).replace(/\n$/, '');
}

function leegKlembord() {
	execFileSync('osascript', ['-l', 'JavaScript', '-e', "ObjC.import('AppKit'); $.NSPasteboard.generalPasteboard.clearContents; 0"]);
}

/** Chromium zet dit zelf voor de HTML van de pagina als die op het klembord van macOS komt. */
const CHROMIUM_VOORAF = "<meta charset='utf-8'>";

function controleer(voorwaarde, melding) {
	console.log(`${voorwaarde ? 'GOED ' : 'FOUT '} ${melding}`);
	if (!voorwaarde) process.exitCode = 1;
}

const bundel = await bundelModule();
const stylesXml = execFileSync('unzip', ['-p', SJABLOON, 'word/styles.xml'], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
const hoofdstukken = [2, 3, 5, 17].map((nummer) => readFileSync(path.join(PROTOTYPE, `lukas-${String(nummer).padStart(2, '0')}.md`), 'utf-8'));
const verwachtHtml = readFileSync(path.join(PROTOTYPE, 'variant-a.html'), 'utf-8');
const verwachtTekst = readFileSync(path.join(PROTOTYPE, 'platte-tekst.txt'), 'utf-8');

const browser = await chromium.launch({ headless: false });
const pagina = await browser.newPage();
await pagina.setContent(`<!doctype html><meta charset="utf-8">
<div id="weergave">Lukas 2 weergave in de tool</div>
<button id="mat-selectie" onclick="kopieer(true)">kopieer met selectie</button>
<button id="zonder-selectie" onclick="kopieer(false)">kopieer zonder selectie</button>`);
await pagina.addScriptTag({ content: bundel });
await pagina.evaluate(
	([bestandsteksten, xml]) => {
		const inhoud = BET.maakKlembordInhoud(bestandsteksten.map(BET.parseerHoofdstuk), BET.leesStijlen(xml));
		window.kopieer = (selecteer) => {
			if (selecteer) {
				const bereik = document.createRange();
				bereik.selectNodeContents(document.getElementById('weergave'));
				getSelection().removeAllRanges();
				getSelection().addRange(bereik);
			} else {
				getSelection().removeAllRanges();
			}
			const handler = (gebeurtenis) => BET.vulKopieerGebeurtenis(gebeurtenis, inhoud);
			document.addEventListener('copy', handler);
			window.kopieerGelukt = document.execCommand('copy');
			document.removeEventListener('copy', handler);
		};
	},
	[hoofdstukken, stylesXml],
);

for (const [knop, naam] of [
	['#mat-selectie', 'met selectie'],
	['#zonder-selectie', 'zonder selectie'],
]) {
	leegKlembord();
	controleer(leesKlembord('public.html') === '', `${naam}: klembord is leeg voor het kopiëren`);
	await pagina.click(knop);
	await pagina.waitForTimeout(500);
	const html = leesKlembord('public.html');
	controleer(html.includes('mso-style-name:"Jezus_woorden"'), `${naam}: klembord-HTML bevat mso-style-name:"Jezus_woorden"`);
	controleer(html.includes('mso-style-name:"eeuwig leven"'), `${naam}: klembord-HTML bevat mso-style-name:"eeuwig leven"`);
	controleer(html === CHROMIUM_VOORAF + verwachtHtml, `${naam}: klembord-HTML is gelijk aan variant A van het prototype, na de meta-tag van Chromium`);
	controleer(leesKlembord('public.utf8-plain-text') === verwachtTekst, `${naam}: platte tekst op het klembord is gelijk aan die van het prototype`);
}

await browser.close();
