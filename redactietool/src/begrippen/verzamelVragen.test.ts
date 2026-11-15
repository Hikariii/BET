import { describe, expect, it } from 'vitest';
import type { Log, LogVers, OpenVraag, VersRef } from '../data/types';
import { leesLog } from '../log/leesLog';
import { leesWijzigingslogs } from '../log/wijzigingslogs.testhulp';
import { leesRepobestand, leesVereenvoudigdeVerzen } from '../referentie/bestanden.testhulp';
import { leesOpenVragen } from '../referentie/openVragen';
import type { Vertaalvraag } from './types';
import { verzamelVragen } from './verzamelVragen';

const GEDACHTENSTREEP = String.fromCharCode(0x2013);

const versen = (hoofdstuk: number, ...nummers: number[]): VersRef[] => nummers.map((vers) => ({ hoofdstuk, vers }));

function registerRegel(velden: Partial<OpenVraag>): OpenVraag {
	return { plaats: 'Lk 1:1', kwestie: 'kwestie', gekozen: 'gekozen', alternatief: 'alternatief', status: 'open', besluit: '', verzen: [], ...velden };
}

function logVers(verzen: number[], vragen: string[]): LogVers {
	return { verzen, wijzigingen: [], vragen };
}

function logHoofdstuk(nummer: number, algemeneVragen: string[], verzen: LogVers[] = []): { nummer: number; log: Log } {
	return { nummer, log: { algemeneVragen, verzen } };
}

function vind(vragen: readonly Vertaalvraag[], kwestie: string): Vertaalvraag {
	const gevonden = vragen.find((vraag) => vraag.kwestie === kwestie);
	if (gevonden === undefined) throw new Error(`vraag '${kwestie}' niet gevonden`);
	return gevonden;
}

describe('verzamelVragen op een klein register', () => {
	const vragen = verzamelVragen(
		[
			registerRegel({ kwestie: 'open kwestie', gekozen: 'keuze A', alternatief: 'keuze B', status: 'open', besluit: 'ter beslissing redactie', verzen: versen(4, 18, 19) }),
			registerRegel({ kwestie: 'voorlopige kwestie', status: 'voorlopig besloten', verzen: versen(5, 9) }),
			registerRegel({ kwestie: 'besloten kwestie', status: 'besloten door gebruiker', verzen: versen(5, 24) }),
		],
		[],
	);

	it('neemt kwestie, gekozen, alternatief, besluit en verzen over met herkomst register', () => {
		expect(vind(vragen, 'open kwestie')).toEqual({
			herkomst: { soort: 'register' },
			kwestie: 'open kwestie',
			tekst: 'ter beslissing redactie',
			gekozen: 'keuze A',
			alternatief: 'keuze B',
			status: 'open',
			statusAfgeleid: false,
			verzen: versen(4, 18, 19),
		});
	});

	it('leest de status uit de kolom Status, ook "besloten door gebruiker"', () => {
		expect(vragen.map((vraag) => [vraag.kwestie, vraag.status])).toEqual([
			['open kwestie', 'open'],
			['voorlopige kwestie', 'voorlopig besloten'],
			['besloten kwestie', 'besloten'],
		]);
	});
});

