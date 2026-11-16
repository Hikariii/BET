import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hoofdstukJsonNaam } from '../data/bestandsnamen';
import { ALINEASTIJL_NAAR_WORD, DOMEIN_NAAR_WORD, TITEL_WORD } from '../data/stijlkoppeling';
import type { BoekData, BoekLijst, HoofdstukData, Referentie, Richtlijn, Status } from '../data/types';
import type { Hoofdstuk } from '../formaat/types';
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

/** Telt de gegevensregels van de tabellen in een Markdown-bestand op een andere manier dan de parsers: alle tabelregels, min de scheidingsregels, min één kopregel per tabel. */
function telTabelrijen(pad: string): number {
	const tabelregels = readFileSync(pad, 'utf-8')
		.split('\n')
		.filter((regel) => regel.startsWith('|'));
	const scheidingsregels = tabelregels.filter((regel) => /^\|[-:| ]+\|$/.test(regel));
	return tabelregels.length - 2 * scheidingsregels.length;
}

function versnummers(hoofdstuk: Hoofdstuk): number[] {
	return hoofdstuk.alineas
		.flatMap((alinea) => (alinea.soort === 'tekst' ? alinea.stukken : []))
		.flatMap((stuk) => (stuk.soort === 'vers' ? [stuk.nummer] : []));
}

type MiniRepoInhoud = { statusTekst?: string; openVragenRegels?: string[]; stijlenZonder?: string };

/** styles.xml met alle stijlen die de tool nodig heeft, behalve `zonder`. */
function stylesXmlMetAlleStijlen(zonder: string | undefined): string {
	const stijlen = [
		...Object.values(ALINEASTIJL_NAAR_WORD).map((id) => ({ id, type: 'paragraph' })),
		...[...Object.values(DOMEIN_NAAR_WORD), TITEL_WORD].map((id) => ({ id, type: 'character' })),
	];
	const elementen = stijlen
		.filter(({ id }) => id !== zonder)
		.map(({ id, type }) => `<w:style w:type="${type}" w:styleId="${id}"><w:name w:val="${id}"/></w:style>`);
	return `<w:styles>${elementen.join('')}</w:styles>`;
}

/** Een boek `test` van één hoofdstuk met drie verzen, net genoeg voor `bouwData`. */
function maakMiniRepo({ statusTekst, openVragenRegels, stijlenZonder }: MiniRepoInhoud): string {
	const hoofdmap = mkdtempSync(path.join(tmpdir(), 'bet-minirepo-'));
	const boekmap = path.join(hoofdmap, 'bijbel/test');
	for (const map of ['bron', 'referentie']) {
		mkdirSync(path.join(boekmap, map), { recursive: true });
	}
	mkdirSync(path.join(hoofdmap, 'richtlijn'));

	const boek = { naam: 'Test', bestandsprefix: 'test', sjabloon: 'sjabloon.docx', verzen_per_hoofdstuk: [3] };
	writeFileSync(path.join(boekmap, 'boek.json'), JSON.stringify(boek));
	writeFileSync(path.join(boekmap, 'sjabloon.docx'), zipSync({ 'word/styles.xml': strToU8(stylesXmlMetAlleStijlen(stijlenZonder)) }));
	writeFileSync(
		path.join(boekmap, 'STATUS.md'),
		statusTekst ?? '| Hoofdstuk | Status | Versie | Herkomst | Opmerking |\n|---|---|---|---|---|\n| Test 1 | - | | | |\n',
	);
	writeFileSync(path.join(boekmap, 'bron/test-01.md'), '# Test 1\n\n[1] Een. [2] Twee. [3] Drie.\n');
	const openVragenKop = '| Nr | Plaats | Begrip / kwestie | Gekozen in tekst | Alternatief | Status | Besluit | Verzen |\n|---|---|---|---|---|---|---|---|\n';
	writeFileSync(path.join(boekmap, 'referentie/open-vragen.md'), openVragenKop + (openVragenRegels ?? []).join('\n') + '\n');
	writeFileSync(path.join(hoofdmap, 'richtlijn/redactierichtlijn.md'), '# Richtlijn\n\n## 1. Eerste\n\nTekst.\n');
	return hoofdmap;
}

