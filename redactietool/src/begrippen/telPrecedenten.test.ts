import { describe, expect, it } from 'vitest';
import type { HoofdstukData, Precedent, VersRef } from '../data/types';
import { parseerHoofdstuk } from '../formaat/parseer';
import { leesRepobestand } from '../referentie/bestanden.testhulp';
import { leesPrecedenten } from '../referentie/precedenten';
import { leesLukasHoofdstukken, type LukasHoofdstuk } from '../uitlijning/lukasHoofdstukken.testhulp';
import { telPrecedenten, type GetelPrecedent } from './telPrecedenten';

function hoofdstuk(nummer: number, bron: string, vereenvoudigd: string): HoofdstukData {
	return {
		nummer,
		bron: parseerHoofdstuk(`# Lukas ${nummer}\n\n${bron}\n`),
		vereenvoudigd: parseerHoofdstuk(`# Lukas ${nummer}\n\n${vereenvoudigd}\n`),
		log: { verzen: [], algemeneVragen: [] },
	};
}

function precedent(bron: string, vereenvoudigd: string, plaats = ''): Precedent {
	return { sectie: 'Test', bron, vereenvoudigd, plaats, status: 'voorlopig', opmerking: '' };
}

function telEen(regel: Precedent, ...hoofdstukken: HoofdstukData[]): GetelPrecedent {
	const [uitkomst] = telPrecedenten([regel], hoofdstukken);
	if (uitkomst === undefined) throw new Error('geen uitkomst');
	return uitkomst;
}

function verzen(hoofdstuk: number, ...nummers: number[]): VersRef[] {
	return nummers.map((vers) => ({ hoofdstuk, vers }));
}

