import { describe, expect, it } from 'vitest';
import type { Domein } from '../formaat/types';
import { leesRepobestand } from '../referentie/bestanden.testhulp';
import { leesOpenVragen } from '../referentie/openVragen';
import { domeinInOptie, isHoudOptie, maakVoorstel, splitsOpties, zoektermUitKwestie } from './opties';

describe('splitsOpties', () => {
	it('splitst a), b) en c) op de puntkomma en houdt de letters', () => {
		expect(splitsOpties('a) genade, zoals in 1:45/1:48 (referentie, §25A); b) eeuwigleven houden; c) een ander woord kiezen')).toEqual([
			'a) genade, zoals in 1:45/1:48 (referentie, §25A)',
			'b) eeuwigleven houden',
			'c) een ander woord kiezen',
		]);
	});

	it('splitst alternatieven op een schuine streep met spaties en laat 1:45/1:48 heel', () => {
		expect(splitsOpties('verleid / niet op de proef stellen')).toEqual(['verleid', 'niet op de proef stellen']);
		expect(splitsOpties('zie 1:45/1:48')).toEqual(['zie 1:45/1:48']);
	});

	it('geeft één optie voor een gewoon alternatief en geen voor een leeg alternatief', () => {
		expect(splitsOpties('diep onder de indruk')).toEqual(['diep onder de indruk']);
		expect(splitsOpties('')).toEqual([]);
		expect(splitsOpties(null)).toEqual([]);
	});

	it('splitst een puntkomma zonder letter erachter niet', () => {
		expect(splitsOpties('a) eerst; dan nog iets')).toEqual(['a) eerst; dan nog iets']);
	});
});

describe('zoektermUitKwestie', () => {
	it('geeft het enige woord tussen aanhalingstekens', () => {
		expect(zoektermUitKwestie('Lk 4:11 "niet misschien" laten staan')).toBe('niet misschien');
		expect(zoektermUitKwestie("'hoeren' (gevoelig voor 8-10 jaar)")).toBe('hoeren');
		expect(zoektermUitKwestie('“Gezegend” en meer')).toBe('Gezegend');
	});

	it('geeft niets bij twee verschillende termen, bij geen term en bij een apostrof', () => {
		expect(zoektermUitKwestie('markering van "Gezegend" (uit "zalig")')).toBeNull();
		expect(zoektermUitKwestie('de zoon des mensen')).toBeNull();
		expect(zoektermUitKwestie("Jezus' woorden en 's morgens")).toBeNull();
	});

	it('telt dezelfde term twee keer als één', () => {
		expect(zoektermUitKwestie('"zalig" en nog eens "zalig"')).toBe('zalig');
	});

	it('geeft niets bij een term met weglatingspunten, want die staat nergens letterlijk', () => {
		expect(zoektermUitKwestie("'Verhinder … niet ook je onderkleed te nemen'")).toBeNull();
	});
});

describe('domeinInOptie', () => {
	it('geeft het ene domein dat de optie noemt, ook met hoofdletter', () => {
		expect(domeinInOptie('a) genade, zoals de vertaler')).toBe('genade');
		expect(domeinInOptie('Eeuwigleven houden')).toBe('eeuwigleven');
	});

	it('geeft niets bij twee domeinen of bij een woord waar een domeinnaam deel van is', () => {
		expect(domeinInOptie('van genade naar geloof')).toBeNull();
		expect(domeinInOptie('dagelijks brood')).toBeNull();
		expect(domeinInOptie('een ander woord')).toBeNull();
	});
});

describe('maakVoorstel', () => {
	const verzen = [
		{ hoofdstuk: 6, vers: 20 },
		{ hoofdstuk: 7, vers: 23 },
	];
	const geenDomeinen = (): Domein[] => [];

	it('maakt van een optie met een domein een markeringswissel naar dat domein, met de verzen van de vraag', () => {
		const voorstel = maakVoorstel({ kwestie: 'markering van "Gezegend" (uit "zalig")', verzen }, 'a) genade, zoals de vertaler', geenDomeinen);

		expect(voorstel).toEqual({
			kwestie: 'markering van "Gezegend" (uit "zalig")',
			optie: 'a) genade, zoals de vertaler',
			opdracht: 'markering',
			zoekterm: '',
			nieuw: '',
			van: null,
			naar: 'genade',
			verzen,
		});
	});

	it('vult van alleen in als de zoekterm in de verzen precies één domein heeft', () => {
		const optie = 'a) genade';

		expect(maakVoorstel({ kwestie: '"gezegend"', verzen }, optie, () => ['eeuwigleven']).van).toBe('eeuwigleven');
		expect(maakVoorstel({ kwestie: '"gezegend"', verzen }, optie, () => ['eeuwigleven', 'geloof']).van).toBeNull();
		expect(maakVoorstel({ kwestie: '"gezegend"', verzen }, optie, () => []).van).toBeNull();
	});

	it('laat van leeg als de enige markering op de zoekterm al het doeldomein is', () => {
		expect(maakVoorstel({ kwestie: '"gezegend"', verzen }, 'a) genade', () => ['genade']).van).toBeNull();
	});

	it('vraagt de domeinen niet op zonder zoekterm', () => {
		let gevraagd = false;
		maakVoorstel({ kwestie: 'geen aanhalingstekens', verzen }, 'a) genade', () => {
			gevraagd = true;
			return ['geloof'];
		});

		expect(gevraagd).toBe(false);
	});

	it('maakt van een optie zonder domein een tekstopdracht met een lege vervanging', () => {
		const voorstel = maakVoorstel({ kwestie: 'Lk 4:11 "niet misschien" laten staan', verzen }, 'diep onder de indruk', geenDomeinen);

		expect(voorstel).toMatchObject({ opdracht: 'tekst', zoekterm: 'niet misschien', nieuw: '', van: null, naar: null, verzen });
	});
});

