import { describe, expect, it } from 'vitest';
import { serialiseerHoofdstuk } from './serialiseer';
import type { Alinea, Inlinestuk, Opmaak } from './types';

function tekst(inhoud: string, ...opmaak: Opmaak[]): Inlinestuk {
	return { soort: 'tekst', tekst: inhoud, opmaak };
}

function schrijf(...stukken: Inlinestuk[]): string {
	const alinea: Alinea = { soort: 'tekst', stijl: null, stukken };
	return serialiseerHoofdstuk({ alineas: [alinea] });
}

describe('serialiseren', () => {
	it('sluit elke alinea af met een regeleinde en schrijft kop, lege regel en stijl', () => {
		const uitvoer = serialiseerHoofdstuk({
			alineas: [
				{ soort: 'titel', tekst: 'Lukas 3' },
				{ soort: 'leeg' },
				{ soort: 'tekst', stijl: 'jezus', stukken: [tekst('Woorden')] },
				{ soort: 'tekst', stijl: 'god', stukken: [] },
			],
		});
		expect(uitvoer).toBe('# Lukas 3\n\n@jezus Woorden\n@god\n');
	});

	it('zet opmaak in de nestingvolgorde van FORMAAT.md, ook als de stukken een andere volgorde hebben', () => {
		expect(schrijf(tekst('a', 'zonde', 'vet', 'onderwijs'))).toBe('{onderwijs}{vet}{zonde}a{/zonde}{/vet}{/onderwijs}\n');
	});

	it('schrijft highlight als ==', () => {
		expect(schrijf(tekst('a', 'highlight'))).toBe('==a==\n');
	});

	it('houdt een tag open over aansluitende stukken en sluit alleen wat verandert', () => {
		expect(schrijf(tekst('a', 'vet'), tekst('b', 'vet', 'cursief'), tekst('c', 'vet'))).toBe('{vet}a{cursief}b{/cursief}c{/vet}\n');
	});

	it('sluit de tags vóór een versnummer en opent ze erna opnieuw', () => {
		const uitvoer = schrijf(tekst('a ', 'onderwijs'), { soort: 'vers', nummer: 5 }, tekst(' b', 'onderwijs'));
		expect(uitvoer).toBe('{onderwijs}a {/onderwijs}[5]{onderwijs} b{/onderwijs}\n');
	});

	it('sluit en opent opnieuw als een buitenste opmaak wegvalt terwijl een binnenste blijft', () => {
		const uitvoer = schrijf(tekst('a', 'onderwijs', 'onderstreept'), tekst('b', 'onderstreept'));
		expect(uitvoer).toBe('{onderwijs}{onderstreept}a{/onderstreept}{/onderwijs}{onderstreept}b{/onderstreept}\n');
	});
});