/** Bouwt de mini-repo met deze bestanden en geeft de foutmelding van de bouw, of een lege tekst als de bouw slaagt. */
function foutVanBouw(inhoud: MiniRepoInhoud): string {
	const hoofdmap = maakMiniRepo(inhoud);
	try {
		bouwData({ hoofdmap, uitvoermap: path.join(hoofdmap, 'uit') });
		return '';
	} catch (fout) {
		return fout instanceof Error ? fout.message : String(fout);
	} finally {
		rmSync(hoofdmap, { recursive: true, force: true });
	}
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

describe('bouwData op een kleine repo', () => {
	it('bouwt een geldige mini-repo zonder fout', () => {
		const regel = '| V1 | Lk 1:3 | kwestie | gekozen | alternatief | open | | 1:3 |';

		expect(foutVanBouw({ openVragenRegels: [regel] })).toBe('');
	});

	it('weigert een open vraag met een vers dat het hoofdstuk niet heeft en noemt bestand, vraag en vers', () => {
		const regel = '| V1 | Lk 1:4 | slecht vers | gekozen | alternatief | open | | 1:4 |';

		const melding = foutVanBouw({ openVragenRegels: [regel] });

		expect(melding).toContain(path.join('bijbel/test/referentie/open-vragen.md'));
		expect(melding).toContain("vraag 'Lk 1:4: slecht vers'");
		expect(melding).toContain('vers 1:4 bestaat niet, hoofdstuk 1 heeft 3 verzen');
	});

	it('weigert een open vraag met een onbekend hoofdstuk', () => {
		const regel = '| V1 | Lk 2:1 | ander hoofdstuk | gekozen | alternatief | open | | 1:1, 2:1 |';

		const melding = foutVanBouw({ openVragenRegels: [regel] });

		expect(melding).toContain("vraag 'Lk 2:1: ander hoofdstuk'");
		expect(melding).toContain('vers 2:1 bestaat niet, hoofdstuk 2 bestaat niet (het boek heeft 1 hoofdstukken)');
	});

	it('weigert een boek.json met een aantal verzen dat geen geheel getal is', () => {
		const hoofdmap = maakMiniRepo({});
		const boekPad = path.join(hoofdmap, 'bijbel/test/boek.json');
		writeFileSync(boekPad, JSON.stringify({ naam: 'Test', bestandsprefix: 'test', sjabloon: 'sjabloon.docx', verzen_per_hoofdstuk: [3.5] }));
		try {
			expect(() => bouwData({ hoofdmap, uitvoermap: path.join(hoofdmap, 'uit') })).toThrow(
				`${boekPad}: verwacht naam, bestandsprefix, sjabloon en verzen_per_hoofdstuk`,
			);
		} finally {
			rmSync(hoofdmap, { recursive: true, force: true });
		}
	});

	it('zet het pad van het referentiebestand voor een fout van de parser', () => {
		const regel = '| V1 | Lk 1:1 | kwestie | gekozen | alternatief | open | | eerste vers |';

		const melding = foutVanBouw({ openVragenRegels: [regel] });

		expect(melding).toContain(path.join('bijbel/test/referentie/open-vragen.md') + ': regel 3: ongeldige versaanduiding');
	});

	it('weigert een sjabloon zonder een stijl die de tool gebruikt en noemt sjabloon en stijl', () => {
		const melding = foutVanBouw({ stijlenZonder: 'Torah' });

		expect(melding).toContain(path.join('bijbel/test/sjabloon.docx'));
		expect(melding).toContain("tekenstijl 'Torah' ontbreekt");
	});

	it('zet het pad van STATUS.md voor een fout van de parser', () => {
		const statusTekst = '| Hoofdstuk | Status | Versie | Herkomst | Opmerking |\n|---|---|---|---|---|\n| Test 1 | bijna klaar | | | |\n';

		const melding = foutVanBouw({ statusTekst });

		expect(melding).toContain(path.join('bijbel/test/STATUS.md') + ": regel 3: onbekende status 'bijna klaar'");
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

		expect(boek).toMatchObject({ id: 'lukas', naam: 'Lukas', prefix: 'lukas' });
		expect(boek.stijlen.map((stijl) => stijl.id)).toContain('Jezuswoorden');
		expect(boek.hoofdstukken.map((hoofdstuk) => hoofdstuk.nummer)).toEqual(
			Array.from({ length: verzenPerHoofdstuk.length }, (_leeg, index) => index + 1),
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

	it('schrijft voor elk hoofdstuk uit boek.json een bestand in de vorm van HoofdstukData', () => {
		expect(verzenPerHoofdstuk).toHaveLength(24);

		verzenPerHoofdstuk.forEach((_aantalVerzen, index) => {
			const nummer = index + 1;
			const hoofdstuk = leesJson(path.join(uitvoermap, 'lukas', hoofdstukJsonNaam(nummer))) as HoofdstukData;

			expect(hoofdstuk).toEqual({
				nummer,
				bron: { alineas: expect.any(Array) },
				vereenvoudigd: { alineas: expect.any(Array) },
				log: { verzen: expect.any(Array), algemeneVragen: expect.any(Array) },
			});
			expect(hoofdstuk.bron.alineas.length, `bron Lukas ${nummer}`).toBeGreaterThan(0);
		});
	});

	it('neemt vereenvoudiging en log mee van de hoofdstukken waar die bestaan', () => {
		const eerste = leesJson(path.join(uitvoermap, 'lukas', hoofdstukJsonNaam(1))) as HoofdstukData;
		const vierde = leesJson(path.join(uitvoermap, 'lukas', hoofdstukJsonNaam(4))) as HoofdstukData;
		const logTekst = readFileSync(path.join(HOOFDMAP, 'bijbel/lukas/wijzigingslog/lukas-04.md'), 'utf-8');
		const aantalVersKoppen = logTekst.match(/^## Vers /gm)?.length ?? 0;

		expect(versnummers(eerste.vereenvoudigd)).toEqual(Array.from({ length: verzenPerHoofdstuk[0]! }, (_leeg, index) => index + 1));
		expect(aantalVersKoppen).toBeGreaterThan(0);
		expect(vierde.log.verzen).toHaveLength(aantalVersKoppen);
	});

	it('heeft in elk bronhoofdstuk de versnummers 1 tot en met het aantal uit boek.json', () => {
		verzenPerHoofdstuk.forEach((aantalVerzen, index) => {
			const hoofdstuk = leesJson(path.join(uitvoermap, 'lukas', hoofdstukJsonNaam(index + 1))) as HoofdstukData;

			expect(versnummers(hoofdstuk.bron), `Lukas ${index + 1}`).toEqual(Array.from({ length: aantalVerzen }, (_leeg, nummer) => nummer + 1));
		});
	});

	it('schrijft in referentie.json evenveel precedenten en open vragen als de tabellen regels hebben', () => {
		const referentie = leesJson(path.join(uitvoermap, 'lukas/referentie.json')) as Referentie;
		const precedentenAantal = telTabelrijen(path.join(HOOFDMAP, 'bijbel/lukas/referentie/precedenten.md'));
		const openVragenAantal = telTabelrijen(path.join(HOOFDMAP, 'bijbel/lukas/referentie/open-vragen.md'));

		expect(precedentenAantal).toBeGreaterThan(0);
		expect(openVragenAantal).toBeGreaterThan(0);
		expect(referentie.precedenten).toHaveLength(precedentenAantal);
		expect(referentie.openVragen).toHaveLength(openVragenAantal);
	});

	it('schrijft in richtlijn.json paragraaf 11 met zijn titel', () => {
		const richtlijn = leesJson(path.join(uitvoermap, 'richtlijn.json')) as Richtlijn;

		expect(richtlijn.titel).toMatch(/^Redactierichtlijn/);
		expect(richtlijn.secties.find((sectie) => sectie.paragraaf === '11')).toMatchObject({
			titel: 'Ouderwets Nederlands moderniseren',
			niveau: 2,
		});
		expect(richtlijn.secties.length).toBeGreaterThan(20);
	});
});
