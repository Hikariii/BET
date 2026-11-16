import { describe, expect, it } from 'vitest';
import type { BewerktVers, Tussenstand, VersInhoud } from '../bewerken/types';
import type { HoofdstukData, VersRef } from '../data/types';
import { EIGEN_ANTWOORD, type Antwoord } from '../antwoorden/antwoorden';
import { parseerHoofdstuk } from '../formaat/parseer';
import type { StructureleKeuze } from '../vervangen/keuzes';
import { exportBestandsnaam, maakExport } from './maakExport';
import type { ExportInvoer } from './maakExport';

const BRON = `# Lukas 4
[1]Jezus keerde terug.[2] {genade}Genade{/genade} was er.
@jezus [3]Volg mij.
@jezus Kom dan.
`;

const VEREENVOUDIGD = `# Lukas 4
[1]Jezus kwam terug.[2] {genade}Genade{/genade} was er.
@jezus [3]Volg mij.
@jezus Kom dan.
`;

const HOOFDSTUK: HoofdstukData = {
	nummer: 4,
	bron: parseerHoofdstuk(BRON),
	vereenvoudigd: parseerHoofdstuk(VEREENVOUDIGD),
	log: { verzen: [], algemeneVragen: [] },
};

const NU = new Date('2026-11-15T16:00:00.000Z');

function tekst(inhoud: string, opmaak: 'genade' | null = null) {
	return { soort: 'tekst' as const, tekst: inhoud, opmaak: opmaak === null ? [] : [opmaak] };
}

const VERS_1_REPO: VersInhoud = { delen: [{ stijl: null, stukken: [tekst('Jezus kwam terug.')] }] };
const VERS_2_REPO: VersInhoud = { delen: [{ stijl: null, stukken: [tekst(' '), tekst('Genade', 'genade'), tekst(' was er.')] }] };
const VERS_3_REPO: VersInhoud = {
	delen: [
		{ stijl: 'jezus', stukken: [tekst('Volg mij.')] },
		{ stijl: 'jezus', stukken: [tekst('Kom dan.')] },
	],
};

function bewerkt(inhoud: VersInhoud, basis: VersInhoud): BewerktVers {
	return { inhoud, basis, bewaard: '2026-11-15T15:00:00.000Z' };
}

function invoer(
	tussenstand: Tussenstand,
	toelichting = '',
	keuzes: StructureleKeuze[] = [],
	antwoorden: Antwoord[] = [],
	vraagVerzen: Record<string, VersRef[]> = {},
): ExportInvoer {
	return { boek: 'lukas', hoofdstuk: HOOFDSTUK, tussenstand, keuzes, antwoorden, vraagVerzen: new Map(Object.entries(vraagVerzen)), repoCommit: 'abc123', toelichting, nu: NU };
}

