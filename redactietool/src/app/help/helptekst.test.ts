import { describe, expect, it } from 'vitest';
import type { BoekData } from '../../data/types';
import { boekPlekken, BEWAARD_NAAM, PLEKNAAM } from '../navigatie/boekplekken';
import { ALLE_STATUSSEN } from './Voorbeeld';
import { helpnamen, helptekst, splitsBlokken, titelVan, vulIn } from './helptekst';
import { alleOnderdelen, HELP_PLEKKEN, paginaOnderdeel, type HelpPlek } from './onderdelen';

const BOEK: BoekData = { id: 'lukas', naam: 'Lukas', prefix: 'lukas', hoofdstukken: [], stijlen: [] };
const NAMEN = helpnamen(BOEK);
const EM_DASH = String.fromCharCode(0x2014);

function plekNaam(plek: HelpPlek): string {
	return plek === 'bewaard' ? BEWAARD_NAAM : PLEKNAAM[plek];
}

function alleTekst(): string {
	return alleOnderdelen()
		.map((onderdeel) => helptekst(onderdeel))
		.join('\n');
}

describe('vulIn', () => {
	it('vult de plekken, het boek en de bestandsnamen in', () => {
		expect(vulIn('Ga naar {{plek:vervangen}} in {{boek}}: {{back-upbestand}} en {{exportbestand}}.', NAMEN)).toBe(
			`Ga naar ${PLEKNAAM.vervangen} in Lukas: lukas.bet-bewaard-2026-11-16-1103.json en lukas-04.redactie.json.`,
		);
	});

	it('weigert een onbekende plek of invulling', () => {
		expect(() => vulIn('{{plek:bestaatniet}}', NAMEN)).toThrow('bestaatniet');
		expect(() => vulIn('{{onbekend}}', NAMEN)).toThrow('onbekend');
	});
});

describe('splitsBlokken', () => {
	it('knipt de wijsregels en de legenda uit de Markdown', () => {
		const blokken = splitsBlokken(
			['Tekst voor.', '', '{{wijs grootte | Lettergrootte | In de balk bij {{plek:bewaard}}.}}', '{{legenda}}', 'Tekst na.'].join('\n'),
			NAMEN,
		);
		expect(blokken).toEqual([
			{ soort: 'markdown', markdown: 'Tekst voor.\n' },
			{ soort: 'wijs', sleutel: 'grootte', naam: 'Lettergrootte', waar: `In de balk bij ${BEWAARD_NAAM}.` },
			{ soort: 'legenda' },
			{ soort: 'markdown', markdown: 'Tekst na.' },
		]);
	});
});

describe('de helpteksten', () => {
	it('heeft voor elk onderdeel een bestand dat met een kop begint', () => {
		for (const onderdeel of alleOnderdelen()) expect(titelVan(onderdeel, NAMEN), onderdeel).not.toBe('');
	});

	it('noemt elke plek uit de balk bij Het hoofdmenu, met de naam uit boekplekken.ts', () => {
		const hoofdmenu = splitsBlokken(helptekst('hoofdmenu'), NAMEN)
			.map((blok) => (blok.soort === 'markdown' ? blok.markdown : ''))
			.join('\n');
		const plekken = boekPlekken('lukas', { precedenten: [], openVragen: [] }, null, 1);
		for (const plek of plekken) expect(hoofdmenu, plek.plek).toContain(`## ${plek.naam}`);
		expect(hoofdmenu).toContain(`## ${BEWAARD_NAAM}`);
	});

	it('begint de pagina van elke plek met de naam van die plek', () => {
		for (const plek of HELP_PLEKKEN) expect(titelVan(paginaOnderdeel(plek), NAMEN), plek).toBe(plekNaam(plek));
	});

	it('typt de namen van de tabbladen nergens over', () => {
		const tekst = alleTekst();
		for (const naam of [PLEKNAAM.besloten, PLEKNAAM.gevonden, PLEKNAAM.vragen, PLEKNAAM.vervangen]) expect(tekst, naam).not.toContain(naam);
	});

	it('legt elke status van een hoofdstuk uit', () => {
		const tekst = helptekst('pagina-hoofdstukken');
		for (const status of ALLE_STATUSSEN) expect(tekst, status).toContain(`| ${status} |`);
	});

	it('gebruikt geen em-dash en geen aankondigende labels', () => {
		const tekst = alleTekst();
		expect(tekst).not.toContain(EM_DASH);
		expect(tekst).not.toMatch(/^(Let op|Belangrijk|Conclusie):/m);
	});
});
