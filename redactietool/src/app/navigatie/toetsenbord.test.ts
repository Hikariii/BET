import { describe, expect, it } from 'vitest';
import { buurVers, moetKopFocus, rasterStop, sprongRichting, type Toets, type Toetsdoel } from './toetsenbord';

describe('buurVers', () => {
	const bewerkbaar = [1, 2, 4, 7];

	it('geeft het volgende en het vorige bewerkbare vers', () => {
		expect(buurVers(bewerkbaar, 2, 1)).toBe(4);
		expect(buurVers(bewerkbaar, 4, -1)).toBe(2);
	});

	it('slaat een vers over dat niet te bewerken is en dus niet in de lijst staat', () => {
		expect(buurVers(bewerkbaar, 4, 1)).toBe(7);
		expect(buurVers(bewerkbaar, 3, 1)).toBe(4);
		expect(buurVers(bewerkbaar, 3, -1)).toBe(2);
	});

	it('geeft niets aan het eind van de lijst', () => {
		expect(buurVers(bewerkbaar, 7, 1)).toBeNull();
		expect(buurVers(bewerkbaar, 1, -1)).toBeNull();
	});

	it('begint zonder huidig vers vooraan, en bij terug achteraan', () => {
		expect(buurVers(bewerkbaar, null, 1)).toBe(1);
		expect(buurVers(bewerkbaar, null, -1)).toBe(7);
	});

	it('geeft niets bij een lege lijst', () => {
		expect(buurVers([], null, 1)).toBeNull();
		expect(buurVers([], 3, -1)).toBeNull();
	});
});

function doel(tagName: string, opties: { bewerkbaar?: boolean; inVenster?: boolean } = {}): Toetsdoel {
	return {
		tagName,
		isContentEditable: opties.bewerkbaar ?? false,
		closest: (selector) => (opties.inVenster === true && selector.includes('dialog') ? {} : null),
	};
}

function toets(key: string, hulp: Partial<Toets> = {}): Toets {
	return { key, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...hulp };
}

describe('sprongRichting', () => {
	it('j gaat naar het volgende vers en k naar het vorige, op de pagina', () => {
		expect(sprongRichting(toets('j'), doel('BUTTON'))).toBe(1);
		expect(sprongRichting(toets('k'), doel('BODY'))).toBe(-1);
		expect(sprongRichting(toets('k'), null)).toBe(-1);
	});

	it('laat andere toetsen met rust', () => {
		expect(sprongRichting(toets('x'), doel('BUTTON'))).toBeNull();
		expect(sprongRichting(toets('ArrowDown'), doel('BUTTON'))).toBeNull();
	});

	it('negeert j en k in een invoerveld, keuzelijst, tekstvak of de editor', () => {
		expect(sprongRichting(toets('j'), doel('INPUT'))).toBeNull();
		expect(sprongRichting(toets('j'), doel('TEXTAREA'))).toBeNull();
		expect(sprongRichting(toets('k'), doel('SELECT'))).toBeNull();
		expect(sprongRichting(toets('j'), doel('DIV', { bewerkbaar: true }))).toBeNull();
	});

	it('negeert j en k als een hulptoets ingedrukt is', () => {
		expect(sprongRichting(toets('j', { ctrlKey: true }), doel('BUTTON'))).toBeNull();
		expect(sprongRichting(toets('j', { metaKey: true }), doel('BUTTON'))).toBeNull();
		expect(sprongRichting(toets('k', { altKey: true }), doel('BUTTON'))).toBeNull();
		expect(sprongRichting(toets('k', { shiftKey: true }), doel('BUTTON'))).toBeNull();
	});

	it('negeert j en k in een venster dat open staat', () => {
		expect(sprongRichting(toets('j'), doel('BUTTON', { inVenster: true }))).toBeNull();
	});
});

describe('rasterStop', () => {
	const stop = (huidig: number, toets: string) => rasterStop(huidig, 24, 8, toets);

	it('gaat met links en rechts een stop verder of terug, ook over de rijgrens', () => {
		expect(stop(3, 'ArrowRight')).toBe(4);
		expect(stop(3, 'ArrowLeft')).toBe(2);
		expect(stop(7, 'ArrowRight')).toBe(8);
		expect(stop(8, 'ArrowLeft')).toBe(7);
	});

	it('gaat met omhoog en omlaag een rij verder of terug', () => {
		expect(stop(3, 'ArrowDown')).toBe(11);
		expect(stop(11, 'ArrowUp')).toBe(3);
	});

	it('blijft aan de randen staan', () => {
		expect(stop(23, 'ArrowRight')).toBe(23);
		expect(stop(0, 'ArrowLeft')).toBe(0);
		expect(stop(3, 'ArrowUp')).toBe(3);
		expect(stop(20, 'ArrowDown')).toBe(20);
	});

	it('gaat omlaag naar de laatste stop als de rij eronder korter is', () => {
		expect(rasterStop(13, 20, 8, 'ArrowDown')).toBe(19);
		expect(rasterStop(19, 20, 8, 'ArrowDown')).toBe(19);
		expect(rasterStop(10, 20, 8, 'ArrowDown')).toBe(18);
	});

	it('springt met Home en End naar de eerste en de laatste stop', () => {
		expect(stop(9, 'Home')).toBe(0);
		expect(stop(9, 'End')).toBe(23);
	});

	it('laat andere toetsen met rust', () => {
		expect(stop(9, 'Tab')).toBeNull();
		expect(stop(9, 'Enter')).toBeNull();
	});
});

describe('moetKopFocus', () => {
	it('zet de focus op de kop als de lezer naar een andere pagina gaat', () => {
		expect(moetKopFocus('hoofdstukken', 'gevonden')).toBe(true);
	});

	it('laat de focus staan bij het eerste openen en binnen dezelfde pagina', () => {
		expect(moetKopFocus(null, 'hoofdstukken')).toBe(false);
		expect(moetKopFocus('hoofdstukken', 'hoofdstukken')).toBe(false);
	});
});