describe('telPrecedenten op kleine hoofdstukken', () => {
	const mensenzoon = hoofdstuk(
		5,
		'[1] De Zoon des mensen kwam. [2] Zoon des mensen, spreek. [3] De Zoon des mensen ging. [4] Hij zweeg.',
		'[1] De Mensenzoon kwam. [2] De Mensenzoon sprak. [3] De Zoon des mensen ging. [4] Hij zweeg.',
	);

	it('telt toegepast waar de nieuwe vorm staat en niet toegepast waar de bronvorm nog staat', () => {
		const uitkomst = telEen(precedent('Zoon des mensen', 'de Mensenzoon'), mensenzoon);

		expect(uitkomst).toMatchObject({ telbaar: true, reden: null, blijft: false });
		expect(uitkomst.toegepast).toEqual(verzen(5, 1, 2));
		expect(uitkomst.nietToegepast).toEqual(verzen(5, 3));
	});

	it('houdt de volgorde en het aantal precedenten aan', () => {
		const uitkomst = telPrecedenten([precedent('Zoon des mensen', 'de Mensenzoon'), precedent('zweeg', 'was stil')], [mensenzoon]);

		expect(uitkomst.map((telling) => telling.precedent.bron)).toEqual(['Zoon des mensen', 'zweeg']);
		expect(uitkomst[1]).toMatchObject({ toegepast: [], nietToegepast: verzen(5, 4) });
	});

	it('vergelijkt zonder hoofdletters en behandelt Heere en Heer als gelijk', () => {
		const heer = hoofdstuk(1, '[1] De Heere sprak. [2] Zijn heere kwam.', '[1] De Heer sprak. [2] Hij kwam.');

		const uitkomst = telEen(precedent('Heere', 'Heer'), heer);

		expect(uitkomst.blijft).toBe(true);
		expect(uitkomst.toegepast).toEqual(verzen(1, 1));
	});

	it('splitst varianten op een schuine streep en bij een uitgang tussen haakjes', () => {
		const tekst = hoofdstuk(1, '[1] Een Farizeeër kwam. [2] De Farizeeën kwamen. [3] De discipelen kwamen. [4] Een discipel ging.', '[1] Een Farizeeër kwam. [2] De Farizeeën kwamen. [3] De discipelen kwamen. [4] Een leerling ging.');

		expect(telEen(precedent('Farizeeër / Farizeeën', 'blijft'), tekst).toegepast).toEqual(verzen(1, 1, 2));
		expect(telEen(precedent('discipel(en)', 'blijft'), tekst).toegepast).toEqual(verzen(1, 3));
	});

	it('telt bij "blijft" de verzen waar de vorm blijft staan en laat niet toegepast leeg', () => {
		const tekst = hoofdstuk(1, '[1] In de synagoge. [2] In de synagoge.', '[1] In de synagoge. [2] In het gebouw.');

		const uitkomst = telEen(precedent('synagoge', 'blijft, zonder uitleg'), tekst);

		expect(uitkomst).toMatchObject({ telbaar: true, blijft: true, toegepast: verzen(1, 1), nietToegepast: [] });
	});

	it('beschouwt een vereenvoudigde vorm met alleen uitleg bij de eerste keer als "blijft"', () => {
		const tekst = hoofdstuk(1, '[1] Een tolhuis.', '[1] Een tolhuis (de plek waar belasting betaald werd).');

		const uitkomst = telEen(precedent('tolhuis', 'eerste keer "tolhuis (de plek waar belasting betaald werd)"'), tekst);

		expect(uitkomst).toMatchObject({ blijft: true, toegepast: verzen(1, 1) });
	});

	it('zoekt op woordgrenzen, met buigingsuitgangen voor lange woorden en exact voor korte', () => {
		const tekst = hoofdstuk(
			1,
			'[1] Dezen kwamen. [2] Deze kwamen. [3] De zondaars kwamen. [4] Een zondaar kwam. [5] De slechtere man. [7] Het is slecht.',
			'[1] Deze mensen kwamen. [2] Deze kwamen. [3] De zondaars kwamen. [4] Een zondaar kwam. [5] De slechtere man. [7] Het is slecht.',
		);

		expect(telEen(precedent('dezen', 'deze mensen'), tekst).toegepast).toEqual(verzen(1, 1));
		expect(telEen(precedent('zondaar', 'blijft'), tekst).toegepast).toEqual(verzen(1, 3, 4));
		expect(telEen(precedent('slecht', 'slecht'), tekst).toegepast).toEqual(verzen(1, 7));
		expect(telEen(precedent('slechts', 'maar'), tekst).nietToegepast).toEqual([]);
	});

	it('laat een woordgroep van drie woorden over ten hoogste één tussenwoord heen en niet over een zinseinde', () => {
		const tekst = hoofdstuk(
			1,
			'[1] Zij zullen God niet te vrezen. [2] Zij zullen God niet erg nooit vrezen. [3] God niet. Vrezen zij.',
			'[1] Zij zullen geen ontzag hebben. [2] Zij zullen geen ontzag hebben. [3] Geen ontzag.',
		);

		const uitkomst = telEen(precedent('God niet vrezen', 'geen ontzag hebben'), tekst);

		expect(uitkomst.toegepast).toEqual(verzen(1, 1));
	});

	it('zoekt een woordgroep van twee woorden aaneengesloten', () => {
		const tekst = hoofdstuk(1, '[1] Al de mensen kwamen. [2] Al zijn mensen en de rest kwamen.', '[1] Alle mensen kwamen. [2] Al zijn mensen en de rest kwamen.');

		const uitkomst = telEen(precedent('al de', 'alle'), tekst);

		expect(uitkomst).toMatchObject({ toegepast: verzen(1, 1), nietToegepast: [] });
	});

	it('neemt de verzen uit Plaats mee als de bronvorm daar niet te vinden is', () => {
		const tekst = hoofdstuk(4, '[1] Hij verzocht hem. [2] Het gaat nog verder. [3] Verder niets.', '[1] Hij zal hem op de proef stellen. [2] Het gaat verder. [3] Verder niets.');

		const uitkomst = telEen(precedent('verzoeken', 'op de proef stellen', '4:1, 4:2–3'), tekst);

		expect(uitkomst.telbaar).toBe(true);
		expect(uitkomst.opmerkingen.join(' ')).toContain('geteld vanuit Plaats');
		expect(uitkomst.toegepast).toEqual(verzen(4, 1));
		expect(uitkomst.nietToegepast).toEqual([]);
	});

	it('meldt een telling als onzeker als Plaats verzen noemt waar de bronvorm niet staat', () => {
		const tekst = hoofdstuk(4, '[1] Hij zag de zonde. [2] Hij ging weg.', '[1] Hij zag de zonde. [2] Hij ging weg.');

		const uitkomst = telEen(precedent('zonde', 'blijft', '4:1, 4:2'), tekst);

		expect(uitkomst.opmerkingen).toEqual(['1 van de 2 verzen uit Plaats: bronvorm niet teruggevonden in de bron']);
	});

	it('meldt dat de haakjes in de kolom Bron niet zijn gebruikt', () => {
		const tekst = hoofdstuk(1, '[1] Hij moest dan komen.', '[1] Hij moest behalve komen.');

		const uitkomst = telEen(precedent('dan (= behalve)', 'behalve'), tekst);

		expect(uitkomst.opmerkingen).toEqual(['de haakjes in de kolom Bron zijn niet gebruikt bij het zoeken']);
		expect(uitkomst.toegepast).toEqual(verzen(1, 1));
	});

	it('markeert een open plek, een werkregel en een verschijnsel als niet telbaar, met een reden', () => {
		const tekst = hoofdstuk(1, '[1] Hij zei dit.', '[1] Hij zei dat.');

		const open = telEen(precedent('Och, dat … (wens)', 'Och, als …', '1:1'), tekst);
		const werkregel = telEen(precedent('zei', 'weglaten', '1:1'), tekst);
		const verschijnsel = telEen(precedent('aanhalingstekens', 'gekrulde “ ”', 'heel Lukas'), tekst);

		expect([open, werkregel, verschijnsel].map((uitkomst) => uitkomst.telbaar)).toEqual([false, false, false]);
		expect(open.reden).toContain('open plek');
		expect(werkregel.reden).toContain('werkregel');
		expect(verschijnsel.reden).toContain('verschijnsel');
		expect([open, werkregel, verschijnsel].flatMap((uitkomst) => [...uitkomst.toegepast, ...uitkomst.nietToegepast])).toEqual([]);
	});

	it('markeert een bronvorm die nergens voorkomt en zonder verzen in Plaats als niet telbaar', () => {
		const tekst = hoofdstuk(1, '[1] Hij zei dit.', '[1] Hij zei dat.');

		const uitkomst = telEen(precedent('honen', 'beledigen'), tekst);

		expect(uitkomst).toMatchObject({ telbaar: false, reden: 'de bronvorm komt in de bron niet voor en Plaats noemt geen verzen' });
	});

	it('telt over hoofdstukken heen en geeft de verzen op volgorde', () => {
		const tweede = hoofdstuk(2, '[1] De Zoon des mensen kwam.', '[1] De Mensenzoon kwam.');

		const uitkomst = telEen(precedent('Zoon des mensen', 'de Mensenzoon'), tweede, mensenzoon);

		expect(uitkomst.toegepast).toEqual([...verzen(2, 1), ...verzen(5, 1, 2)]);
	});
});

