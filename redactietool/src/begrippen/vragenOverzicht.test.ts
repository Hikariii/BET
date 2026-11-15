import { describe, expect, it } from 'vitest';
import type { Vertaalvraag, VraagStatus } from './types';
import { filterVragen, GEEN_FILTER, groepeerLogVragen } from './vragenOverzicht';

function vraag(velden: Partial<Vertaalvraag> & Pick<Vertaalvraag, 'kwestie'>): Vertaalvraag {
	return {
		herkomst: { soort: 'hoofdstuk', hoofdstuk: 1, nummer: 1 },
		tekst: '',
		gekozen: null,
		alternatief: null,
		status: 'onbeslist',
		statusAfgeleid: true,
		verzen: [],
		...velden,
	};
}

const register = vraag({ kwestie: 'Zoon des mensen', herkomst: { soort: 'register' }, status: 'besloten', gekozen: 'Mensenzoon', verzen: [{ hoofdstuk: 5, vers: 24 }] });
const hoofdstukDrie = vraag({ kwestie: 'woestenij', herkomst: { soort: 'hoofdstuk', hoofdstuk: 3, nummer: 2 }, status: 'open', tekst: 'Een lege plek of een woestenij?' });
const versVraagVijf = vraag({ kwestie: 'En', herkomst: { soort: 'vers', hoofdstuk: 5, vers: 2 }, status: 'voorlopig besloten', tekst: 'Waarom blijft En staan?', verzen: [{ hoofdstuk: 5, vers: 2 }] });
const hoofdstukDrieMetVersInVijf = vraag({
	kwestie: 'bang',
	herkomst: { soort: 'hoofdstuk', hoofdstuk: 3, nummer: 1 },
	verzen: [{ hoofdstuk: 5, vers: 26 }],
});
const alle = [register, hoofdstukDrie, versVraagVijf, hoofdstukDrieMetVersInVijf];

function kwesties(vragen: readonly Vertaalvraag[]): string[] {
	return vragen.map((gevonden) => gevonden.kwestie);
}

describe('filterVragen', () => {
	it('laat zonder filter alles zien in dezelfde volgorde', () => {
		expect(kwesties(filterVragen(alle, GEEN_FILTER))).toEqual(['Zoon des mensen', 'woestenij', 'En', 'bang']);
	});

	it.each<[VraagStatus, string[]]>([
		['open', ['woestenij']],
		['besloten', ['Zoon des mensen']],
		['voorlopig besloten', ['En']],
		['onbeslist', ['bang']],
	])('filtert op status %s', (status, verwacht) => {
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, status }))).toEqual(verwacht);
	});

	it('filtert op herkomst: register tegen logs', () => {
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, herkomst: 'register' }))).toEqual(['Zoon des mensen']);
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, herkomst: 'logs' }))).toEqual(['woestenij', 'En', 'bang']);
	});

	it('filtert op hoofdstuk: uit het log van dat hoofdstuk of met een vers erin, ook bij het register', () => {
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, hoofdstuk: 3 }))).toEqual(['woestenij', 'bang']);
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, hoofdstuk: 5 }))).toEqual(['Zoon des mensen', 'En', 'bang']);
	});

	it('zoekt zonder letterverschil in kwestie, tekst en gekozen tekst', () => {
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, zoekterm: 'LEGE PLEK' }))).toEqual(['woestenij']);
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, zoekterm: 'mensenzoon' }))).toEqual(['Zoon des mensen']);
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, zoekterm: 'blijft en' }))).toEqual(['En']);
	});

	it('combineert de filters', () => {
		expect(kwesties(filterVragen(alle, { status: 'open', herkomst: 'logs', hoofdstuk: 3, zoekterm: 'woesten' }))).toEqual(['woestenij']);
		expect(filterVragen(alle, { status: 'open', herkomst: 'register', hoofdstuk: 'alle', zoekterm: '' })).toEqual([]);
	});
});

describe('groepeerLogVragen', () => {
	it('groepeert per hoofdstuk van het log, oplopend, zonder het register', () => {
		const groepen = groepeerLogVragen(alle);

		expect(groepen.map((groep) => [groep.hoofdstuk, kwesties(groep.vragen)])).toEqual([
			[3, ['woestenij', 'bang']],
			[5, ['En']],
		]);
	});
});
