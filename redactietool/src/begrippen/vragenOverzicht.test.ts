import { describe, expect, it } from 'vitest';
import type { Vertaalvraag, VraagStatus } from './types';
import { filterVragen, GEEN_FILTER, groepeerLogVragen, splitsOpenVragen, vraagSleutels } from './vragenOverzicht';

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

describe('splitsOpenVragen', () => {
	const openRegister = vraag({ kwestie: 'onreine geest', herkomst: { soort: 'register' }, status: 'open' });
	const alleMetOpen = [register, hoofdstukDrie, openRegister, versVraagVijf, hoofdstukDrieMetVersInVijf];

	it('zet de open vragen uit register en logs samen in open, de rest in overig, in de oorspronkelijke volgorde', () => {
		const { open, overig } = splitsOpenVragen(alleMetOpen);

		expect(kwesties(open)).toEqual(['woestenij', 'onreine geest']);
		expect(kwesties(overig)).toEqual(['Zoon des mensen', 'En', 'bang']);
	});

	it('houdt geen open vraag in overig en verliest geen vraag', () => {
		const { open, overig } = splitsOpenVragen(alleMetOpen);

		expect(open.length + overig.length).toBe(alleMetOpen.length);
		expect(overig.some((gevonden) => gevonden.status === 'open')).toBe(false);
	});
});

describe('vraagSleutels', () => {
	const tweedeVersVraag = vraag({ kwestie: 'Ook', herkomst: { soort: 'vers', hoofdstuk: 5, vers: 2 }, tekst: 'Een tweede vraag bij hetzelfde vers.' });
	const sleutels = vraagSleutels([register, hoofdstukDrie, versVraagVijf, tweedeVersVraag, hoofdstukDrieMetVersInVijf]);

	function sleutel(gevonden: Vertaalvraag): string {
		const waarde = sleutels.get(gevonden);
		if (waarde === undefined) throw new Error(`geen sleutel voor '${gevonden.kwestie}'`);
		return waarde;
	}

	it('leidt de sleutel af uit de herkomst', () => {
		expect(sleutel(register)).toBe('register-Zoon des mensen-1');
		expect(sleutel(hoofdstukDrie)).toBe('hoofdstuk-3-2-1');
		expect(sleutel(hoofdstukDrieMetVersInVijf)).toBe('hoofdstuk-3-1-1');
	});

	it('geeft twee vragen bij hetzelfde vers een verschillend volgnummer', () => {
		expect(sleutel(versVraagVijf)).toBe('vers-5-2-1');
		expect(sleutel(tweedeVersVraag)).toBe('vers-5-2-2');
	});

	it('geeft elke vraag een andere sleutel', () => {
		expect(new Set(sleutels.values()).size).toBe(sleutels.size);
		expect(sleutels.size).toBe(5);
	});
});