/** Het vers uit een md-bestand, op de tekst van het bestand zelf: [N]-markeringen als scheiding. */
function versTeksten(bestandstekst: string): Map<number, string> {
	const delen = bestandstekst.split(/\[(\d+)\]/);
	const teksten = new Map<number, string>();
	for (let plek = 1; plek < delen.length; plek += 2) {
		teksten.set(Number(delen[plek]), (delen[plek + 1] ?? '').toLowerCase());
	}
	return teksten;
}

function hoofdstukData(lukas: LukasHoofdstuk): HoofdstukData {
	return { nummer: lukas.nummer, bron: lukas.bron, vereenvoudigd: lukas.vereenvoudigd, log: { verzen: [], algemeneVragen: [] } };
}

/** De verzen waar de bestandstekst van bron en vereenvoudiging aan de voorwaarde voldoet. */
function versenWaar(lukas: readonly LukasHoofdstuk[], voorwaarde: (bron: string, vereenvoudigd: string) => boolean): VersRef[] {
	return lukas.flatMap((hoofdstuk) => {
		const vereenvoudigd = versTeksten(hoofdstuk.vereenvoudigdTekst);
		return [...versTeksten(hoofdstuk.bronTekst)]
			.filter(([vers, bron]) => voorwaarde(bron, vereenvoudigd.get(vers) ?? ''))
			.map(([vers]) => ({ hoofdstuk: hoofdstuk.nummer, vers }));
	});
}