describe('verzamelVragen op de koppen van een klein log', () => {
	const vragen = verzamelVragen(
		[],
		[
			logHoofdstuk(13, [
				'**13:35, woestenij** (nieuwe keuze): "als een woestenij" wordt "een lege plek". Voorlopig besloten door hoofdsessie.',
				'VOORLOPIG BESLOTEN DOOR HOOFDSESSIE: **4:15 (en verder), synagoge:** uitleg erbij. Nog open voor de redactie.',
				`**7:12${GEDACHTENSTREEP}14, baar:** "baar" wordt "draagbaar".`,
				`**4:38${GEDACHTENSTREEP}5:11, over twee hoofdstukken:** een bereik over de hoofdstukgrens.`,
				'**Hoofdletters:** overal hetzelfde.',
				'**8:25, 8:35, bang of ontzag:** Besluit: "ontzag".',
				'**9:31 heengaan, 9:51 opneming:** twee woorden.',
				'Een vraag zonder kop. Met een tweede zin.',
			]),
		],
	);

	it('maakt van elke algemene vraag een hoofdstukvraag met positie vanaf 1', () => {
		const posities = vragen.map((vraag) => (vraag.herkomst.soort === 'hoofdstuk' ? vraag.herkomst.nummer : null)).sort();

		expect(posities).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		expect(vind(vragen, 'woestenij').herkomst).toEqual({ soort: 'hoofdstuk', hoofdstuk: 13, nummer: 1 });
	});

	it('neemt als kwestie de kop zonder versverwijzing en als verzen alleen de verwijzingen uit de kop', () => {
		expect(vind(vragen, 'woestenij').verzen).toEqual(versen(13, 35));
		expect(vind(vragen, 'synagoge').verzen).toEqual(versen(4, 15));
		expect(vind(vragen, 'bang of ontzag').verzen).toEqual(versen(8, 25, 35));
		expect(vind(vragen, 'heengaan, opneming').verzen).toEqual(versen(9, 31, 51));
		expect(vind(vragen, 'Hoofdletters').verzen).toEqual([]);
	});

	it('leest een bereik als alle verzen en slaat een bereik over twee hoofdstukken over', () => {
		expect(vind(vragen, 'baar').verzen).toEqual(versen(7, 12, 13, 14));
		expect(vind(vragen, 'over twee hoofdstukken').verzen).toEqual([]);
	});

	it('leidt de status af uit de tekst en markeert dat', () => {
		expect(vragen.every((vraag) => vraag.statusAfgeleid)).toBe(true);
		expect(vind(vragen, 'woestenij').status).toBe('voorlopig besloten');
		expect(vind(vragen, 'synagoge').status).toBe('open');
		expect(vind(vragen, 'bang of ontzag').status).toBe('voorlopig besloten');
		expect(vind(vragen, 'Hoofdletters').status).toBe('onbeslist');
	});

	it('neemt bij een vraag zonder kop de eerste zin als kwestie en geeft geen verzen', () => {
		expect(vind(vragen, 'Een vraag zonder kop.').verzen).toEqual([]);
	});
});

describe('verzamelVragen op de vers-vragen van een klein log', () => {
	const vragen = verzamelVragen(
		[],
		[
			logHoofdstuk(
				14,
				['**14:1, alfa:** tekst.', '**14:2, beta:** tekst.', '**14:3, gamma:** tekst. OPEN'],
				[
					logVers([10], ['Zie vraag 1.']),
					logVers([11, 12], ['Zie vraag 1 (a), vraag 2 (b) en vraag 3 (c).', 'Geen.']),
					logVers([20], ['Zie vraag 2 en 3']),
					logVers([21], ['Waarom blijft "En" staan? Dit is nog open.', 'Voorlopig besloten door hoofdsessie (vraag 3): "ontzag".']),
				],
			),
		],
	);

	it('zet de verzen van "Zie vraag N" bij vraag N, ook bij meerdere nummers en een verwijzing met uitleg', () => {
		expect(vind(vragen, 'alfa').verzen).toEqual(versen(14, 1, 10, 11, 12));
		expect(vind(vragen, 'beta').verzen).toEqual(versen(14, 2, 11, 12, 20));
		expect(vind(vragen, 'gamma').verzen).toEqual(versen(14, 3, 11, 12, 20));
	});

	it('toont "Zie vraag N" en "Geen." niet als eigen vraag, en een eigen vers-vraag wel', () => {
		const eigen = vragen.filter((vraag) => vraag.herkomst.soort === 'vers');

		expect(eigen.map((vraag) => vraag.tekst)).toEqual(['Waarom blijft "En" staan? Dit is nog open.', 'Voorlopig besloten door hoofdsessie (vraag 3): "ontzag".']);
	});

	it('geeft een eigen vers-vraag het vers, een kwestie uit de eerste zin en een status uit de tekst', () => {
		expect(vind(vragen, 'Waarom blijft "En" staan?')).toMatchObject({
			herkomst: { soort: 'vers', hoofdstuk: 14, vers: 21 },
			verzen: versen(14, 21),
			status: 'open',
			statusAfgeleid: true,
		});
		expect(vind(vragen, 'Voorlopig besloten door hoofdsessie (vraag 3): "ontzag".').status).toBe('voorlopig besloten');
	});
});

describe('verzamelVragen sorteert', () => {
	it('op status, dan register eerst, dan hoofdstuk en eerste vers', () => {
		const vragen = verzamelVragen(
			[
				registerRegel({ kwestie: 'register besloten', status: 'besloten', verzen: versen(1, 1) }),
				registerRegel({ kwestie: 'register open laat', status: 'open', verzen: versen(9, 2) }),
				registerRegel({ kwestie: 'register open vroeg', status: 'open', verzen: versen(2, 5) }),
			],
			[
				logHoofdstuk(5, ['**5:9, log open late:** OPEN', '**5:3, log open vroeg:** OPEN', '**5:1, log onbeslist:** zonder woord', '**5:2, log voorlopig:** Besluit']),
				logHoofdstuk(3, ['**3:7, log open ander hoofdstuk:** OPEN']),
			],
		);

		expect(vragen.map((vraag) => vraag.kwestie)).toEqual([
			'register open vroeg',
			'register open laat',
			'log open ander hoofdstuk',
			'log open vroeg',
			'log open late',
			'log onbeslist',
			'log voorlopig',
			'register besloten',
		]);
	});
});

