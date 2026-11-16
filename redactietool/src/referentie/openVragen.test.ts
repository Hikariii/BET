import { describe, expect, it } from 'vitest';
import type { VersRef } from '../data/types';
import { leesRepobestand, leesVereenvoudigdeVerzen } from './bestanden.testhulp';
import { leesOpenVragen } from './openVragen';

const KOP = '| Plaats | Begrip / kwestie | Gekozen in tekst | Alternatief | Status | Besluit | Verzen |\n|---|---|---|---|---|---|---|';
const rij = (verzen: string, plaats = 'Lk 1:1') => `| ${plaats} | kwestie | gekozen | alternatief | open | besluit | ${verzen} |`;
const versen = (hoofdstuk: number, ...nummers: number[]): VersRef[] => nummers.map((vers) => ({ hoofdstuk, vers }));

describe('leesOpenVragen op open-vragen.md', () => {
	const tekst = leesRepobestand('bijbel/lukas/referentie/open-vragen.md');
	const vragen = leesOpenVragen(tekst);
	const vereenvoudigd = leesVereenvoudigdeVerzen();

	it('geeft elke tabelregel', () => {
		const rijen = tekst.split('\n').filter((regel) => regel.startsWith('| Lk '));

		expect(rijen.length).toBeGreaterThan(0);
		expect(vragen).toHaveLength(rijen.length);
	});

	it('geeft een lege lijst verzen aan precies de vragen met een lege cel Verzen', () => {
		const rijenZonderVerzen = tekst.split('\n').filter((regel) => regel.startsWith('| Lk ') && /\|\s*\|$/.test(regel));

		expect(vragen.filter((vraag) => vraag.verzen.length === 0)).toHaveLength(rijenZonderVerzen.length);
	});

	it('geeft elk vers in verzen dat echt in het vereenvoudigde hoofdstuk staat', () => {
		const ontbrekend = vragen.flatMap((vraag) =>
			vraag.verzen
				.filter(({ hoofdstuk, vers }) => !vereenvoudigd.get(hoofdstuk)?.has(vers))
				.map(({ hoofdstuk, vers }) => `${hoofdstuk}:${vers} bij '${vraag.kwestie}'`),
		);

		expect(ontbrekend).toEqual([]);
	});

	it('geeft de vraag over Zoon des mensen met alle 26 verzen waar Mensenzoon staat', () => {
		const vraag = vragen.find((kandidaat) => kandidaat.kwestie === 'Zoon des mensen');
		const metMensenzoon = [...vereenvoudigd]
			.filter(([hoofdstuk]) => hoofdstuk >= 4)
			.flatMap(([hoofdstuk, verzen]) => [...verzen].filter(([, tekst]) => tekst.includes('Mensenzoon')).map(([vers]) => ({ hoofdstuk, vers })));

		expect(vraag?.verzen).toEqual(metMensenzoon);
	});

	it('geeft de vraag over Gezegend met 1:45, 1:48 en elk vers in 4 tot 24 met {eeuwigleven}Gezegend', () => {
		const vraag = vragen.find((kandidaat) => kandidaat.kwestie.startsWith('markering van "Gezegend"'));
		const metEeuwigleven = [...vereenvoudigd]
			.filter(([hoofdstuk]) => hoofdstuk >= 4)
			.flatMap(([hoofdstuk, verzen]) => [...verzen].filter(([, tekst]) => /\{eeuwigleven\}gezegend/i.test(tekst)).map(([vers]) => ({ hoofdstuk, vers })));

		expect(metEeuwigleven.length).toBeGreaterThan(0);
		expect(vraag?.verzen.slice(0, 2)).toEqual(versen(1, 45, 48));
		expect(vraag?.verzen.slice(2)).toEqual(metEeuwigleven);
	});
});

describe('leesOpenVragen op kleine invoer', () => {
	it('geeft een enkel vers, een lijst en een bereik met spaties', () => {
		expect(leesOpenVragen(`${KOP}\n${rij('1:45')}\n${rij('1:45 ,  6:20-22,7:23')}`).map((vraag) => vraag.verzen)).toEqual([
			versen(1, 45),
			[...versen(1, 45), ...versen(6, 20, 21, 22), ...versen(7, 23)],
		]);
	});

	it('geeft een bereik van één vers als één vers', () => {
		expect(leesOpenVragen(`${KOP}\n${rij('6:22-22')}`)[0]?.verzen).toEqual(versen(6, 22));
	});

	it('geeft een lege cel Verzen als lege lijst', () => {
		expect(leesOpenVragen(`${KOP}\n${rij('')}`)[0]?.verzen).toEqual([]);
	});

	it('geeft de overige kolommen ongewijzigd', () => {
		expect(leesOpenVragen(`${KOP}\n${rij('2:1', 'Lk 2:1')}`)).toEqual([
			{ plaats: 'Lk 2:1', kwestie: 'kwestie', gekozen: 'gekozen', alternatief: 'alternatief', status: 'open', besluit: 'besluit', verzen: versen(2, 1) },
		]);
	});

	it('geeft een lege lijst verzen als de kolom Verzen ontbreekt', () => {
		const tekst = '| Plaats | Begrip / kwestie | Gekozen in tekst | Alternatief | Status | Besluit |\n|---|---|---|---|---|---|\n| Lk 1:1 | k | g | a | open | b |';

		expect(leesOpenVragen(tekst)[0]?.verzen).toEqual([]);
	});

	it.each([
		['een streepje van het verkeerde soort', '6:20–22'],
		['een puntkomma tussen verzen', '1:45; 1:48'],
		['een vers zonder hoofdstuk', '45'],
		['een bereik tussen hoofdstukken', '6:20-7:2'],
		['een bereik dat achteruit loopt', '6:22-20'],
		['een versnummer nul', '6:0'],
		['een lege plek in de lijst', '1:45, , 1:48'],
		['tekst in plaats van verzen', 'zie log'],
	])('meldt %s met het regelnummer', (_naam, verzen) => {
		expect(() => leesOpenVragen(`Voorwoord\n\n${KOP}\n${rij('1:1')}\n${rij(verzen)}`)).toThrowError(/^regel 6: ongeldig(e versaanduiding| bereik) /);
	});

	it('meldt een ontbrekende kolom bij de kopregel', () => {
		expect(() => leesOpenVragen('| Plaats | Status |\n|---|---|')).toThrowError("regel 1: kolom 'Begrip / kwestie' ontbreekt");
	});

	it('meldt een bestand zonder tabel', () => {
		expect(() => leesOpenVragen('Geen tabel.')).toThrowError('regel 1: geen tabel gevonden');
	});
});
