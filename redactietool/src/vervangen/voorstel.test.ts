import { describe, expect, it } from 'vitest';
import type { Opslag } from '../bewerken/tussenstand';
import { alsVoorstel, bewaarVoorstel, neemVoorstel, type Voorstel } from './voorstel';

function geheugenOpslag(weiger = false): Opslag & { sleutels: () => string[] } {
	const data = new Map<string, string>();
	return {
		getItem: (sleutel) => data.get(sleutel) ?? null,
		setItem: (sleutel, waarde) => {
			if (weiger) throw new Error('vol');
			data.set(sleutel, waarde);
		},
		removeItem: (sleutel) => {
			data.delete(sleutel);
		},
		sleutels: () => [...data.keys()],
	};
}

const voorstel: Voorstel = {
	kwestie: 'markering van "Gezegend"',
	optie: 'a) genade',
	opdracht: 'markering',
	zoekterm: 'gezegend',
	nieuw: '',
	van: 'eeuwigleven',
	naar: 'genade',
	verzen: [
		{ hoofdstuk: 6, vers: 20 },
		{ hoofdstuk: 7, vers: 23 },
	],
};

describe('voorstel doorgeven', () => {
	it('geeft het bewaarde voorstel één keer terug en laat daarna niets over', () => {
		const opslag = geheugenOpslag();
		bewaarVoorstel(opslag, 'lukas', voorstel);

		expect(neemVoorstel(opslag, 'lukas')).toEqual(voorstel);
		expect(neemVoorstel(opslag, 'lukas')).toBeNull();
		expect(opslag.sleutels()).toEqual([]);
	});

	it('houdt de voorstellen van twee boeken apart', () => {
		const opslag = geheugenOpslag();
		bewaarVoorstel(opslag, 'lukas', voorstel);

		expect(neemVoorstel(opslag, 'marcus')).toBeNull();
		expect(neemVoorstel(opslag, 'lukas')).toEqual(voorstel);
	});

	it('meldt onwaar als de opslag het bewaren weigert', () => {
		expect(bewaarVoorstel(geheugenOpslag(true), 'lukas', voorstel)).toBe(false);
	});

	it('geeft niets bij onleesbare tekst in de opslag', () => {
		const opslag = geheugenOpslag();
		opslag.setItem('bet-voorstel/lukas', '{kapot');

		expect(neemVoorstel(opslag, 'lukas')).toBeNull();
	});
});

describe('alsVoorstel', () => {
	it('leest een geldig voorstel en zet een onbekend domein op null', () => {
		expect(alsVoorstel({ ...voorstel, van: 'onbekend' })).toEqual({ ...voorstel, van: null });
	});

	it('weigert een voorstel met een onbekende opdracht of een kapot vers', () => {
		expect(alsVoorstel({ ...voorstel, opdracht: 'wissel' })).toBeNull();
		expect(alsVoorstel({ ...voorstel, verzen: [{ hoofdstuk: 'zes', vers: 20 }] })).toBeNull();
		expect(alsVoorstel({ ...voorstel, kwestie: 7 })).toBeNull();
		expect(alsVoorstel(null)).toBeNull();
	});
});