describe('maakExport', () => {
	it('geeft zonder bewerkingen een export zonder verzen', () => {
		expect(maakExport(invoer({ verzen: {} }, 'niets te doen'))).toEqual({
			formaat: 'bet-redactie-export',
			versie: 3,
			boek: 'lukas',
			hoofdstuk: 4,
			repoCommit: 'abc123',
			gemaakt: '2026-11-15T16:00:00.000Z',
			toelichting: 'niets te doen',
			verzen: [],
			structureleKeuzes: [],
			beantwoordeVragen: [],
		});
	});

	it('zet repo en bewerkte tekst per deel als FORMAAT-regel, met waarschuwing voor weggevallen opmaak', () => {
		const vers2: VersInhoud = { delen: [{ stijl: null, stukken: [tekst(' Genade was er niet.')] }] };
		const vers3: VersInhoud = {
			delen: [
				{ stijl: 'jezus', stukken: [tekst('Volg me.')] },
				{ stijl: 'jezus', stukken: [tekst('Kom '), tekst('dan', 'genade'), tekst('.')] },
			],
		};
		const uitkomst = maakExport(
			invoer({ verzen: { 2: bewerkt(vers2, VERS_2_REPO), 3: bewerkt(vers3, VERS_3_REPO) } }, 'uitleg'),
		);

		expect(uitkomst.toelichting).toBe('uitleg');
		expect(uitkomst.verzen).toEqual([
			{
				vers: 2,
				repo: [' {genade}Genade{/genade} was er.'],
				bewerkt: [' Genade was er niet.'],
				herkomst: 'zelf getypt',
				keuzeId: null,
				waarschuwingen: ['De markering genade uit de bron staat niet meer in dit vers.'],
				verouderd: false,
			},
			{
				vers: 3,
				repo: ['@jezus Volg mij.', '@jezus Kom dan.'],
				bewerkt: ['@jezus Volg me.', '@jezus Kom {genade}dan{/genade}.'],
				herkomst: 'zelf getypt',
				keuzeId: null,
				waarschuwingen: [],
				verouderd: false,
			},
		]);
	});

	it('markeert een bewerking als verouderd als de repo sinds de bewerking veranderde', () => {
		const eerdereRepo: VersInhoud = { delen: [{ stijl: null, stukken: [tekst('Jezus ging terug.')] }] };
		const vers1: VersInhoud = { delen: [{ stijl: null, stukken: [tekst('Jezus ging heen.')] }] };

		const [vers] = maakExport(invoer({ verzen: { 1: bewerkt(vers1, eerdereRepo) } })).verzen;

		expect(vers).toEqual({
			vers: 1,
			repo: ['Jezus kwam terug.'],
			bewerkt: ['Jezus ging heen.'],
			herkomst: 'zelf getypt',
			keuzeId: null,
			waarschuwingen: [],
			verouderd: true,
		});
	});

	it('neemt een vers dat niet meer bestaat op met lege repo-tekst en verouderd', () => {
		const vers9: VersInhoud = { delen: [{ stijl: null, stukken: [tekst('Een nieuw vers.')] }] };

		const [vers] = maakExport(invoer({ verzen: { 9: bewerkt(vers9, vers9) } })).verzen;

		expect(vers).toEqual({
			vers: 9,
			repo: [],
			bewerkt: ['Een nieuw vers.'],
			herkomst: 'zelf getypt',
			keuzeId: null,
			waarschuwingen: [],
			verouderd: true,
		});
	});

	it('markeert een bewerking met een andere indeling in alinea\'s als verouderd', () => {
		const eenDeel: VersInhoud = { delen: [{ stijl: 'jezus', stukken: [tekst('Volg mij. Kom dan.')] }] };

		const [vers] = maakExport(invoer({ verzen: { 3: bewerkt(eenDeel, VERS_3_REPO) } })).verzen;

		expect(vers?.repo).toEqual(['@jezus Volg mij.', '@jezus Kom dan.']);
		expect(vers?.bewerkt).toEqual(['@jezus Volg mij. Kom dan.']);
		expect(vers?.verouderd).toBe(true);
	});

	it('geeft FORMAAT-regels die bij parseren weer dezelfde stukken en stijl geven', () => {
		const vers3: VersInhoud = {
			delen: [
				{ stijl: 'jezus', stukken: [tekst('Volg '), tekst('mij', 'genade'), tekst('.')] },
				{ stijl: null, stukken: [tekst('Kom dan, '), { soort: 'tekst', tekst: 'zegt hij', opmaak: ['cursief', 'genade'] }] },
			],
		};
		const [uitkomst] = maakExport(invoer({ verzen: { 3: bewerkt(vers3, VERS_3_REPO) } })).verzen;
		if (uitkomst === undefined) throw new Error('er hoort een vers in de export te staan');

		const teruggelezen = parseerHoofdstuk(`${uitkomst.bewerkt.join('\n')}\n`);

		expect(teruggelezen.alineas).toEqual(vers3.delen.map((deel) => ({ soort: 'tekst', stijl: deel.stijl, stukken: deel.stukken })));
	});
});

function keuze(uitzonderingen: Partial<StructureleKeuze>): StructureleKeuze {
	return {
		id: 'k1',
		soort: 'markering',
		zoekterm: 'genade',
		nieuw: '',
		van: 'eeuwigleven',
		naar: 'genade',
		varianten: [{ vorm: 'genaden', nieuw: '' }],
		toegepast: '2026-11-15T10:00:00.000Z',
		verzen: [],
		overgeslagen: [],
		vraag: 'Gezegend',
		...uitzonderingen,
	};
}

/** De inhoud doet er voor de export niet toe; de keuze wordt per vers en per hoofdstuk geteld. */
function keuzeVers(hoofdstuk: number, vers: number) {
	return { hoofdstuk, vers, voor: VERS_1_REPO, na: VERS_2_REPO };
}

