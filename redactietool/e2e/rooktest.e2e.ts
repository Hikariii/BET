import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { hoofdstukAdres, leesBoekJson, leesGebouwdeStijlnamen, volgFouten, wachtOpHoofdstuk } from './hulpen';
import { controleerOpmaak } from './opmaakcontrole';

const boek = leesBoekJson();
const HOOFDSTUKKEN = boek.verzen_per_hoofdstuk.map((_, index) => index + 1);
const TYPSEL = ' rooktest-proeftekst';

/** De versie die de code in de export zet; de test leest hem uit de bron zodat een bewuste verhoging één plek kent. */
function exportversieUitBron(): number {
	const bron = readFileSync(path.join(import.meta.dirname, '../src/export/maakExport.ts'), 'utf-8');
	const treffer = /formaat: 'bet-redactie-export',\s*versie: (\d+)/.exec(bron);
	if (treffer?.[1] === undefined) throw new Error('maakExport.ts zet geen formaat en versie meer');
	return Number(treffer[1]);
}

/** Bewerkt vers `nummer` van het open hoofdstuk: klik, typ aan het eind, sluit met Escape. */
async function bewerkVers(pagina: Page, nummer: number): Promise<void> {
	await pagina.locator(`#vers-${nummer} [data-help="vers-bewerken"]`).click();
	const editor = pagina.locator(`#vers-${nummer} [role="textbox"]`);
	await editor.waitFor();
	await pagina.keyboard.press('Control+End');
	await pagina.keyboard.type(TYPSEL);
	await expect(editor).toContainText(TYPSEL.trim());
	await pagina.keyboard.press('Escape');
	await expect(editor).toHaveCount(0);
}

