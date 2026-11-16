import { beforeEach, describe, expect, it } from 'vitest';
import { GeheugenOpslag, VolleOpslag } from '../bewaren/testhulp';
import {
	alsRichtlijnReactie,
	bewaarRichtlijnReactie,
	haalRichtlijnReactieWeg,
	leesRichtlijnReacties,
	nieuweRegelId,
	paragraafReactieId,
	RICHTLIJN_REACTIES_SLEUTEL,
	type RichtlijnReactie,
} from './richtlijnReacties';

const OP_PARAGRAAF: RichtlijnReactie = { id: '§17B', paragraaf: '17B', titel: 'Messias / Christus', tekst: 'Liever altijd Messias.', voorstel: false, gegeven: '2026-11-16T10:00:00.000Z' };
const NIEUWE_REGEL: RichtlijnReactie = { id: 'nieuw-1763287200000', paragraaf: null, titel: '', tekst: 'Geef eigennamen altijd de bronspelling.', voorstel: true, gegeven: '2026-11-16T10:05:00.000Z' };

let opslag: GeheugenOpslag;
beforeEach(() => {
	opslag = new GeheugenOpslag();
});

describe('bewaarRichtlijnReactie en leesRichtlijnReacties', () => {
	it('geeft terug wat bewaard is onder één sleutel voor alle boeken', () => {
		expect(leesRichtlijnReacties(opslag)).toEqual([]);

		expect(bewaarRichtlijnReactie(opslag, OP_PARAGRAAF)).toEqual({ gelukt: true });
		bewaarRichtlijnReactie(opslag, NIEUWE_REGEL);

		expect(leesRichtlijnReacties(opslag)).toEqual([OP_PARAGRAAF, NIEUWE_REGEL]);
		expect([...opslag.items.keys()]).toEqual(['bet-richtlijn-reacties']);
		expect(RICHTLIJN_REACTIES_SLEUTEL).toBe('bet-richtlijn-reacties');
	});

	it('vervangt een eerdere reactie met hetzelfde id en laat de andere staan', () => {
		bewaarRichtlijnReactie(opslag, OP_PARAGRAAF);
		bewaarRichtlijnReactie(opslag, NIEUWE_REGEL);
		const opnieuw = { ...OP_PARAGRAAF, tekst: 'Toch zoals het is.', voorstel: true, gegeven: '2026-11-16T11:00:00.000Z' };

		bewaarRichtlijnReactie(opslag, opnieuw);

		expect(leesRichtlijnReacties(opslag)).toEqual([NIEUWE_REGEL, opnieuw]);
	});

	it('bewaart een reactie zonder tekst als het vinkje aanstaat, en snijdt witruimte van de tekst', () => {
		bewaarRichtlijnReactie(opslag, { ...OP_PARAGRAAF, tekst: '   ', voorstel: true });
		bewaarRichtlijnReactie(opslag, { ...NIEUWE_REGEL, tekst: '  met spaties \n' });

		expect(leesRichtlijnReacties(opslag)).toEqual([
			{ ...OP_PARAGRAAF, tekst: '', voorstel: true },
			{ ...NIEUWE_REGEL, tekst: 'met spaties' },
		]);
	});

	it('houdt geen reactie zonder tekst en zonder vinkje: bewaren haalt een bestaande reactie weg en laat de sleutel verdwijnen bij de laatste', () => {
		bewaarRichtlijnReactie(opslag, OP_PARAGRAAF);
		expect(opslag.items.size).toBe(1);

		expect(bewaarRichtlijnReactie(opslag, { ...OP_PARAGRAAF, tekst: '  ', voorstel: false })).toEqual({ gelukt: true });

		expect(leesRichtlijnReacties(opslag)).toEqual([]);
		expect(opslag.items.size).toBe(0);
	});

	it('legt een lege reactie niet vast als er niets te vervangen was', () => {
		bewaarRichtlijnReactie(opslag, { ...OP_PARAGRAAF, tekst: '', voorstel: false });

		expect(opslag.items.size).toBe(0);
	});

	it('geeft een melding als de opslag vol is', () => {
		const uitkomst = bewaarRichtlijnReactie(new VolleOpslag(), OP_PARAGRAAF);

		expect(uitkomst).toEqual({ gelukt: false, melding: expect.stringContaining('De reactie kon niet worden opgeslagen') });
	});
});

describe('haalRichtlijnReactieWeg', () => {
	it('haalt alleen de reactie met dat id weg', () => {
		bewaarRichtlijnReactie(opslag, OP_PARAGRAAF);
		bewaarRichtlijnReactie(opslag, NIEUWE_REGEL);

		expect(haalRichtlijnReactieWeg(opslag, '§17B')).toEqual({ gelukt: true });

		expect(leesRichtlijnReacties(opslag)).toEqual([NIEUWE_REGEL]);
	});

	it('doet niets bij een id zonder reactie', () => {
		bewaarRichtlijnReactie(opslag, OP_PARAGRAAF);

		expect(haalRichtlijnReactieWeg(opslag, '§99')).toEqual({ gelukt: true });

		expect(leesRichtlijnReacties(opslag)).toEqual([OP_PARAGRAAF]);
	});
});

describe('leesRichtlijnReacties bij beschadigde opslag', () => {
	it('geeft een lege lijst bij onleesbare JSON of een andere vorm', () => {
		opslag.setItem(RICHTLIJN_REACTIES_SLEUTEL, '{kapot');
		expect(leesRichtlijnReacties(opslag)).toEqual([]);

		opslag.setItem(RICHTLIJN_REACTIES_SLEUTEL, '{"id":"§1"}');
		expect(leesRichtlijnReacties(opslag)).toEqual([]);
	});

	it('slaat een onleesbare reactie over en houdt de rest', () => {
		opslag.setItem(RICHTLIJN_REACTIES_SLEUTEL, JSON.stringify([{ id: '§1' }, OP_PARAGRAAF, { ...NIEUWE_REGEL, voorstel: 'ja' }]));

		expect(leesRichtlijnReacties(opslag)).toEqual([OP_PARAGRAAF]);
	});
});

describe('alsRichtlijnReactie', () => {
	it('weigert een leeg id en een paragraaf die geen tekst of null is', () => {
		expect(alsRichtlijnReactie({ ...OP_PARAGRAAF, id: '' })).toBeNull();
		expect(alsRichtlijnReactie({ ...OP_PARAGRAAF, paragraaf: 17 })).toBeNull();
		expect(alsRichtlijnReactie({ ...NIEUWE_REGEL, paragraaf: null })).toEqual(NIEUWE_REGEL);
		expect(alsRichtlijnReactie(OP_PARAGRAAF)).toEqual(OP_PARAGRAAF);
	});
});

describe('id\'s', () => {
	it('maakt het id van een paragraaf met het teken §', () => {
		expect(paragraafReactieId('17B')).toBe('§17B');
	});

	it('maakt een id uit de tijd en telt door als dat id er al is', () => {
		const nu = new Date('2026-11-16T10:05:00.000Z');

		expect(nieuweRegelId(nu, [])).toBe('nieuw-1794823500000');
		const eerste = { ...NIEUWE_REGEL, id: 'nieuw-1794823500000' };
		expect(nieuweRegelId(nu, [eerste])).toBe('nieuw-1794823500000-2');
		expect(nieuweRegelId(nu, [eerste, { ...NIEUWE_REGEL, id: 'nieuw-1794823500000-2' }])).toBe('nieuw-1794823500000-3');
	});
});
