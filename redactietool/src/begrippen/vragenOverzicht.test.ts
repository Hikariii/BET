import { describe, expect, it } from 'vitest';
import type { Vertaalvraag } from './types';
import { deelVragenIn, filterVragen, FILTERSTATUSSEN, GEEN_FILTER, groepeerLogVragen, type FilterStatus } from './vragenOverzicht';

function vraag(velden: Partial<Vertaalvraag> & Pick<Vertaalvraag, 'kwestie' | 'nr'>): Vertaalvraag {
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

const register = vraag({ nr: 'V12', kwestie: 'Zoon des mensen', herkomst: { soort: 'register' }, status: 'besloten', gekozen: 'Mensenzoon', verzen: [{ hoofdstuk: 5, vers: 24 }] });
const hoofdstukDrie = vraag({ nr: 'O3.2', kwestie: 'woestenij', herkomst: { soort: 'hoofdstuk', hoofdstuk: 3, nummer: 2 }, status: 'open', tekst: 'Een lege plek of een woestenij?' });
const versVraagVijf = vraag({ nr: 'O5.1', kwestie: 'En', herkomst: { soort: 'vers', hoofdstuk: 5, vers: 2 }, status: 'voorlopig besloten', tekst: 'Waarom blijft En staan?', verzen: [{ hoofdstuk: 5, vers: 2 }] });
const hoofdstukDrieMetVersInVijf = vraag({
	nr: 'O3.1',
	kwestie: 'bang',
	herkomst: { soort: 'hoofdstuk', hoofdstuk: 3, nummer: 1 },
	verzen: [{ hoofdstuk: 5, vers: 26 }],
});
const openRegister = vraag({ nr: 'V3', kwestie: 'onreine geest', herkomst: { soort: 'register' }, status: 'open' });
const alle = [register, hoofdstukDrie, versVraagVijf, hoofdstukDrieMetVersInVijf];

function kwesties(vragen: readonly Vertaalvraag[]): string[] {
	return vragen.map((gevonden) => gevonden.kwestie);
}

describe('filterVragen', () => {
	it('laat zonder filter alles zien in dezelfde volgorde', () => {
		expect(kwesties(filterVragen(alle, GEEN_FILTER))).toEqual(['Zoon des mensen', 'woestenij', 'En', 'bang']);
	});

	it.each<[FilterStatus, string[]]>([
		['open', ['onreine geest']],
		['Claude twijfelde nog', ['woestenij']],
		['besloten', ['Zoon des mensen']],
		['voorlopig besloten', ['En']],
		['onbeslist', ['bang']],
	])('filtert op status %s', (status, verwacht) => {
		expect(kwesties(filterVragen([...alle, openRegister], { ...GEEN_FILTER, status }))).toEqual(verwacht);
	});

	it('kent voor elke status een filterwaarde en laat "open" alleen de open registervragen zien, niet een opmerking met een statuswoord "open"', () => {
		const alles = [...alle, openRegister];

		expect(FILTERSTATUSSEN.flatMap((status) => filterVragen(alles, { ...GEEN_FILTER, status }))).toHaveLength(alles.length);
		expect(hoofdstukDrie.status).toBe('open');
		expect(kwesties(filterVragen(alles, { ...GEEN_FILTER, status: 'open' }))).not.toContain('woestenij');
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

	it('zoekt op nummer: het hele nummer, of een hoofdstuk van de opmerkingen, zonder letterverschil', () => {
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, zoekterm: 'V12' }))).toEqual(['Zoon des mensen']);
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, zoekterm: ' o3.2 ' }))).toEqual(['woestenij']);
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, zoekterm: 'O3' }))).toEqual(['woestenij', 'bang']);
		expect(kwesties(filterVragen(alle, { ...GEEN_FILTER, zoekterm: 'V1' }))).toEqual([]);
	});

	it('combineert de filters', () => {
		expect(kwesties(filterVragen(alle, { status: 'Claude twijfelde nog', herkomst: 'logs', hoofdstuk: 3, zoekterm: 'woesten' }))).toEqual(['woestenij']);
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

describe('deelVragenIn', () => {
	const alleMetOpen = [register, hoofdstukDrie, openRegister, versVraagVijf, hoofdstukDrieMetVersInVijf];

	it('zet alleen de open vragen uit het register in open, de andere registervragen bij een besluit en alle opmerkingen, ook die met een statuswoord "open", bij de opmerkingen', () => {
		const { open, metBesluit, opmerkingen } = deelVragenIn(alleMetOpen);

		expect(kwesties(open)).toEqual(['onreine geest']);
		expect(kwesties(metBesluit)).toEqual(['Zoon des mensen']);
		expect(kwesties(opmerkingen)).toEqual(['woestenij', 'En', 'bang']);
	});

	it('zet elke vraag in precies één groep', () => {
		const { open, metBesluit, opmerkingen } = deelVragenIn(alleMetOpen);

		expect(open.length + metBesluit.length + opmerkingen.length).toBe(alleMetOpen.length);
		expect(new Set([...open, ...metBesluit, ...opmerkingen]).size).toBe(alleMetOpen.length);
	});
});