test.describe('de gebouwde app', () => {
	test('Lukas 1 toont alle versrijen zonder fouten', async ({ page }) => {
		const fouten = volgFouten(page);
		const rijen = await wachtOpHoofdstuk(page, 1);
		expect(rijen).toBe(boek.verzen_per_hoofdstuk[0]);
		await expect(page.locator('table.verzen tr.vers .versklik').first()).toBeVisible();
		expect(fouten).toEqual([]);
	});

	test('een bewerkt vers staat er na herladen nog; Vers terugzetten haalt het weg', async ({ page }) => {
		const fouten = volgFouten(page);
		await wachtOpHoofdstuk(page, 1);
		const vers = page.locator('#vers-1');
		await expect(vers).not.toContainText(TYPSEL.trim());
		await expect(vers.locator('[data-help="terug-naar-de-repo"]')).toHaveCount(0);

		await bewerkVers(page, 1);
		await expect(vers).toContainText(TYPSEL.trim());

		await page.reload();
		await page.locator('table.verzen tr.vers').first().waitFor();
		await expect(vers).toContainText(TYPSEL.trim());

		await vers.locator('[data-help="terug-naar-de-repo"]').click();
		await expect(vers).not.toContainText(TYPSEL.trim());
		await page.reload();
		await page.locator('table.verzen tr.vers').first().waitFor();
		await expect(vers).not.toContainText(TYPSEL.trim());
		expect(fouten).toEqual([]);
	});

	test('Vertaalvragen opent met zijn filters en vragen', async ({ page }) => {
		const fouten = volgFouten(page);
		await page.goto('#/lukas/begrippen/vragen');
		await expect(page.locator('[data-help="vragen-filters"]')).toBeVisible();
		await expect(page.locator('[data-help="vragen-kiezen"]').first()).toBeVisible();
		expect(fouten).toEqual([]);
	});

	test('Vertaalvragen: Beantwoorden klapt het antwoordformulier open en met Escape weer dicht', async ({ page }) => {
		const fouten = volgFouten(page);
		await page.goto('#/lukas/begrippen/vragen');
		const vraag = page.locator('.registervraag').first();
		await expect(vraag.locator('form.antwoordformulier')).toHaveCount(0);
		await vraag.getByRole('button', { name: /^Beantwoorden/ }).click();
		await expect(vraag.locator('form.antwoordformulier select')).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(vraag.locator('form.antwoordformulier')).toHaveCount(0);
		await expect(vraag.getByRole('button', { name: /^Beantwoorden/ })).toBeFocused();
		expect(fouten).toEqual([]);
	});

	test('de galerij laadt zijn voorbeelden', async ({ page }) => {
		const fouten = volgFouten(page);
		await page.goto('#/galerij');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.locator('[data-help="vers-bewerken"]').first()).toBeVisible();
		await expect(page.locator('.galerij main > .melding')).toHaveCount(0);
		expect(fouten).toEqual([]);
	});

	test('Export voor Claude downloadt het formaat en de versie van de code', async ({ page }) => {
		const fouten = volgFouten(page);
		await wachtOpHoofdstuk(page, 1);
		await bewerkVers(page, 1);

		await page.locator('[data-help="export-voor-claude"]').click();
		const downloadWacht = page.waitForEvent('download');
		await page.locator('.hoofdstukacties-export button[type="submit"]').click();
		const download = await downloadWacht;
		const bestandspad = await download.path();
		const uitvoer = JSON.parse(readFileSync(bestandspad, 'utf-8')) as {
			formaat: string;
			versie: number;
			boek: string;
			hoofdstuk: number;
			verzen: { vers: number; bewerkt: string[] }[];
		};

		expect(download.suggestedFilename()).toBe(`${boek.bestandsprefix}-01.redactie.json`);
		expect(uitvoer.formaat).toBe('bet-redactie-export');
		expect(uitvoer.versie).toBe(exportversieUitBron());
		expect(uitvoer.boek).toBe('lukas');
		expect(uitvoer.hoofdstuk).toBe(1);
		expect(uitvoer.verzen.map((vers) => vers.vers)).toEqual([1]);
		expect(uitvoer.verzen[0]?.bewerkt.join(' ')).toContain(TYPSEL.trim());
		expect(fouten).toEqual([]);
	});

	test('Hoofdstuktekst kopiëren zet HTML met alle Word-stijlnamen op het klembord', async ({ page }) => {
		const fouten = volgFouten(page);
		await wachtOpHoofdstuk(page, 5);
		// De app hangt zijn copy-listener pas bij de klik aan document; deze listener op window komt daarna aan de beurt.
		await page.evaluate(() => {
			window.addEventListener('copy', (gebeurtenis) => {
				Object.assign(window, {
					geleesdKlembord: {
						html: gebeurtenis.clipboardData?.getData('text/html') ?? null,
						tekst: gebeurtenis.clipboardData?.getData('text/plain') ?? null,
					},
				});
			});
		});

		await page.locator('[data-help="hoofdstuk-kopieren"]').click();
		await expect(page.locator('.hoofdstukacties-status')).not.toBeEmpty();

		const klembord = await page.evaluate(() => (window as unknown as { geleesdKlembord: { html: string | null; tekst: string | null } }).geleesdKlembord);
		expect(klembord.html).not.toBeNull();
		const gevonden = [...(klembord.html ?? '').matchAll(/mso-style-name:"([^"]*)"/g)].map((treffer) => treffer[1]);
		const sjabloonStijlen = new Set(leesGebouwdeStijlnamen());
		expect(gevonden.length).toBeGreaterThanOrEqual(10);
		expect(gevonden.filter((naam) => !sjabloonStijlen.has(naam ?? ''))).toEqual([]);
		expect(klembord.html).toContain('mso-style-name:"Jezus_woorden"');
		expect(klembord.tekst).not.toBeNull();
		expect((klembord.tekst ?? '').length).toBeGreaterThan(0);
		expect(fouten).toEqual([]);
	});

	test('de Bijbeltekst heeft in elk hoofdstuk alleen opmaak uit het Word-sjabloon', async ({ page }) => {
		for (const hoofdstuk of HOOFDSTUKKEN) {
			const uitkomst = await controleerOpmaak(page, hoofdstuk);
			expect(uitkomst.afwijkingen, `hoofdstuk ${hoofdstuk} (${uitkomst.stukken} stukken)`).toEqual([]);
		}
	});

	test('de hoofdstukkeuze opent, kiest een hoofdstuk en sluit met Escape en een klik buiten', async ({ page }) => {
		const fouten = volgFouten(page);
		await page.setViewportSize({ width: 1280, height: 900 });
		await wachtOpHoofdstuk(page, 4);
		const knop = page.locator('[data-help="hoofdstukkeuze"]');
		const raster = page.locator('#hoofdstukkeuze-raster');
		const titel = page.locator('.hoofdstukkeuze-naam');
		const gefocust = () => page.evaluate(() => document.activeElement?.getAttribute('href') ?? document.activeElement?.className ?? null);
		await expect(titel).toHaveText('Lukas 4');
		await expect(knop).toHaveAttribute('aria-expanded', 'false');
		await expect(raster).toHaveCount(0);

		await knop.click();
		await expect(knop).toHaveAttribute('aria-expanded', 'true');
		await expect(raster.locator('.hoofdstuk-cel')).toHaveCount(boek.verzen_per_hoofdstuk.length);
		const open = raster.locator('[aria-current="page"]');
		await expect(open).toHaveText(/^4/);
		await expect(open).not.toHaveAttribute('href', /.*/);
		await expect(open).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(raster).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`${hoofdstukAdres(4)}$`));

		await page.keyboard.press('ArrowDown');
		expect(await gefocust()).toBe(hoofdstukAdres(12));
		await page.keyboard.press('End');
		expect(await gefocust()).toBe(hoofdstukAdres(boek.verzen_per_hoofdstuk.length));
		await page.keyboard.press('Home');
		expect(await gefocust()).toBe(hoofdstukAdres(1));

		await page.keyboard.press('Escape');
		await expect(raster).toHaveCount(0);
		await expect(knop).toBeFocused();
		await expect(knop).toHaveAttribute('aria-expanded', 'false');

		await page.keyboard.press('ArrowDown');
		await expect(raster).toBeVisible();
		await knop.click();
		await expect(raster).toHaveCount(0);

		await knop.click();
		await page.locator('main').click({ position: { x: 5, y: 400 } });
		await expect(raster).toHaveCount(0);

		await knop.click();
		await raster.locator('a[href$="/20"]').click();
		await expect(raster).toHaveCount(0);
		await expect(page).toHaveURL(new RegExp(`${hoofdstukAdres(20)}$`));
		await expect(titel).toHaveText('Lukas 20');
		await page.locator('table.verzen tr.vers').first().waitFor();
		expect(fouten).toEqual([]);
	});

	test('Hoofdstuk n-1 en Hoofdstuk n+1 bladeren; de titel en de knoppen blijven op hun plek', async ({ page }) => {
		const fouten = volgFouten(page);
		await page.setViewportSize({ width: 1280, height: 900 });
		await wachtOpHoofdstuk(page, 1);
		const laatste = boek.verzen_per_hoofdstuk.length;
		const titel = page.locator('.hoofdstukkeuze-naam');
		const vorige = page.locator('.hoofdstuk-bladeren button').first();
		const volgende = page.locator('.hoofdstuk-bladeren button').last();
		const plekken = () =>
			page.evaluate(() => {
				const x = (selector: string) => Math.round(document.querySelector(selector)?.getBoundingClientRect().x ?? -1);
				return [x('.hoofdstukkeuze-knop'), x('.hoofdstuk-bladeren button:first-child'), x('.hoofdstuk-bladeren button:last-child'), x('.bovenbalk-acties')];
			});
		await expect.poll(plekken).not.toContain(0);
		const plekBijEerste = await plekken();

		await expect(vorige).toBeHidden();
		await expect(vorige).toBeDisabled();
		await expect(volgende).toHaveText('Hoofdstuk 2 ›');
		await expect(volgende).toHaveAttribute('title', 'Lukas 2');

		for (let nummer = 2; nummer <= laatste; nummer++) {
			await volgende.click();
			await expect(titel).toHaveText(`Lukas ${nummer}`);
			expect((await plekken()).slice(0, 3), `plekken bij hoofdstuk ${nummer}`).toEqual(plekBijEerste.slice(0, 3));
			await expect.poll(plekken, `plekken na laden van hoofdstuk ${nummer}`).toEqual(plekBijEerste);
		}
		await expect(volgende).toBeHidden();
		await expect(volgende).toBeDisabled();
		await expect(vorige).toHaveText(`‹ Hoofdstuk ${laatste - 1}`);
		await expect(vorige).toHaveAttribute('title', `Lukas ${laatste - 1}`);

		await vorige.click();
		await expect(titel).toHaveText(`Lukas ${laatste - 1}`);
		await expect(page).toHaveURL(new RegExp(`${hoofdstukAdres(laatste - 1)}$`));
		expect(fouten).toEqual([]);
	});

	test('de versrijen van elk hoofdstuk komen overeen met boek.json', async ({ page }) => {
		for (const hoofdstuk of HOOFDSTUKKEN) {
			expect(await wachtOpHoofdstuk(page, hoofdstuk), `hoofdstuk ${hoofdstuk} op ${hoofdstukAdres(hoofdstuk)}`).toBe(
				boek.verzen_per_hoofdstuk[hoofdstuk - 1],
			);
		}
	});
});
