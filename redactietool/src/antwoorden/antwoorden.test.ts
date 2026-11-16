import { beforeEach, describe, expect, it } from 'vitest';
import { GeheugenOpslag } from '../bewaren/testhulp';
import { antwoordenSleutel, antwoordToestand, bewaarAntwoord, leesAntwoorden, verwijderAntwoord, verwijderAntwoordenVanKeuze, type Antwoord } from './antwoorden';

const GEZEGEND: Antwoord = { kwestie: 'Gezegend', optie: 'a) genade', keuzeId: 'k1', gegeven: '2026-11-16T10:00:00.000Z' };
const HOUDEN: Antwoord = { kwestie: 'Houden', optie: 'b) niets doen', keuzeId: null, gegeven: '2026-11-16T10:05:00.000Z' };

let opslag: GeheugenOpslag;
beforeEach(() => {
	opslag = new GeheugenOpslag();
});

describe('bewaarAntwoord en leesAntwoorden', () => {
	it('geeft terug wat bewaard is, per boek', () => {
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([]);

		expect(bewaarAntwoord(opslag, 'lukas', GEZEGEND)).toBe(true);
		bewaarAntwoord(opslag, 'lukas', HOUDEN);

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([GEZEGEND, HOUDEN]);
		expect(leesAntwoorden(opslag, 'johannes')).toEqual([]);
	});

	it('vervangt een eerder antwoord op dezelfde kwestie en laat andere antwoorden staan', () => {
		bewaarAntwoord(opslag, 'lukas', GEZEGEND);
		bewaarAntwoord(opslag, 'lukas', HOUDEN);
		const opnieuw = { ...GEZEGEND, optie: 'b) houden', keuzeId: null, gegeven: '2026-11-16T11:00:00.000Z' };

		bewaarAntwoord(opslag, 'lukas', opnieuw);

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([HOUDEN, opnieuw]);
	});

	it('geeft onwaar als de opslag vol is, en laat het oude antwoord staan', () => {
		bewaarAntwoord(opslag, 'lukas', GEZEGEND);
		opslag.setItem = () => {
			throw new DOMException('De opslag is vol', 'QuotaExceededError');
		};

		expect(bewaarAntwoord(opslag, 'lukas', HOUDEN)).toBe(false);
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([GEZEGEND]);
	});
});

describe('leesAntwoorden bij onleesbare opslag', () => {
	it('geeft een lege lijst bij rommel, bij een niet-lijst en bij een opslag die niet te lezen is', () => {
		opslag.setItem(antwoordenSleutel('lukas'), 'rommel');
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([]);

		opslag.setItem(antwoordenSleutel('lukas'), '{"kwestie": "x"}');
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([]);

		opslag.getItem = () => {
			throw new DOMException('Geweigerd', 'SecurityError');
		};
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([]);
	});

	it('slaat een onleesbaar antwoord over en houdt de rest', () => {
		opslag.setItem(antwoordenSleutel('lukas'), JSON.stringify([GEZEGEND, { kwestie: 'x' }, 7, null, { ...HOUDEN, keuzeId: 5 }, HOUDEN]));

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([GEZEGEND, HOUDEN]);
	});
});

describe('verwijderAntwoord', () => {
	it('haalt alleen het antwoord op die kwestie weg, en de sleutel als er niets overblijft', () => {
		bewaarAntwoord(opslag, 'lukas', GEZEGEND);
		bewaarAntwoord(opslag, 'lukas', HOUDEN);

		verwijderAntwoord(opslag, 'lukas', 'Gezegend');
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([HOUDEN]);

		verwijderAntwoord(opslag, 'lukas', 'Houden');
		expect(opslag.getItem(antwoordenSleutel('lukas'))).toBeNull();
	});
});

describe('verwijderAntwoordenVanKeuze', () => {
	it('haalt de antwoorden van die keuze weg en laat antwoorden zonder keuze en van andere keuzes staan', () => {
		const anderKeuze = { ...HOUDEN, kwestie: 'Andere', keuzeId: 'k2' };
		bewaarAntwoord(opslag, 'lukas', GEZEGEND);
		bewaarAntwoord(opslag, 'lukas', HOUDEN);
		bewaarAntwoord(opslag, 'lukas', anderKeuze);

		verwijderAntwoordenVanKeuze(opslag, 'lukas', 'k1');

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([HOUDEN, anderKeuze]);
	});
});

describe('antwoordToestand', () => {
	const antwoord = (keuzeId: string | null) => ({ kwestie: 'k', optie: 'a) x', keuzeId, gegeven: '2026-11-16T10:00:00.000Z' });

	it('telt een antwoord alleen als met keuze zolang die keuze bestaat', () => {
		expect(antwoordToestand(null, new Set())).toBe('geen');
		expect(antwoordToestand(antwoord(null), new Set(['k1']))).toBe('zonder keuze');
		expect(antwoordToestand(antwoord('k1'), new Set(['k1']))).toBe('met keuze');
		expect(antwoordToestand(antwoord('weg'), new Set(['k1']))).toBe('zonder keuze');
	});
});
