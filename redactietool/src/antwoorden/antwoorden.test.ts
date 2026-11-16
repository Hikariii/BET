import { beforeEach, describe, expect, it } from 'vitest';
import { GeheugenOpslag } from '../bewaren/testhulp';
import {
	antwoordenSleutel,
	bewaarAntwoord,
	EIGEN_ANTWOORD,
	haalKeuzeUitAntwoorden,
	leesAntwoorden,
	legAntwoordVast,
	levendeKeuzeIds,
	pasToelichtingAan,
	trekAntwoordIn,
	voegKeuzeToe,
	type Antwoord,
} from './antwoorden';

const NU = new Date('2026-11-16T12:00:00.000Z');
const GEZEGEND: Antwoord = { kwestie: 'Gezegend', optie: 'a) genade', toelichting: '', keuzeIds: ['k1'], gegeven: '2026-11-16T10:00:00.000Z' };
const HOUDEN: Antwoord = { kwestie: 'Houden', optie: 'b) niets doen', toelichting: '', keuzeIds: [], gegeven: '2026-11-16T10:05:00.000Z' };

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
		const opnieuw = { ...GEZEGEND, optie: 'b) houden', keuzeIds: [], gegeven: '2026-11-16T11:00:00.000Z' };

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
		const onleesbaar = [{ kwestie: 'x' }, 7, null, { ...HOUDEN, keuzeIds: 5 }, { ...HOUDEN, keuzeIds: [3] }, { ...HOUDEN, toelichting: 4 }];
		opslag.setItem(antwoordenSleutel('lukas'), JSON.stringify([GEZEGEND, ...onleesbaar, HOUDEN]));

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([GEZEGEND, HOUDEN]);
	});
});

describe('leesAntwoorden met oude antwoorden', () => {
	it('zet een antwoord met één keuzeId om naar keuzeIds met een lege toelichting, en null naar geen keuzes', () => {
		const oudMetKeuze = { kwestie: 'Gezegend', optie: 'a) genade', keuzeId: 'k1', gegeven: '2026-11-16T10:00:00.000Z' };
		const oudZonderKeuze = { kwestie: 'Houden', optie: 'b) niets doen', keuzeId: null, gegeven: '2026-11-16T10:05:00.000Z' };
		opslag.setItem(antwoordenSleutel('lukas'), JSON.stringify([oudMetKeuze, oudZonderKeuze]));

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([GEZEGEND, HOUDEN]);
	});
});

describe('legAntwoordVast', () => {
	it('weigert een eigen antwoord zonder toelichting en bewaart niets', () => {
		const uitkomst = legAntwoordVast(opslag, 'lukas', { kwestie: 'Gezegend', optie: EIGEN_ANTWOORD, toelichting: '  \n ' }, NU);

		expect(uitkomst).toEqual({ gelukt: false, melding: expect.stringContaining('toelichting') });
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([]);
	});

	it('bewaart een eigen antwoord met toelichting, zonder keuzes', () => {
		const uitkomst = legAntwoordVast(opslag, 'lukas', { kwestie: 'Gezegend', optie: EIGEN_ANTWOORD, toelichting: ' In een zaligspreking genade. ' }, NU);

		expect(uitkomst).toEqual({ gelukt: true });
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([
			{ kwestie: 'Gezegend', optie: EIGEN_ANTWOORD, toelichting: 'In een zaligspreking genade.', keuzeIds: [], gegeven: NU.toISOString() },
		]);
	});

	it('bewaart een gewone optie ook zonder toelichting', () => {
		legAntwoordVast(opslag, 'lukas', { kwestie: 'Houden', optie: 'b) niets doen', toelichting: '' }, NU);

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([{ ...HOUDEN, gegeven: NU.toISOString() }]);
	});

	it('weigert een tweede antwoord op dezelfde kwestie en laat het eerste staan', () => {
		bewaarAntwoord(opslag, 'lukas', GEZEGEND);

		const uitkomst = legAntwoordVast(opslag, 'lukas', { kwestie: 'Gezegend', optie: EIGEN_ANTWOORD, toelichting: 'anders' }, NU);

		expect(uitkomst.gelukt).toBe(false);
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([GEZEGEND]);
	});
});

describe('pasToelichtingAan', () => {
	it('vervangt de toelichting en laat optie en keuzes staan', () => {
		bewaarAntwoord(opslag, 'lukas', { ...GEZEGEND, toelichting: 'oud' });

		const uitkomst = pasToelichtingAan(opslag, 'lukas', 'Gezegend', 'nieuw', NU);

		expect(uitkomst).toEqual({ gelukt: true });
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([{ ...GEZEGEND, toelichting: 'nieuw', gegeven: NU.toISOString() }]);
	});

	it('maakt de toelichting van een eigen antwoord niet leeg, bij een gewone optie wel', () => {
		const eigen = { ...GEZEGEND, optie: EIGEN_ANTWOORD, toelichting: 'regel' };
		bewaarAntwoord(opslag, 'lukas', eigen);
		bewaarAntwoord(opslag, 'lukas', { ...HOUDEN, toelichting: 'iets' });

		expect(pasToelichtingAan(opslag, 'lukas', 'Gezegend', ' ', NU).gelukt).toBe(false);
		expect(pasToelichtingAan(opslag, 'lukas', 'Houden', '', NU).gelukt).toBe(true);

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([eigen, { ...HOUDEN, toelichting: '', gegeven: NU.toISOString() }]);
	});

	it('meldt een kwestie zonder antwoord', () => {
		expect(pasToelichtingAan(opslag, 'lukas', 'Onbekend', 'x', NU).gelukt).toBe(false);
	});
});

