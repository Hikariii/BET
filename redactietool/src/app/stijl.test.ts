import { describe, expect, it } from 'vitest';
import type { WordStijl } from '../data/types';
import type { Tekststuk } from '../formaat/types';
import { alineaOpmaakstijl, tekststukOpmaakstijl } from './stijl';

const stijlen: WordStijl[] = [
	{ id: 'Jezuswoorden', naam: 'Jezus_woorden', soort: 'alinea', kleur: '1F4E79', vet: true, cursief: false },
	{ id: 'genade', naam: 'genade', soort: 'teken', kleur: '00B050', vet: false, cursief: true },
	{ id: 'eeuwigleven', naam: 'eeuwigleven', soort: 'teken', kleur: '7030A0', vet: false, cursief: false },
];

function stuk(opmaak: Tekststuk['opmaak']): Tekststuk {
	return { soort: 'tekst', tekst: 'woord', opmaak };
}

describe('alineaOpmaakstijl', () => {
	it('neemt kleur en vet over uit de stijl van het sjabloon', () => {
		expect(alineaOpmaakstijl('jezus', stijlen)).toEqual({ color: '#1F4E79', fontWeight: 'bold' });
	});

	it('geeft niets voor een alinea zonder stijl of een stijl die het sjabloon niet kent', () => {
		expect(alineaOpmaakstijl(null, stijlen)).toEqual({});
		expect(alineaOpmaakstijl('god', stijlen)).toEqual({});
	});
});

describe('tekststukOpmaakstijl', () => {
	it('neemt de kleur van een domein uit het sjabloon, met cursief als de stijl dat heeft', () => {
		expect(tekststukOpmaakstijl(stuk(['genade']), stijlen)).toEqual({ color: '#00B050', fontStyle: 'italic' });
		expect(tekststukOpmaakstijl(stuk(['eeuwigleven']), stijlen)).toEqual({ color: '#7030A0' });
	});

	it('maakt onderwijs rood en highlight geel volgens de koppeling', () => {
		expect(tekststukOpmaakstijl(stuk(['onderwijs']), stijlen)).toEqual({ color: '#FF0000' });
		expect(tekststukOpmaakstijl(stuk(['highlight']), stijlen)).toEqual({ backgroundColor: 'yellow' });
	});

	it('zet vet, onderstreept en cursief direct om', () => {
		expect(tekststukOpmaakstijl(stuk(['onderstreept', 'vet', 'cursief']), stijlen)).toEqual({
			textDecoration: 'underline',
			fontWeight: 'bold',
			fontStyle: 'italic',
		});
	});

	it('voegt genestelde opmaak samen; de binnenste kleur wint', () => {
		const gemarkeerd = tekststukOpmaakstijl(stuk(['onderwijs', 'highlight', 'genade']), stijlen);

		expect(gemarkeerd).toEqual({ color: '#00B050', backgroundColor: 'yellow', fontStyle: 'italic' });
	});

	it('geeft niets voor een stuk zonder opmaak', () => {
		expect(tekststukOpmaakstijl(stuk([]), stijlen)).toEqual({});
	});
});
