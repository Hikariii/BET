import { describe, expect, it } from 'vitest';
import type { Tussenstand, VersInhoud } from '../../bewerken/types';
import type { BoekData, HoofdstukData, Status } from '../../data/types';
import type { Hoofdstuk } from '../../formaat/types';
import type { Plek } from '../../vervangen/zoekopdracht';
import { aangepastZin, bouwHoofdstukVerzen, gevondenZin, groepeerPlekken, keuzeBeschrijving, kiesBereik, kortUit, plekken, standaardAangevinkt, vondstSleutel, verdeelPlekken } from './vervangenVoorbeeld';

const GEEN_TUSSENSTAND: Tussenstand = { verzen: {} };

function tekst(inhoud: string) {
	return { soort: 'tekst', tekst: inhoud, opmaak: [] } as const;
}

function hoofdstuk(...verzen: [number, string][]): Hoofdstuk {
	return {
		alineas: [{ soort: 'tekst', stijl: null, stukken: verzen.flatMap(([nummer, inhoud]) => [{ soort: 'vers', nummer } as const, tekst(inhoud)]) }],
	};
}

function hoofdstukData(nummer: number, vereenvoudigd: Hoofdstuk): HoofdstukData {
	return { nummer, bron: { alineas: [] }, vereenvoudigd, log: { verzen: [], algemeneVragen: [] } };
}

function boek(statussen: Record<number, Status>): BoekData {
	return {
		id: 'test',
		naam: 'Test',
		prefix: 'tst',
		stijlen: [],
		hoofdstukken: Object.entries(statussen).map(([nummer, status]) => ({ nummer: Number(nummer), status, versie: '', herkomst: '', opmerking: '' })),
	};
}

function inhoudVan(...stukken: string[]): VersInhoud {
	return { delen: [{ stijl: null, stukken: stukken.map(tekst) }] };
}

describe('bouwHoofdstukVerzen', () => {
	it('knipt elk vers en neemt de status goedgekeurd uit het boek over', () => {
		const uitkomst = bouwHoofdstukVerzen(
			[hoofdstukData(1, hoofdstuk([1, 'Eerste. '], [2, 'Tweede.'])), hoofdstukData(2, hoofdstuk([1, 'Derde.']))],
			boek({ 1: 'goedgekeurd', 2: 'concept' }),
			() => GEEN_TUSSENSTAND,
		);

		expect(uitkomst).toEqual([
			{
				hoofdstuk: 1,
				goedgekeurd: true,
				verzen: [
					{ vers: 1, inhoud: inhoudVan('Eerste. '), repo: inhoudVan('Eerste. ') },
					{ vers: 2, inhoud: inhoudVan('Tweede.'), repo: inhoudVan('Tweede.') },
				],
			},
			{ hoofdstuk: 2, goedgekeurd: false, verzen: [{ vers: 1, inhoud: inhoudVan('Derde.'), repo: inhoudVan('Derde.') }] },
		]);
	});

	it('zet een hoofdstuk zonder status in STATUS.md op niet goedgekeurd', () => {
		const [uitkomst] = bouwHoofdstukVerzen([hoofdstukData(3, hoofdstuk([1, 'Tekst.']))], boek({}), () => GEEN_TUSSENSTAND);

		expect(uitkomst?.goedgekeurd).toBe(false);
	});

	it('zet de bewerkte verzen uit de tussenstand van dat hoofdstuk erin', () => {
		const repo = inhoudVan('Oud.');
		const bewerkt = inhoudVan('Nieuw.');
		const tussenstanden: Record<number, Tussenstand> = {
			2: { verzen: { 1: { inhoud: bewerkt, basis: repo, bewaard: '2026-11-15T10:00:00.000Z', herkomst: 'zelf getypt' } } },
		};

		const uitkomst = bouwHoofdstukVerzen(
			[hoofdstukData(1, hoofdstuk([1, 'Oud.'])), hoofdstukData(2, hoofdstuk([1, 'Oud.']))],
			boek({ 1: 'concept', 2: 'concept' }),
			(nummer) => tussenstanden[nummer] ?? GEEN_TUSSENSTAND,
		);

		expect(uitkomst.map(({ verzen }) => verzen[0]?.inhoud)).toEqual([repo, bewerkt]);
		expect(uitkomst.map(({ verzen }) => verzen[0]?.repo)).toEqual([repo, repo]);
	});
});

function plek(hoofdstukNummer: number, vers: number, opties: Partial<Plek> = {}): Plek {
	return {
		hoofdstuk: hoofdstukNummer,
		vers,
		deel: 0,
		van: 0,
		tot: 3,
		gevonden: 'abc',
		ervoor: '',
		erna: '',
		vervangbaar: true,
		goedgekeurd: false,
		variant: null,
		...opties,
	};
}