const OVER_TWEE_HOOFDSTUKKEN = keuze({
	verzen: [keuzeVers(2, 5), keuzeVers(4, 1), keuzeVers(4, 3), keuzeVers(6, 9)],
	overgeslagen: [
		{ hoofdstuk: 4, vers: 2, gevonden: 'genade', reden: 'uitgevinkt' },
		{ hoofdstuk: 5, vers: 1, gevonden: 'Genade', reden: 'goedgekeurd' },
	],
});

describe('maakExport met structurele keuzes', () => {
	it('geeft de hele keuze met de plekken van dit hoofdstuk apart, ook als de keuze over meer hoofdstukken loopt', () => {
		const antwoord: Antwoord = { kwestie: 'Gezegend', optie: 'a) genade', toelichting: '', keuzeIds: ['k1'], gegeven: '2026-11-15T10:00:00.000Z' };
		const uitkomst = maakExport(invoer({ verzen: {} }, '', [OVER_TWEE_HOOFDSTUKKEN], [antwoord]));

		expect(uitkomst.structureleKeuzes).toEqual([
			{
				id: 'k1',
				soort: 'markering',
				zoekterm: 'genade',
				nieuw: '',
				van: 'eeuwigleven',
				naar: 'genade',
				varianten: [{ vorm: 'genaden', nieuw: '' }],
				vraag: 'Gezegend',
				aantalToegepasteVerzen: 4,
				hoofdstukken: [2, 4, 5, 6],
				toegepast: ['4:1', '4:3'],
				overgeslagen: [{ plek: '4:2', gevonden: 'genade', reden: 'uitgevinkt' }],
			},
		]);
	});

	it('zet bij een keuze de vraag alleen als het antwoord op die vraag nog naar de keuze wijst', () => {
		const eerste = keuze({ id: 'k1', verzen: [keuzeVers(4, 1)], vraag: 'Gezegend' });
		const tweede = keuze({ id: 'k2', toegepast: '2026-11-15T11:00:00.000Z', verzen: [keuzeVers(4, 3)], vraag: 'Gezegend' });
		const antwoordOpEerste: Antwoord = { kwestie: 'Gezegend', optie: 'a) genade', toelichting: '', keuzeIds: ['k1'], gegeven: '2026-11-15T10:00:00.000Z' };
		const antwoordOpTweede: Antwoord = { ...antwoordOpEerste, optie: 'c) iets anders', keuzeIds: ['k2'], gegeven: '2026-11-15T11:00:00.000Z' };

		const voor = maakExport(invoer({ verzen: {} }, '', [eerste, tweede], [antwoordOpEerste])).structureleKeuzes;
		const na = maakExport(invoer({ verzen: {} }, '', [eerste, tweede], [antwoordOpTweede])).structureleKeuzes;

		expect(voor.map((uitkomst) => [uitkomst.id, uitkomst.vraag])).toEqual([['k1', 'Gezegend'], ['k2', null]]);
		expect(na.map((uitkomst) => [uitkomst.id, uitkomst.vraag])).toEqual([['k1', null], ['k2', 'Gezegend']]);
	});

	it('neemt een keuze op waarvan dit hoofdstuk alleen overgeslagen plekken heeft, en laat een keuze weg die dit hoofdstuk niet raakt', () => {
		const alleenOvergeslagen = keuze({ id: 'k2', verzen: [keuzeVers(2, 5)], overgeslagen: [{ hoofdstuk: 4, vers: 7, gevonden: 'genade', reden: 'met de hand' }] });
		const anderHoofdstuk = keuze({ id: 'k3', verzen: [keuzeVers(2, 5)], overgeslagen: [{ hoofdstuk: 3, vers: 1, gevonden: 'genade', reden: 'met de hand' }] });

		const { structureleKeuzes } = maakExport(invoer({ verzen: {} }, '', [anderHoofdstuk, alleenOvergeslagen]));

		expect(structureleKeuzes.map((uitkomst) => [uitkomst.id, uitkomst.toegepast, uitkomst.overgeslagen.map((plek) => plek.plek)])).toEqual([['k2', [], ['4:7']]]);
	});

	it('zet de keuzes op volgorde van toepassen, ook als de invoer nieuwste eerst is', () => {
		const eerste = keuze({ id: 'oud', toegepast: '2026-11-15T09:00:00.000Z', verzen: [keuzeVers(4, 1)] });
		const tweede = keuze({ id: 'nieuw', toegepast: '2026-11-15T11:00:00.000Z', verzen: [keuzeVers(4, 1)] });

		const { structureleKeuzes } = maakExport(invoer({ verzen: {} }, '', [tweede, eerste]));

		expect(structureleKeuzes.map((uitkomst) => uitkomst.id)).toEqual(['oud', 'nieuw']);
	});

	it('zet het keuze-id bij de verzen die een keuze veranderde en null bij zelf getypt', () => {
		const keuzeVers2 = { ...bewerkt(VERS_2_REPO, VERS_2_REPO), herkomst: 'structurele keuze' as const, keuzeId: 'k1' };

		const { verzen } = maakExport(invoer({ verzen: { 1: bewerkt(VERS_1_REPO, VERS_1_REPO), 2: keuzeVers2 } }));

		expect(verzen.map((vers) => [vers.vers, vers.herkomst, vers.keuzeId])).toEqual([
			[1, 'zelf getypt', null],
			[2, 'structurele keuze', 'k1'],
		]);
	});
});

