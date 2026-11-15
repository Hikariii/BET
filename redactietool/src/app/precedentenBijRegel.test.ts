import { describe, expect, it } from 'vitest';
import type { Precedent } from '../data/types';
import { precedentenBijRegel } from './precedentenBijRegel';

function precedent(bron: string, vereenvoudigd: string): Precedent {
	return { sectie: 'Begrippen', bron, vereenvoudigd, plaats: '', status: 'voorlopig', opmerking: '' };
}

const TABEL = [
	precedent('discipel(en)', 'discipel(en); eerste keer "discipelen (leerlingen)"'),
	precedent('verzoeken', 'op de proef stellen'),
	precedent('roep / gerucht', 'nieuws'),
	precedent('Wee jullie', 'Het zal slecht met jullie aflopen'),
];

describe('precedentenBijRegel', () => {
	it('vindt het precedent waarvan de bron in de logregel staat', () => {
		expect(precedentenBijRegel('"verzocht werd" wordt "op de proef gesteld werd": verzoeken wordt op de proef stellen', TABEL)).toEqual([TABEL[1]]);
	});

	it('vindt een variant na een schuine streep en een stam zonder de uitgang tussen haakjes', () => {
		expect(precedentenBijRegel('"gerucht" wordt "nieuws"', TABEL)).toEqual([TABEL[2]]);
		expect(precedentenBijRegel('de discipelen volgden Hem', TABEL)).toEqual([TABEL[0]]);
	});

	it('vindt niets als alleen een korte term of het eind van een woord overeenkomt', () => {
		expect(precedentenBijRegel('het nieuws vanuit de roep', [precedent('roep', 'x')])).toEqual([]);
		expect(precedentenBijRegel('de leerlingen', [precedent('lingen', 'x')])).toEqual([]);
	});

	it('laat een algemene vereenvoudiging als "blijft" niet meetellen', () => {
		expect(precedentenBijRegel('"ten slotte" blijft', [precedent('Sadduceeën', 'blijft')])).toEqual([]);
	});

	it('geeft meer precedenten terug op volgorde van de tabel', () => {
		expect(precedentenBijRegel('Wee jullie: de discipelen zeggen verzoeken', TABEL)).toEqual([TABEL[0], TABEL[1], TABEL[3]]);
	});
});