describe('groepeerPlekken', () => {
	const gewoon1 = plek(1, 1);
	const gewoon1b = plek(1, 4);
	const goedgekeurd2 = plek(2, 1, { goedgekeurd: true });
	const gewoon3 = plek(3, 2);
	const handGoedgekeurd = plek(2, 5, { goedgekeurd: true, vervangbaar: false });
	const hand3 = plek(3, 7, { vervangbaar: false });
	const variantEen = plek(1, 2, { variant: 'zegende' });
	const variantTwee = plek(3, 3, { variant: 'zegende', goedgekeurd: true });
	const variantAnders = plek(2, 2, { variant: 'gezegenden' });
	const variantHand = plek(2, 3, { variant: 'zegende', vervangbaar: false });
	const groepen = groepeerPlekken([gewoon1, variantEen, gewoon1b, goedgekeurd2, variantAnders, variantHand, handGoedgekeurd, gewoon3, variantTwee, hand3]);

	it('groepeert vervangbare plekken van de zoekterm in open hoofdstukken per hoofdstuk', () => {
		expect(groepen.open).toEqual([
			{ hoofdstuk: 1, plekken: [gewoon1, gewoon1b] },
			{ hoofdstuk: 3, plekken: [gewoon3] },
		]);
	});

	it('zet vervangbare plekken van goedgekeurde hoofdstukken in een eigen groep', () => {
		expect(groepen.goedgekeurd).toEqual([{ hoofdstuk: 2, plekken: [goedgekeurd2] }]);
	});

	it('zet plekken over een opmaakgrens bij "met de hand", ook varianten en ook in een goedgekeurd hoofdstuk', () => {
		expect(groepen.metDeHand).toEqual([variantHand, handGoedgekeurd, hand3]);
	});

	it('groepeert varianten per vorm op alfabet, in elk hoofdstuk, zonder de varianten met de hand', () => {
		expect(groepen.varianten).toEqual([
			{ vorm: 'gezegenden', plekken: [variantAnders] },
			{ vorm: 'zegende', plekken: [variantEen, variantTwee] },
		]);
	});
});

describe('standaardAangevinkt', () => {
	it('vinkt alleen vervangbare plekken van de zoekterm in niet-goedgekeurde hoofdstukken aan', () => {
		const aan = plek(1, 1);
		const uit = [plek(2, 1, { goedgekeurd: true }), plek(1, 2, { vervangbaar: false }), plek(1, 3, { variant: 'zegende' })];

		expect(standaardAangevinkt([aan, ...uit])).toEqual(new Set([vondstSleutel(aan)]));
	});

	it('geeft elke plek een eigen sleutel', () => {
		const sleutels = [plek(1, 1), plek(1, 1, { van: 5 }), plek(1, 1, { deel: 1 }), plek(1, 2), plek(2, 1)].map(vondstSleutel);

		expect(new Set(sleutels).size).toBe(5);
	});
});

describe('verdeelPlekken', () => {
	const aangevinkt = plek(1, 1, { gevonden: 'Gezegend' });
	const uitgevinkt = plek(1, 2, { gevonden: 'gezegend' });
	const goedgekeurd = plek(2, 1, { goedgekeurd: true, gevonden: 'gezegend' });
	const metDeHand = plek(1, 3, { vervangbaar: false, gevonden: 'ge-zegend' });
	const variant = plek(1, 4, { variant: 'zegende', gevonden: 'zegende' });
	const alle = [aangevinkt, uitgevinkt, goedgekeurd, metDeHand, variant];
	const sleutels = (...gekozen: Plek[]) => new Set(gekozen.map(vondstSleutel));

	it('geeft elke plek die niet wordt toegepast de reden: met de hand, goedgekeurd, uitgevinkt of variant niet toegepast', () => {
		const { toe, overgeslagen } = verdeelPlekken(alle, sleutels(aangevinkt), 'tekst', new Map());

		expect(toe).toEqual([aangevinkt]);
		expect(overgeslagen).toEqual([
			{ hoofdstuk: 1, vers: 2, gevonden: 'gezegend', reden: 'uitgevinkt' },
			{ hoofdstuk: 2, vers: 1, gevonden: 'gezegend', reden: 'goedgekeurd' },
			{ hoofdstuk: 1, vers: 3, gevonden: 'ge-zegend', reden: 'met de hand' },
			{ hoofdstuk: 1, vers: 4, gevonden: 'zegende', reden: 'variant niet toegepast' },
		]);
	});

	it('past een plek met de hand niet toe, ook als hij aangevinkt is', () => {
		const { toe, overgeslagen } = verdeelPlekken([metDeHand], sleutels(metDeHand), 'tekst', new Map());

		expect(toe).toEqual([]);
		expect(overgeslagen.map(({ reden }) => reden)).toEqual(['met de hand']);
	});

	it('past een aangevinkte goedgekeurde plek wel toe', () => {
		expect(verdeelPlekken([goedgekeurd], sleutels(goedgekeurd), 'tekst', new Map()).toe).toEqual([goedgekeurd]);
	});

	it('past een aangevinkte variant bij tekst alleen toe met een vervanging voor die vorm', () => {
		const zonder = verdeelPlekken([variant], sleutels(variant), 'tekst', new Map([['zegende', '']]));
		const met = verdeelPlekken([variant], sleutels(variant), 'tekst', new Map([['zegende', 'zegende']]));

		expect(zonder.toe).toEqual([]);
		expect(zonder.overgeslagen.map(({ reden }) => reden)).toEqual(['variant niet toegepast']);
		expect(met.toe).toEqual([variant]);
	});

	it('geeft een uitgevinkte variant de reden variant niet toegepast en een uitgevinkte plek van de zoekterm zelf uitgevinkt', () => {
		const { overgeslagen } = verdeelPlekken([uitgevinkt, variant], sleutels(), 'markering', new Map());

		expect(overgeslagen.map(({ reden }) => reden)).toEqual(['uitgevinkt', 'variant niet toegepast']);
	});

	it('past een aangevinkte variant bij een markeringswissel toe zonder invoer', () => {
		expect(verdeelPlekken([variant], sleutels(variant), 'markering', new Map()).toe).toEqual([variant]);
	});
});