describe('maakExport met beantwoorde vragen', () => {
	const ANTWOORD_OP_KEUZE: Antwoord = { kwestie: 'Gezegend', optie: 'a) genade', toelichting: '', keuzeIds: ['k1'], gegeven: '2026-11-15T10:00:00.000Z' };
	const ANTWOORD_ZONDER_WIJZIGING: Antwoord = { kwestie: 'Houden', optie: 'b) niets doen', toelichting: '', keuzeIds: [], gegeven: '2026-11-15T10:05:00.000Z' };
	const ANTWOORD_ANDER_HOOFDSTUK: Antwoord = { kwestie: 'Elders', optie: 'a)', toelichting: '', keuzeIds: ['k3'], gegeven: '2026-11-15T10:10:00.000Z' };
	const ELDERS = keuze({ id: 'k3', verzen: [keuzeVers(2, 5)] });

	it('neemt het antwoord op van een keuze die dit hoofdstuk raakt en het antwoord zonder keuze, en laat dat van een keuze elders weg', () => {
		const { beantwoordeVragen } = maakExport(
			invoer({ verzen: {} }, '', [OVER_TWEE_HOOFDSTUKKEN, ELDERS], [ANTWOORD_OP_KEUZE, ANTWOORD_ZONDER_WIJZIGING, ANTWOORD_ANDER_HOOFDSTUK]),
		);

		expect(beantwoordeVragen).toEqual([
			{ ...ANTWOORD_OP_KEUZE, verzen: [] },
			{ ...ANTWOORD_ZONDER_WIJZIGING, verzen: [] },
		]);
	});

	it('geeft bij elk antwoord de verzen van de vraag als hoofdstuk:vers', () => {
		const verzen: VersRef[] = [
			{ hoofdstuk: 4, vers: 2 },
			{ hoofdstuk: 6, vers: 20 },
		];

		const { beantwoordeVragen } = maakExport(invoer({ verzen: {} }, '', [OVER_TWEE_HOOFDSTUKKEN], [ANTWOORD_OP_KEUZE, ANTWOORD_ZONDER_WIJZIGING], { Gezegend: verzen, Houden: verzen }));

		expect(beantwoordeVragen.map((antwoord) => antwoord.verzen)).toEqual([['4:2', '6:20'], ['4:2', '6:20']]);
	});

	it('neemt een antwoord zonder keuze alleen op in een hoofdstuk dat in de verzen van de vraag staat, of als de vraag geen verzen heeft', () => {
		const inVierEnZes: VersRef[] = [
			{ hoofdstuk: 4, vers: 2 },
			{ hoofdstuk: 6, vers: 20 },
		];
		const alleenZes: VersRef[] = [{ hoofdstuk: 6, vers: 20 }];
		const metVerzenInDitHoofdstuk: Antwoord = { kwestie: 'Hier', optie: 'b)', toelichting: '', keuzeIds: [], gegeven: '2026-11-15T10:20:00.000Z' };
		const metVerzenElders: Antwoord = { kwestie: 'Daar', optie: 'b)', toelichting: '', keuzeIds: [], gegeven: '2026-11-15T10:21:00.000Z' };
		const zonderVerzen: Antwoord = { kwestie: 'Nergens', optie: 'b)', toelichting: '', keuzeIds: [], gegeven: '2026-11-15T10:22:00.000Z' };

		const { beantwoordeVragen } = maakExport(
			invoer({ verzen: {} }, '', [], [metVerzenInDitHoofdstuk, metVerzenElders, zonderVerzen], { Hier: inVierEnZes, Daar: alleenZes }),
		);

		expect(beantwoordeVragen.map((antwoord) => antwoord.kwestie)).toEqual(['Hier', 'Nergens']);
	});

	it('geeft een antwoord met toelichting en twee keuzes die dit hoofdstuk raken, met alleen die keuzes in keuzeIds', () => {
		const eerste = keuze({ id: 'k1', verzen: [keuzeVers(4, 1)], vraag: 'Gezegend' });
		const tweede = keuze({ id: 'k2', toegepast: '2026-11-15T11:00:00.000Z', verzen: [keuzeVers(4, 3)], vraag: 'Gezegend' });
		const anderHoofdstuk = keuze({ id: 'k3', toegepast: '2026-11-15T12:00:00.000Z', verzen: [keuzeVers(6, 20)], vraag: 'Gezegend' });
		const eigen: Antwoord = {
			kwestie: 'Gezegend',
			optie: EIGEN_ANTWOORD,
			toelichting: 'In een zaligspreking genade.',
			keuzeIds: ['k1', 'k2', 'k3'],
			gegeven: '2026-11-15T10:00:00.000Z',
		};

		const { beantwoordeVragen, structureleKeuzes } = maakExport(invoer({ verzen: {} }, '', [eerste, tweede, anderHoofdstuk], [eigen], { Gezegend: [{ hoofdstuk: 4, vers: 1 }] }));

		expect(beantwoordeVragen).toEqual([{ ...eigen, keuzeIds: ['k1', 'k2'], verzen: ['4:1'] }]);
		expect(structureleKeuzes.map((uitkomst) => [uitkomst.id, uitkomst.vraag])).toEqual([['k1', 'Gezegend'], ['k2', 'Gezegend']]);
	});

	it('geeft een eigen antwoord met toelichting zonder keuzes in een hoofdstuk van de vraag', () => {
		const eigen: Antwoord = { kwestie: 'Gezegend', optie: EIGEN_ANTWOORD, toelichting: 'Regel.', keuzeIds: [], gegeven: '2026-11-15T10:00:00.000Z' };

		const hier = maakExport(invoer({ verzen: {} }, '', [], [eigen], { Gezegend: [{ hoofdstuk: 4, vers: 1 }] })).beantwoordeVragen;
		const elders = maakExport(invoer({ verzen: {} }, '', [], [eigen], { Gezegend: [{ hoofdstuk: 6, vers: 20 }] })).beantwoordeVragen;

		expect(hier).toEqual([{ ...eigen, verzen: ['4:1'] }]);
		expect(elders).toEqual([]);
	});

	it('telt een antwoord waarvan alle keuzes verdwenen zijn als antwoord zonder keuzes', () => {
		const verdwenen: Antwoord = { kwestie: 'Gezegend', optie: EIGEN_ANTWOORD, toelichting: 'Regel.', keuzeIds: ['weg'], gegeven: '2026-11-15T10:00:00.000Z' };

		const hier = maakExport(invoer({ verzen: {} }, '', [], [verdwenen], { Gezegend: [{ hoofdstuk: 4, vers: 1 }] })).beantwoordeVragen;
		const elders = maakExport(invoer({ verzen: {} }, '', [], [verdwenen], { Gezegend: [{ hoofdstuk: 6, vers: 20 }] })).beantwoordeVragen;

		expect(hier).toEqual([{ ...verdwenen, keuzeIds: [], verzen: ['4:1'] }]);
		expect(elders).toEqual([]);
	});
});

describe('exportBestandsnaam', () => {
	it('geeft twee cijfers voor het hoofdstuk', () => {
		expect(exportBestandsnaam('lukas', 4)).toBe('lukas-04.redactie.json');
		expect(exportBestandsnaam('lukas', 12)).toBe('lukas-12.redactie.json');
	});
});