describe('opties van de vragen in open-vragen.md', () => {
	const vragen = leesOpenVragen(leesRepobestand('bijbel/lukas/referentie/open-vragen.md'));
	const opties = vragen.map((vraag) => splitsOpties(vraag.alternatief));

	it('geeft Gezegend drie opties en elke "/"-vraag twee', () => {
		const gezegend = vragen.findIndex((vraag) => vraag.kwestie.startsWith('markering van "Gezegend"'));
		const metStreep = vragen.map((vraag, index) => (/ \/ /.test(vraag.alternatief) ? index : -1)).filter((index) => index !== -1);

		expect(opties[gezegend]?.map((optie) => optie.slice(0, 2))).toEqual(['a)', 'b)', 'c)']);
		expect(metStreep).toHaveLength(10);
		expect(metStreep.map((index) => opties[index]?.length)).toEqual(Array(10).fill(2));
	});

	it('telt over alle 36 vragen 1 vraag zonder opties, 24 met één, 10 met twee en 1 met drie', () => {
		const aantallen = new Map<number, number>();
		for (const lijst of opties) aantallen.set(lijst.length, (aantallen.get(lijst.length) ?? 0) + 1);

		expect(vragen).toHaveLength(36);
		expect(Object.fromEntries(aantallen)).toEqual({ 0: 1, 1: 24, 2: 10, 3: 1 });
	});

	it('zet in Gezegend alleen de opties a) en b) op een markeringswissel', () => {
		const gezegend = vragen.find((vraag) => vraag.kwestie.startsWith('markering van "Gezegend"'));
		const optiesGezegend = splitsOpties(gezegend?.alternatief ?? null);

		expect(optiesGezegend.map(domeinInOptie)).toEqual(['genade', 'eeuwigleven', null]);
	});
});

describe('Gezegend: kiezen vult zoekterm en van in', () => {
	const kwestie = 'markering van "Gezegend" (uit "zalig"): de bron markeert zalig als eeuwigleven';
	const verzen = [{ hoofdstuk: 6, vers: 20 }];
	// Op de verzen van de vraag staat "Gezegend" als eeuwigleven en (1:45/1:48) al als genade; "zalig" komt niet meer voor.
	const domeinen = (zoekterm: string): Domein[] => (zoekterm === 'Gezegend' ? ['eeuwigleven', 'genade'] : []);

	it('kiest de term met een markering en als van het enige andere domein dan het doel', () => {
		const voorstel = maakVoorstel({ kwestie, verzen }, 'a) genade, zoals de vertaler in 1:45/1:48', domeinen);

		expect(voorstel).toMatchObject({ opdracht: 'markering', zoekterm: 'Gezegend', van: 'eeuwigleven', naar: 'genade' });
	});

	it('herkent optie b) van Gezegend als houden en optie a) niet', () => {
		const gezegend = leesOpenVragen(leesRepobestand('bijbel/lukas/referentie/open-vragen.md')).find((vraag) => vraag.kwestie.startsWith('markering van "Gezegend"'));
		const [a, b] = splitsOpties(gezegend?.alternatief ?? null);

		expect(isHoudOptie(a ?? '')).toBe(false);
		expect(isHoudOptie(b ?? '')).toBe(true);
	});

	it('telt "laten staan" niet als houden: in de kolom Alternatief is dat het bronwoord laten staan, een tekstwijziging', () => {
		expect(isHoudOptie('heerlijkheid laten staan')).toBe(false);
		expect(isHoudOptie('laten staan met uitleg')).toBe(false);
		expect(isHoudOptie('de tekst blijft zoals hij is')).toBe(false);
		expect(isHoudOptie('Eeuwigleven houden')).toBe(true);
	});
});