describe('verdeelPlekken bij varianten met een eigen reden', () => {
	it('houdt bij een variant de reden met de hand of goedgekeurd: dat zijn besluiten', () => {
		const metDeHand = plek(1, 5, { variant: 'zegende', vervangbaar: false, gevonden: 'ze-gende' });
		const goedgekeurd = plek(2, 2, { variant: 'zegende', goedgekeurd: true, gevonden: 'zegende' });
		const gewoon = plek(1, 6, { variant: 'zegende', gevonden: 'zegende' });

		const { overgeslagen } = verdeelPlekken([metDeHand, goedgekeurd, gewoon], new Set(), 'tekst', new Map());

		expect(overgeslagen.map((plaats) => plaats.reden)).toEqual(['met de hand', 'goedgekeurd', 'variant niet toegepast']);
	});
});

describe('kiesBereik', () => {
	const verzen = [{ hoofdstuk: 6, vers: 20 }];

	it('neemt zonder vraag het hele boek', () => {
		expect(kiesBereik(null, false)).toEqual({ bereik: { soort: 'boek' }, melding: null });
	});

	it('neemt bij een vraag de verzen van de vraag, tenzij de vertaler het hele boek kiest', () => {
		expect(kiesBereik(verzen, false)).toEqual({ bereik: { soort: 'verzen', verzen }, melding: null });
		expect(kiesBereik(verzen, true)).toEqual({ bereik: { soort: 'boek' }, melding: null });
	});

	it('geeft een melding in plaats van het hele boek bij een vraag zonder verzen', () => {
		const uitkomst = kiesBereik([], false);

		expect(uitkomst.bereik).toBeNull();
		expect(uitkomst.melding).toContain('hoort bij geen enkel vers');
		expect(kiesBereik([], true).bereik).toEqual({ soort: 'boek' });
	});
});

describe('kortUit', () => {
	it('laat een korte tekst staan', () => {
		expect(kortUit('Wee jullie', 40)).toBe('Wee jullie');
	});

	it('kapt een lange tekst af op een woordgrens met weglatingspunten', () => {
		expect(kortUit('de bron markeert zalig als eeuwigleven', 20)).toBe('de bron markeert…');
	});

	it('kapt een woord zonder spaties midden in af', () => {
		expect(kortUit('abcdefghij', 4)).toBe('abcd…');
	});
});

describe('keuzeBeschrijving', () => {
	it('beschrijft een tekstvervanging met de zoekterm en de nieuwe tekst', () => {
		expect(keuzeBeschrijving({ soort: 'tekst', zoekterm: 'de Mensenzoon', nieuw: 'Mensenzoon', van: null, naar: null })).toBe('"de Mensenzoon" door "Mensenzoon"');
	});

	it('beschrijft een markeringswissel met van en naar', () => {
		expect(keuzeBeschrijving({ soort: 'markering', zoekterm: 'gezegend', nieuw: '', van: 'eeuwigleven', naar: 'genade' })).toBe(
			'markering van "gezegend": eeuwigleven wordt genade',
		);
	});
});

describe('plekken', () => {
	it('gebruikt het enkelvoud bij één plek', () => {
		expect([plekken(0), plekken(1), plekken(2)]).toEqual(['0 plekken', '1 plek', '2 plekken']);
	});

	it('zegt bij nul plekken dat alleen de vereenvoudigde tekst doorzocht is', () => {
		expect(gevondenZin(0, 'zalig')).toBe('Geen plekken gevonden voor "zalig" in de vereenvoudigde tekst. De bron wordt hier niet doorzocht.');
		expect(gevondenZin(1, 'zalig')).toBe('1 plek gevonden voor "zalig" in de vereenvoudigde tekst.');
	});

	it('zegt na Toepassen in één zin hoeveel plekken in hoeveel verzen zijn aangepast', () => {
		expect(aangepastZin(10, 9)).toBe('10 plekken in 9 verzen aangepast.');
		expect(aangepastZin(1, 1)).toBe('1 plek in 1 vers aangepast.');
	});
});
