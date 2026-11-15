import { describe, it } from 'vitest';
import { vindVertalingen, verschillendVertaald, type Bronvorm } from './gevonden';
import { lijnHoofdstukUit } from './uitlijn';
import { leesLukasHoofdstukken } from './lukasHoofdstukken.testhulp';

const AANTAL_REGELS = 30;

function regel(bronvorm: Bronvorm): string {
	const vertalingen = bronvorm.vertalingen
		.slice(0, 6)
		.map((vertaling) => `${vertaling.nieuw === '' ? '(weggevallen)' : vertaling.nieuw} ${vertaling.aantal}x`)
		.join(' | ');
	return `${String(bronvorm.aantal).padStart(5)}x  ${bronvorm.bronvorm}  ->  ${vertalingen}`;
}

/** Leest alleen de data en schrijft een overzicht; draai met `UITLIJNING_RAPPORT=1 npm test -- rapport`. */
describe.skipIf(process.env['UITLIJNING_RAPPORT'] === undefined)('rapport uitlijning Lukas', () => {
	it('toont de kwaliteit op echte data', () => {
		const hoofdstukken = leesLukasHoofdstukken();

		const begin = performance.now();
		const bronvormen = vindVertalingen(hoofdstukken);
		const duurMilliseconden = performance.now() - begin;

		const delen = hoofdstukken.flatMap((hoofdstuk) => lijnHoofdstukUit(hoofdstuk.bron, hoofdstuk.vereenvoudigd));
		const alleDelen = delen.flatMap((vers) => vers.delen);
		const woordenBron = alleDelen.reduce((som, deel) => som + deel.bron.length, 0);
		const gelijk = alleDelen.filter((deel) => deel.soort === 'gelijk').reduce((som, deel) => som + deel.bron.length, 0);
		const vervangen = alleDelen.filter((deel) => deel.soort === 'vervangen');
		const langeVervangingen = vervangen.filter((deel) => deel.bron.length > 4 || deel.nieuw.length > 6);

		const regels = [
			`hoofdstukken: ${hoofdstukken.length}, verzen: ${delen.length}, bronwoorden: ${woordenBron}`,
			`gelijk gebleven: ${((gelijk / woordenBron) * 100).toFixed(1)}%`,
			`vervangen stukken: ${vervangen.length}, waarvan te lang om te koppelen: ${langeVervangingen.length}`,
			`rekentijd vindVertalingen: ${duurMilliseconden.toFixed(0)} ms`,
			'',
			`Meest voorkomende vervangingen (niet gelijk):`,
			...bronvormen
				.filter((bronvorm) => bronvorm.vertalingen.some((vertaling) => !vertaling.gelijk))
				.map((bronvorm) => ({ ...bronvorm, vertalingen: bronvorm.vertalingen.filter((vertaling) => !vertaling.gelijk) }))
				.flatMap((bronvorm) => bronvorm.vertalingen.map((vertaling) => ({ bronvorm: bronvorm.bronvorm, vertaling })))
				.sort((a, b) => b.vertaling.aantal - a.vertaling.aantal)
				.slice(0, AANTAL_REGELS)
				.map(({ bronvorm, vertaling }) => `${String(vertaling.aantal).padStart(5)}x  ${bronvorm}  ->  ${vertaling.nieuw === '' ? '(weggevallen)' : vertaling.nieuw}`),
			'',
			`Verschillend vertaald:`,
			...verschillendVertaald(bronvormen).slice(0, AANTAL_REGELS).map(regel),
		];
		process.stdout.write(`${regels.join('\n')}\n`);
	});
});
