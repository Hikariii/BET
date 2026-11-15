import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BoekData, BoekLijst, HoofdstukData, Referentie, RichtlijnSectie, Status } from '../data/types';
import { bouwData } from './bouw';
import { leesStylesXml } from './leesStylesXml';

const HOOFDMAP = path.resolve(import.meta.dirname, '../../..');

const STATUSSEN = {
	'nog niet begonnen': true,
	concept: true,
	review: true,
	'bij editor': true,
	verwerkt: true,
	goedgekeurd: true,
} satisfies Record<Status, true>;

function leesJson(pad: string): unknown {
	return JSON.parse(readFileSync(pad, 'utf-8'));
}

describe('leesStylesXml', () => {
	it('geeft word/styles.xml uit een docx', () => {
		const docx = zipSync({
			'[Content_Types].xml': strToU8('<Types/>'),
			'word/styles.xml': strToU8('<w:styles>Jezuswoorden</w:styles>'),
			'word/document.xml': strToU8('<w:document/>'),
		});

		expect(leesStylesXml(docx, 'sjabloon.docx')).toBe('<w:styles>Jezuswoorden</w:styles>');
	});

	it('weigert een zip zonder word/styles.xml en noemt het bestand', () => {
		const geenWord = zipSync({ 'leesmij.txt': strToU8('geen Word') });

		expect(() => leesStylesXml(geenWord, 'fout.docx')).toThrow('fout.docx: word/styles.xml ontbreekt');
	});
});

describe('bouwData op de echte repo', () => {
	let uitvoermap = '';
	let verzenPerHoofdstuk: number[] = [];

	beforeAll(() => {
		uitvoermap = mkdtempSync(path.join(tmpdir(), 'bet-data-'));
		bouwData({ hoofdmap: HOOFDMAP, uitvoermap });
		const boekJson = leesJson(path.join(HOOFDMAP, 'bijbel/lukas/boek.json')) as { verzen_per_hoofdstuk: number[] };
		verzenPerHoofdstuk = boekJson.verzen_per_hoofdstuk;
	});

	afterAll(() => {
		rmSync(uitvoermap, { recursive: true, force: true });
	});

	it('schrijft de boekenlijst met Lukas', () => {
		expect(leesJson(path.join(uitvoermap, 'boeken.json'))).toEqual([{ id: 'lukas', naam: 'Lukas' }] satisfies BoekLijst);
	});

	it('schrijft boek.json met 24 hoofdstukken in de vorm van BoekData', () => {
		const boek = leesJson(path.join(uitvoermap, 'lukas/boek.json')) as BoekData;

		expect(boek).toMatchObject({ id: 'lukas', naam: 'Lukas', prefix: 'lukas', stijlen: expect.any(Array) });
		expect(boek.hoofdstukken.map((hoofdstuk) => hoofdstuk.nummer)).toEqual(
			Array.from({ length: 24 }, (_leeg, index) => index + 1),
		);
		for (const hoofdstuk of boek.hoofdstukken) {
			expect(hoofdstuk).toEqual({
				nummer: expect.any(Number),
				status: expect.stringMatching(new RegExp(`^(${Object.keys(STATUSSEN).join('|')})$`)),
				versie: expect.any(String),
				herkomst: expect.any(String),
				opmerking: expect.any(String),
			});
		}
	});

	it('schrijft voor alle 24 hoofdstukken een bestand in de vorm van HoofdstukData', () => {
		expect(verzenPerHoofdstuk).toHaveLength(24);

		for (let nummer = 1; nummer <= 24; nummer++) {
			const hoofdstuk = leesJson(
				path.join(uitvoermap, `lukas/hoofdstuk-${String(nummer).padStart(2, '0')}.json`),
			) as HoofdstukData;

			expect(hoofdstuk).toEqual({
				nummer,
				bron: { alineas: expect.any(Array) },
				vereenvoudigd: { alineas: expect.any(Array) },
				log: { verzen: expect.any(Array), algemeneVragen: expect.any(Array) },
			});
		}
	});

	it('heeft in elk bronhoofdstuk de versnummers 1 tot en met het aantal uit boek.json', () => {
		verzenPerHoofdstuk.forEach((aantalVerzen, index) => {
			const hoofdstuk = leesJson(
				path.join(uitvoermap, `lukas/hoofdstuk-${String(index + 1).padStart(2, '0')}.json`),
			) as HoofdstukData;

			const versnummers = hoofdstuk.bron.alineas
				.flatMap((alinea) => (alinea.soort === 'tekst' ? alinea.stukken : []))
				.flatMap((stuk) => (stuk.soort === 'vers' ? [stuk.nummer] : []));

			expect(versnummers, `Lukas ${index + 1}`).toEqual(Array.from({ length: aantalVerzen }, (_leeg, nummer) => nummer + 1));
		});
	});

	it('schrijft referentie.json en richtlijn.json als lijsten', () => {
		const referentie = leesJson(path.join(uitvoermap, 'lukas/referentie.json')) as Referentie;
		const richtlijn = leesJson(path.join(uitvoermap, 'richtlijn.json')) as RichtlijnSectie[];

		expect(referentie).toEqual({ precedenten: expect.any(Array), openVragen: expect.any(Array) });
		expect(richtlijn).toEqual(expect.any(Array));
	});
});
