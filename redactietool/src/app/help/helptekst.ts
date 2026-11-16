import type { BoekData } from '../../data/types';
import { exportBestandsnaam } from '../../export/maakExport';
import { backupBestandsnaamMetTijd } from '../bewaren/backupTekst';
import { BEWAARD_NAAM, PLEKNAAM } from '../navigatie/boekplekken';
import { alleOnderdelen, type HelpOnderdeel } from './onderdelen';

const BRONNEN = import.meta.glob<string>('../../help/*.md', { query: '?raw', import: 'default', eager: true });

/** De Markdown van een onderdeel. Een ontbrekend bestand is een fout van de bouwer, die `helptekst.test.ts` vangt. */
export function helptekst(onderdeel: HelpOnderdeel): string {
	const tekst = BRONNEN[`../../help/${onderdeel}.md`];
	if (tekst === undefined) throw new Error(`De help mist het bestand src/help/${onderdeel}.md.`);
	return tekst;
}

/** De namen die de tekst met `{{...}}` invult, zodat ze niet in de Markdown overgetypt worden. */
export type Helpnamen = {
	boek: string;
	backupBestand: string;
	exportBestand: string;
};

/** Het hoofdstuk in de voorbeeldnaam van het exportbestand. */
const VOORBEELDHOOFDSTUK = 4;

/** Het moment in de voorbeeldnaam van het back-upbestand. */
const VOORBEELDMOMENT = new Date(2026, 10, 16, 11, 3);

export function helpnamen(boek: BoekData): Helpnamen {
	return { boek: boek.naam, backupBestand: backupBestandsnaamMetTijd(boek.id, VOORBEELDMOMENT), exportBestand: exportBestandsnaam(boek.prefix, VOORBEELDHOOFDSTUK) };
}

export type Helpblok =
	| { soort: 'markdown'; markdown: string }
	| { soort: 'legenda' }
	/** Een onderdeel van de pagina met een knop "Wijs aan". `waar` zegt waar het staat. */
	| { soort: 'wijs'; sleutel: string; naam: string; waar: string };

const WIJS = /^\{\{wijs ([a-z0-9-]+) \| ([^|]+) \| ([^|]+)\}\}$/;
const LEGENDA = /^\{\{legenda\}\}$/;
const INVULLING = /\{\{([a-z-]+)(?::([a-z]+))?\}\}/g;

function plekNaam(plek: string): string {
	if (plek === 'bewaard') return BEWAARD_NAAM;
	const naam = (PLEKNAAM as Partial<Record<string, string>>)[plek];
	if (naam === undefined) throw new Error(`De help noemt de onbekende plek "${plek}".`);
	return naam;
}

/** Vult `{{plek:besloten}}`, `{{boek}}`, `{{back-upbestand}}` en `{{exportbestand}}` in. */
export function vulIn(tekst: string, namen: Helpnamen): string {
	return tekst.replace(INVULLING, (invulling, soort: string, waarde: string | undefined) => {
		if (soort === 'plek' && waarde !== undefined) return plekNaam(waarde);
		if (soort === 'boek') return namen.boek;
		if (soort === 'back-upbestand') return namen.backupBestand;
		if (soort === 'exportbestand') return namen.exportBestand;
		throw new Error(`De help gebruikt de onbekende invulling ${invulling}.`);
	});
}

/** Knipt de tekst in Markdown en de regels die iets anders tonen: `{{legenda}}` en `{{wijs sleutel | naam | waar}}`. */
export function splitsBlokken(tekst: string, namen: Helpnamen): Helpblok[] {
	const blokken: Helpblok[] = [];
	let markdown: string[] = [];
	const sluitMarkdown = () => {
		if (markdown.join('').trim() !== '') blokken.push({ soort: 'markdown', markdown: vulIn(markdown.join('\n'), namen) });
		markdown = [];
	};
	for (const regel of tekst.split('\n')) {
		const wijs = WIJS.exec(regel.trim());
		if (wijs !== null) {
			sluitMarkdown();
			const [, sleutel = '', naam = '', waar = ''] = wijs;
			blokken.push({ soort: 'wijs', sleutel, naam: vulIn(naam.trim(), namen), waar: vulIn(waar.trim(), namen) });
		} else if (LEGENDA.test(regel.trim())) {
			sluitMarkdown();
			blokken.push({ soort: 'legenda' });
		} else {
			markdown.push(regel);
		}
	}
	sluitMarkdown();
	return blokken;
}

/** De titel van een onderdeel: de eerste kop, met de namen ingevuld. */
export function titelVan(onderdeel: HelpOnderdeel, namen: Helpnamen): string {
	const kop = /^#\s+(.+)$/m.exec(helptekst(onderdeel));
	if (kop === null) throw new Error(`src/help/${onderdeel}.md begint niet met een kop.`);
	return vulIn(kop[1] ?? '', namen);
}
