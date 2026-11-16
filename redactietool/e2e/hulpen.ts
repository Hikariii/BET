import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

const HOOFDMAP = path.resolve(import.meta.dirname, '../..');
const BOEK = 'lukas';

type BoekJson = { bestandsprefix: string; verzen_per_hoofdstuk: number[] };

/** De hoofdstukken en versaantallen komen uit `bijbel/<boek>/boek.json`, niet uit de test. */
export function leesBoekJson(): BoekJson {
	return JSON.parse(readFileSync(path.join(HOOFDMAP, 'bijbel', BOEK, 'boek.json'), 'utf-8')) as BoekJson;
}

/** De stijlen van het Word-sjabloon zoals het bouwscript ze in de build zette. */
export function leesGebouwdeStijlnamen(): string[] {
	const boek = JSON.parse(readFileSync(path.join(import.meta.dirname, '..', 'dist/data', BOEK, 'boek.json'), 'utf-8')) as {
		stijlen: { naam: string }[];
	};
	return boek.stijlen.map((stijl) => stijl.naam);
}

export function hoofdstukAdres(nummer: number): string {
	return `#/${BOEK}/${nummer}`;
}

/** Verzamelt console- en paginafouten (en mislukte verzoeken) vanaf nu; de test eist dat de lijst leeg blijft. */
export function volgFouten(pagina: Page): string[] {
	const fouten: string[] = [];
	pagina.on('console', (bericht) => {
		if (bericht.type() === 'error') fouten.push(`console: ${bericht.text()}`);
	});
	pagina.on('pageerror', (fout) => fouten.push(`pagina: ${fout.message}`));
	pagina.on('requestfailed', (verzoek) => fouten.push(`verzoek mislukt: ${verzoek.url()}`));
	return fouten;
}

/** Wacht tot het hoofdstuk getekend is en geeft het aantal versrijen. */
export async function wachtOpHoofdstuk(pagina: Page, nummer: number): Promise<number> {
	// Alleen de hash verandert niet van pagina: zonder dit zou het vorige hoofdstuk nog op het scherm staan.
	await pagina.goto('about:blank');
	await pagina.goto(hoofdstukAdres(nummer));
	await pagina.locator('table.verzen tr.vers').first().waitFor();
	return pagina.locator('table.verzen tr.vers').count();
}