describe('voegKeuzeToe', () => {
	it('zet een eerste keuze in een nieuw antwoord met de optie, een lege toelichting en de keuze', () => {
		expect(voegKeuzeToe(opslag, 'lukas', { kwestie: 'Gezegend', optie: 'a) genade' }, 'k1', NU)).toBe(true);

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([{ ...GEZEGEND, gegeven: NU.toISOString() }]);
	});

	it('zet een tweede keuze bij hetzelfde antwoord en laat optie, toelichting en tijd staan', () => {
		const eigen: Antwoord = { kwestie: 'Gezegend', optie: EIGEN_ANTWOORD, toelichting: 'regel', keuzeIds: ['k1'], gegeven: '2026-11-16T10:00:00.000Z' };
		bewaarAntwoord(opslag, 'lukas', eigen);

		voegKeuzeToe(opslag, 'lukas', { kwestie: 'Gezegend', optie: 'a) genade' }, 'k2', NU);
		voegKeuzeToe(opslag, 'lukas', { kwestie: 'Gezegend', optie: 'a) genade' }, 'k2', NU);

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([{ ...eigen, keuzeIds: ['k1', 'k2'] }]);
	});
});

describe('haalKeuzeUitAntwoorden', () => {
	it('haalt alleen die keuze uit het antwoord en laat het antwoord met de andere staan', () => {
		bewaarAntwoord(opslag, 'lukas', { ...GEZEGEND, keuzeIds: ['k1', 'k2'] });

		haalKeuzeUitAntwoorden(opslag, 'lukas', 'k1');

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([{ ...GEZEGEND, keuzeIds: ['k2'] }]);
	});

	it('laat bij de laatste keuze een antwoord met toelichting staan en haalt er een zonder toelichting weg', () => {
		const metToelichting = { ...GEZEGEND, toelichting: 'regel' };
		const zonderToelichting = { ...GEZEGEND, kwestie: 'Andere', keuzeIds: ['k2'] };
		bewaarAntwoord(opslag, 'lukas', metToelichting);
		bewaarAntwoord(opslag, 'lukas', zonderToelichting);

		haalKeuzeUitAntwoorden(opslag, 'lukas', 'k1');
		haalKeuzeUitAntwoorden(opslag, 'lukas', 'k2');

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([{ ...metToelichting, keuzeIds: [] }]);
	});

	it('laat een antwoord zonder keuzes van een andere vraag staan', () => {
		bewaarAntwoord(opslag, 'lukas', GEZEGEND);
		bewaarAntwoord(opslag, 'lukas', HOUDEN);

		haalKeuzeUitAntwoorden(opslag, 'lukas', 'k1');

		expect(leesAntwoorden(opslag, 'lukas')).toEqual([HOUDEN]);
	});
});

describe('trekAntwoordIn', () => {
	it('trekt een antwoord zonder bestaande keuzes in, en de sleutel verdwijnt bij het laatste antwoord', () => {
		bewaarAntwoord(opslag, 'lukas', HOUDEN);

		expect(trekAntwoordIn(opslag, 'lukas', 'Houden', new Set())).toEqual({ gelukt: true });

		expect(opslag.getItem(antwoordenSleutel('lukas'))).toBeNull();
	});

	it('weigert zolang er een bestaande keuze onder hangt, en trekt in als die keuze niet meer bestaat', () => {
		bewaarAntwoord(opslag, 'lukas', GEZEGEND);

		const geweigerd = trekAntwoordIn(opslag, 'lukas', 'Gezegend', new Set(['k1']));
		expect(geweigerd).toEqual({ gelukt: false, melding: expect.stringContaining('keuzes') });
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([GEZEGEND]);

		expect(trekAntwoordIn(opslag, 'lukas', 'Gezegend', new Set(['elders']))).toEqual({ gelukt: true });
		expect(leesAntwoorden(opslag, 'lukas')).toEqual([]);
	});
});

describe('levendeKeuzeIds', () => {
	it('geeft alleen de keuzes onder het antwoord die nog bestaan', () => {
		const antwoord = { ...GEZEGEND, keuzeIds: ['k1', 'weg', 'k2'] };

		expect(levendeKeuzeIds(antwoord, new Set(['k1', 'k2', 'k3']))).toEqual(['k1', 'k2']);
	});
});