describe('telPrecedenten op de data van Lukas', () => {
	const lukas = leesLukasHoofdstukken();
	const hoofdstukken = lukas.map(hoofdstukData);
	const precedenten = leesPrecedenten(leesRepobestand('bijbel/lukas/referentie/precedenten.md'));
	const uitkomsten = telPrecedenten(precedenten, hoofdstukken);

	function vind(bron: string, vereenvoudigd: string): GetelPrecedent {
		const gevonden = uitkomsten.find((telling) => telling.precedent.bron === bron && telling.precedent.vereenvoudigd === vereenvoudigd);
		if (gevonden === undefined) throw new Error(`precedent '${bron}' niet gevonden`);
		return gevonden;
	}

	it('geeft een uitkomst per precedent, in dezelfde volgorde', () => {
		expect(uitkomsten).toHaveLength(precedenten.length);
		expect(uitkomsten.map((telling) => telling.precedent)).toEqual(precedenten);
	});

	it('telt "Zoon des mensen" als toegepast in de verzen met Mensenzoon en geeft geen verzen waar de bronvorm nog staat', () => {
		const toegepast = versenWaar(lukas, (bron, vereenvoudigd) => bron.includes('zoon des mensen') && vereenvoudigd.includes('mensenzoon') && !vereenvoudigd.includes('zoon des mensen'));
		const nietToegepast = versenWaar(lukas, (bron, vereenvoudigd) => bron.includes('zoon des mensen') && vereenvoudigd.includes('zoon des mensen'));
		const uitkomst = vind('Zoon des mensen', 'de Mensenzoon');

		expect(toegepast.length).toBeGreaterThan(20);
		expect(uitkomst.toegepast).toEqual(toegepast);
		expect(uitkomst.nietToegepast).toEqual(nietToegepast);
	});

	it('vindt "bedroefd" nog in de vereenvoudiging in 18:23 en 18:24', () => {
		const verwacht = versenWaar(lukas, (bron, vereenvoudigd) => /\bbedroefde?\b/.test(bron) && /\bbedroefde?\b/.test(vereenvoudigd));

		expect(verwacht).toEqual(expect.arrayContaining(verzen(18, 23, 24)));
		expect(vind('bedroefd', 'verdrietig').nietToegepast).toEqual(verwacht);
	});

	it('telt "synagoge" als een precedent dat blijft, met alleen toegepast', () => {
		const verwacht = versenWaar(lukas, (bron, vereenvoudigd) => /\bsynagogen?\b/.test(bron) && /\bsynagogen?\b/.test(vereenvoudigd));
		const uitkomst = vind('synagoge', 'blijft, zonder uitleg');

		expect(verwacht.length).toBeGreaterThan(10);
		expect(uitkomst.blijft).toBe(true);
		expect(uitkomst.nietToegepast).toEqual([]);
		expect(uitkomst.toegepast).toEqual(verwacht);
	});

	it('kan een flink deel van de precedenten tellen en geeft bij de rest een reden', () => {
		const telbaar = uitkomsten.filter((telling) => telling.telbaar);
		const nietTelbaar = uitkomsten.filter((telling) => !telling.telbaar);

		expect(telbaar.length).toBeGreaterThan(300);
		expect(nietTelbaar.length).toBeGreaterThan(20);
		expect(nietTelbaar.every((telling) => telling.reden !== null && telling.reden !== '')).toBe(true);
		expect(telbaar.every((telling) => telling.reden === null)).toBe(true);
		expect(precedenten.length).toBe(telbaar.length + nietTelbaar.length);
	});

	it('rekent alle hoofdstukken ruim onder 300 ms', () => {
		const begin = performance.now();
		telPrecedenten(precedenten, hoofdstukken);
		const duur = performance.now() - begin;

		expect(hoofdstukken).toHaveLength(24);
		expect(duur).toBeLessThan(300);
	});
});
