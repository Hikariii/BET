import { describe, expect, it } from 'vitest';
import type { Tussenstand, VersInhoud } from '../../bewerken/types';
import type { BoekData, HoofdstukData, Status } from '../../data/types';
import type { Hoofdstuk } from '../../formaat/types';
import type { Vondst } from '../../vervangen/types';
import { bouwHoofdstukVerzen, groepeerVondsten, plekken, standaardAangevinkt, vondstSleutel } from './vervangenVoorbeeld';

const GEEN_TUSSENSTAND: Tussenstand = { verzen: {} };

function tekst(inhoud: string) {
	return { soort: 'tekst', tekst: inhoud, opmaak: [] } as const;
}

function hoofdstuk(...verzen: [number, string][]): Hoofdstuk {
	return {
		alineas: [{ soort: 'tekst', stijl: null, stukken: verzen.flatMap(([nummer, inhoud]) => [{ soort: 'vers', nummer } as const, tekst(inhoud)]) }],
	};
}

function hoofdstukData(nummer: number, vereenvoudigd: Hoofdstuk): HoofdstukData {
	return { nummer, bron: { alineas: [] }, vereenvoudigd, log: { verzen: [], algemeneVragen: [] } };
}

function boek(statussen: Record<number, Status>): BoekData {
	return {
		id: 'test',
		naam: 'Test',
		prefix: 'tst',
		stijlen: [],
		hoofdstukken: Object.entries(statussen).map(([nummer, status]) => ({ nummer: Number(nummer), status, versie: '', herkomst: '', opmerking: '' })),
	};
}

function inhoudVan(...stukken: string[]): VersInhoud {
	return { delen: [{ stijl: null, stukken: stukken.map(tekst) }] };
}

describe('bouwHoofdstukVerzen', () => {
	it('knipt elk vers en neemt de status goedgekeurd uit het boek over', () => {
		const uitkomst = bouwHoofdstukVerzen(
			[hoofdstukData(1, hoofdstuk([1, 'Eerste. '], [2, 'Tweede.'])), hoofdstukData(2, hoofdstuk([1, 'Derde.']))],
			boek({ 1: 'goedgekeurd', 2: 'concept' }),
			() => GEEN_TUSSENSTAND,
		);

		expect(uitkomst).toEqual([
			{ hoofdstuk: 1, goedgekeurd: true, verzen: [{ vers: 1, inhoud: inhoudVan('Eerste. ') }, { vers: 2, inhoud: inhoudVan('Tweede.') }] },
			{ hoofdstuk: 2, goedgekeurd: false, verzen: [{ vers: 1, inhoud: inhoudVan('Derde.') }] },
		]);
	});

	it('zet een hoofdstuk zonder status in STATUS.md op niet goedgekeurd', () => {
		const [uitkomst] = bouwHoofdstukVerzen([hoofdstukData(3, hoofdstuk([1, 'Tekst.']))], boek({}), () => GEEN_TUSSENSTAND);

		expect(uitkomst?.goedgekeurd).toBe(false);
	});

	it('zet de bewerkte verzen uit de tussenstand van dat hoofdstuk erin', () => {
		const repo = inhoudVan('Oud.');
		const bewerkt = inhoudVan('Nieuw.');
		const tussenstanden: Record<number, Tussenstand> = {
			2: { verzen: { 1: { inhoud: bewerkt, basis: repo, bewaard: '2026-11-15T10:00:00.000Z' } } },
		};

		const uitkomst = bouwHoofdstukVerzen(
			[hoofdstukData(1, hoofdstuk([1, 'Oud.'])), hoofdstukData(2, hoofdstuk([1, 'Oud.']))],
			boek({ 1: 'concept', 2: 'concept' }),
			(nummer) => tussenstanden[nummer] ?? GEEN_TUSSENSTAND,
		);

		expect(uitkomst.map(({ verzen }) => verzen[0]?.inhoud)).toEqual([repo, bewerkt]);
	});
});

function vondst(hoofdstukNummer: number, vers: number, opties: Partial<Vondst> = {}): Vondst {
	return {
		hoofdstuk: hoofdstukNummer,
		vers,
		deel: 0,
		van: 0,
		tot: 3,
		gevonden: 'abc',
		ervoor: '',
		erna: '',
		vervangbaar: true,
		goedgekeurd: false,
		...opties,
	};
}

describe('groepeerVondsten', () => {
	const gewoon1 = vondst(1, 1);
	const gewoon1b = vondst(1, 4);
	const goedgekeurd2 = vondst(2, 1, { goedgekeurd: true });
	const gewoon3 = vondst(3, 2);
	const handGoedgekeurd = vondst(2, 5, { goedgekeurd: true, vervangbaar: false });
	const hand3 = vondst(3, 7, { vervangbaar: false });
	const groepen = groepeerVondsten([gewoon1, gewoon1b, goedgekeurd2, handGoedgekeurd, gewoon3, hand3]);

	it('groepeert vervangbare vondsten van open hoofdstukken per hoofdstuk', () => {
		expect(groepen.open).toEqual([
			{ hoofdstuk: 1, vondsten: [gewoon1, gewoon1b] },
			{ hoofdstuk: 3, vondsten: [gewoon3] },
		]);
	});

	it('zet vervangbare vondsten van goedgekeurde hoofdstukken in een eigen groep', () => {
		expect(groepen.goedgekeurd).toEqual([{ hoofdstuk: 2, vondsten: [goedgekeurd2] }]);
	});

	it('zet vondsten over een opmaakgrens bij "met de hand", ook in een goedgekeurd hoofdstuk', () => {
		expect(groepen.metDeHand).toEqual([handGoedgekeurd, hand3]);
	});
});

describe('standaardAangevinkt', () => {
	it('vinkt alleen vervangbare vondsten in niet-goedgekeurde hoofdstukken aan', () => {
		const aan = vondst(1, 1);
		const uit = [vondst(2, 1, { goedgekeurd: true }), vondst(1, 2, { vervangbaar: false })];

		expect(standaardAangevinkt([aan, ...uit])).toEqual(new Set([vondstSleutel(aan)]));
	});

	it('geeft elke plek een eigen sleutel', () => {
		const sleutels = [vondst(1, 1), vondst(1, 1, { van: 5 }), vondst(1, 1, { deel: 1 }), vondst(1, 2), vondst(2, 1)].map(vondstSleutel);

		expect(new Set(sleutels).size).toBe(5);
	});
});

describe('plekken', () => {
	it('gebruikt het enkelvoud bij één plek', () => {
		expect([plekken(0), plekken(1), plekken(2)]).toEqual(['0 plekken', '1 plek', '2 plekken']);
	});
});
