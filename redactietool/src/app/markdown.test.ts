import { describe, expect, it } from 'vitest';
import { parseerInline, parseerMarkdown } from './markdown';

describe('parseerInline', () => {
	it('splitst vet, cursief en code uit de lopende tekst', () => {
		expect(parseerInline('een **vet** woord, *cursief* en `code`')).toEqual([
			{ soort: 'tekst', tekst: 'een ' },
			{ soort: 'vet', tekst: 'vet' },
			{ soort: 'tekst', tekst: ' woord, ' },
			{ soort: 'cursief', tekst: 'cursief' },
			{ soort: 'tekst', tekst: ' en ' },
			{ soort: 'code', tekst: 'code' },
		]);
	});

	it('laat tekst zonder opmaak heel', () => {
		expect(parseerInline('gewoon')).toEqual([{ soort: 'tekst', tekst: 'gewoon' }]);
	});
});

describe('parseerMarkdown', () => {
	it('herkent koppen, alinea\'s en lijsten', () => {
		const blokken = parseerMarkdown('### Kop\n\nEerste regel\ntweede regel\n\n- een\n- twee\n\n1. a\n2. b\n');

		expect(blokken.map((blok) => blok.soort)).toEqual(['kop', 'alinea', 'lijst', 'lijst']);
		expect(blokken[1]).toEqual({ soort: 'alinea', inhoud: [{ soort: 'tekst', tekst: 'Eerste regel tweede regel' }] });
		expect(blokken[2]).toMatchObject({ geordend: false, items: [[{ tekst: 'een' }], [{ tekst: 'twee' }]] });
		expect(blokken[3]).toMatchObject({ geordend: true });
	});

	it('leest een tabel zonder de scheidingsregel', () => {
		const blokken = parseerMarkdown('| Bron | Nieuw |\n|---|---|\n| des Heeren | van de Heer |\n');

		expect(blokken).toHaveLength(1);
		expect(blokken[0]).toMatchObject({
			soort: 'tabel',
			kop: [[{ tekst: 'Bron' }], [{ tekst: 'Nieuw' }]],
			rijen: [[[{ tekst: 'des Heeren' }], [{ tekst: 'van de Heer' }]]],
		});
	});

	it('leest een citaat', () => {
		expect(parseerMarkdown('> Zo staat het\n> in de bron\n')).toEqual([
			{ soort: 'citaat', inhoud: [{ soort: 'tekst', tekst: 'Zo staat het in de bron' }] },
		]);
	});
});