describe('verzamelVragen op de logs en het register van Lukas', () => {
	const hoofdstukken = leesWijzigingslogs().map((log) => ({ nummer: Number(/-(\d+)\.md$/.exec(log.naam)?.[1]), log: leesLog(log.tekst) }));
	const register = leesOpenVragen(leesRepobestand('bijbel/lukas/referentie/open-vragen.md'));
	const vragen = verzamelVragen(register, hoofdstukken);
	const vereenvoudigd = leesVereenvoudigdeVerzen();

	it('geeft 36 registervragen, met status uit het register en niet afgeleid', () => {
		const uitRegister = vragen.filter((vraag) => vraag.herkomst.soort === 'register');

		expect(uitRegister).toHaveLength(36);
		expect(uitRegister.some((vraag) => vraag.statusAfgeleid)).toBe(false);
		expect(uitRegister.some((vraag) => vraag.status === 'onbeslist')).toBe(false);
		expect(vind(uitRegister, 'Zoon des mensen').status).toBe('besloten');
	});

	it('laat elke "Zie vraag N" uitkomen bij een bestaande hoofdstukvraag die het vers in haar verzen heeft', () => {
		let gecontroleerd = 0;
		for (const { nummer, log } of hoofdstukken) {
			for (const logVers of log.verzen) {
				for (const vraag of logVers.vragen) {
					const verwijzing = /^Zie vraag (\d+)\.?$/.exec(vraag);
					if (verwijzing === null) continue;
					const doel = vragen.find(
						(kandidaat) => kandidaat.herkomst.soort === 'hoofdstuk' && kandidaat.herkomst.hoofdstuk === nummer && kandidaat.herkomst.nummer === Number(verwijzing[1]),
					);
					expect(doel, `lukas-${nummer}: vraag ${verwijzing[1]}`).toBeDefined();
					for (const vers of logVers.verzen) expect(doel?.verzen, `lukas-${nummer}: vers ${vers}`).toContainEqual({ hoofdstuk: nummer, vers });
					gecontroleerd++;
				}
			}
		}

		expect(gecontroleerd).toBeGreaterThan(100);
	});

	it('toont geen vers-vraag "Zie vraag N" als eigen vraag', () => {
		const eigen = vragen.filter((vraag) => vraag.herkomst.soort === 'vers');

		expect(eigen.length).toBeGreaterThan(50);
		expect(eigen.filter((vraag) => /zie vraag \d/i.test(vraag.tekst))).toEqual([]);
	});

	it('geeft alleen verzen die in de vereenvoudiging bestaan', () => {
		const ontbrekend = vragen.flatMap((vraag) =>
			vraag.verzen.filter(({ hoofdstuk, vers }) => !vereenvoudigd.get(hoofdstuk)?.has(vers)).map(({ hoofdstuk, vers }) => `${vraag.kwestie} (${hoofdstuk}:${vers})`),
		);

		expect(ontbrekend).toEqual([]);
	});

	it('geeft "13:35, woestenij" het vers 13:35 en de kwestie "woestenij"', () => {
		const woestenij = vragen.find((vraag) => vraag.herkomst.soort === 'hoofdstuk' && vraag.herkomst.hoofdstuk === 13 && vraag.tekst.includes('**13:35, woestenij'));

		expect(woestenij).toMatchObject({ kwestie: 'woestenij' });
		expect(woestenij?.verzen).toContainEqual({ hoofdstuk: 13, vers: 35 });
	});

	it('geeft "4:15 (en verder), synagoge" het vers 4:15 en de kwestie "synagoge"', () => {
		const synagoge = vragen.find((vraag) => vraag.herkomst.soort === 'hoofdstuk' && vraag.herkomst.hoofdstuk === 4 && vraag.tekst.includes('**4:15 (en verder), synagoge'));

		expect(synagoge?.kwestie).toBe('synagoge');
		expect(synagoge?.verzen).toContainEqual({ hoofdstuk: 4, vers: 15 });
	});

	it('zet de open vragen vóór de rest', () => {
		const eerstNietOpen = vragen.findIndex((vraag) => vraag.status !== 'open');
		const laatsteOpen = vragen.map((vraag) => vraag.status).lastIndexOf('open');

		expect(eerstNietOpen).toBeGreaterThan(0);
		expect(laatsteOpen).toBeLessThan(eerstNietOpen);
		expect(vragen[0]?.herkomst.soort).toBe('register');
	});
});
