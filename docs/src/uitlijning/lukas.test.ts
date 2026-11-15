import { describe, expect, it } from 'vitest';
import { vindVertalingen, verschillendVertaald, type Bronvorm } from './gevonden';
import { leesLukasHoofdstukken } from './lukasHoofdstukken.testhulp';
import { lijnHoofdstukUit } from './uitlijn';

const hoofdstukken = leesLukasHoofdstukken();

function vind(bronvormen: readonly Bronvorm[], bronvorm: string): Bronvorm {
	const gevonden = bronvormen.find((kandidaat) => kandidaat.bronvorm === bronvorm);
	if (gevonden === undefined) throw new Error(`bronvorm '${bronvorm}' niet gevonden`);
	return gevonden;
}

/** Telt woorden rechtstreeks in de bestandstekst: zonder kop, tags, versnummers en alineatags, los van de parser en de tokenizer. */
function aantalWoorden(bestandstekst: string): number {
	const platteTekst = bestandstekst
		.replace(/^# .*$/m, '')
		.replace(/\{\/?[^{}\s]*\}/g, '')
		.replace(/==/g, '')
		.replace(/\[\d+\]/g, '')
		.replace(/^@\S+/gm, '');
	return platteTekst.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

function versnummers(bronvorm: Bronvorm, nieuw: string, hoofdstuk: number): number[] {
	const vertaling = bronvorm.vertalingen.find((kandidaat) => kandidaat.nieuw === nieuw);
	return (vertaling?.verzen ?? []).filter((plek) => plek.hoofdstuk === hoofdstuk).map((plek) => plek.vers);
}

describe('uitlijning van Lukas 1-24', () => {
	it('heeft 24 hoofdstukken', () => {
		expect(hoofdstukken.map((hoofdstuk) => hoofdstuk.nummer)).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
	});

	it('verliest in geen hoofdstuk een woord van de bron of van de vereenvoudiging', () => {
		for (const hoofdstuk of hoofdstukken) {
			const delen = lijnHoofdstukUit(hoofdstuk.bron, hoofdstuk.vereenvoudigd).flatMap((vers) => vers.delen);

			expect(`${hoofdstuk.nummer} bron ${delen.reduce((som, deel) => som + deel.bron.length, 0)}`).toBe(`${hoofdstuk.nummer} bron ${aantalWoorden(hoofdstuk.bronTekst)}`);
			expect(`${hoofdstuk.nummer} nieuw ${delen.reduce((som, deel) => som + deel.nieuw.length, 0)}`).toBe(`${hoofdstuk.nummer} nieuw ${aantalWoorden(hoofdstuk.vereenvoudigdTekst)}`);
		}
	});

	describe('vervangingen uit de wijzigingslogs', () => {
		const bronvormen = vindVertalingen(hoofdstukken);

		it('vindt Heere als Heer, in Lukas 4 op de verzen uit het log', () => {
			const heere = vind(bronvormen, 'heere');

			expect(heere.vertalingen[0]?.nieuw).toBe('heer');
			expect(heere.vertalingen[0]?.aantal).toBeGreaterThanOrEqual(80);
			expect(versnummers(heere, 'heer', 4)).toEqual(expect.arrayContaining([8, 12, 18]));
		});

		it('vindt "Zoon des mensen" als Mensenzoon, in Lukas 5 op vers 24', () => {
			const zoonDesMensen = vind(bronvormen, 'zoon des mensen');

			expect(zoonDesMensen.vertalingen[0]?.nieuw).toBe('mensenzoon');
			expect(zoonDesMensen.vertalingen[0]?.aantal).toBeGreaterThanOrEqual(15);
			expect(versnummers(zoonDesMensen, 'mensenzoon', 5)).toEqual([24]);
		});

		it('vindt Evangelie als Goede Nieuws op 4:18 en 4:43', () => {
			const evangelie = vind(bronvormen, 'evangelie');

			expect(versnummers(evangelie, 'goede nieuws', 4)).toEqual([18, 43]);
		});

		it('telt discipelen in Lukas 5 als gelijk gebleven: 3 keer in de bron en 3 keer in de vereenvoudiging', () => {
			const discipelen = vind(vindVertalingen(hoofdstukken.filter((hoofdstuk) => hoofdstuk.nummer === 5)), 'discipelen');

			expect(discipelen.vertalingen).toMatchObject([{ nieuw: 'discipelen', gelijk: true, aantal: 3 }]);
		});

		it('zet een woord dat verschillend vertaald is in de lijst, en een woord dat overal gelijk bleef niet', () => {
			const verschillend = verschillendVertaald(bronvormen).map((bronvorm) => bronvorm.bronvorm);

			expect(verschillend).toContain('menigte');
			expect(verschillend).not.toContain('tempel');
		});
	});

	it('verwerkt alle 24 hoofdstukken ruim binnen een seconde', () => {
		const begin = performance.now();
		verschillendVertaald(vindVertalingen(hoofdstukken));
		const duurMilliseconden = performance.now() - begin;

		expect(duurMilliseconden).toBeLessThan(1000);
	});
});
