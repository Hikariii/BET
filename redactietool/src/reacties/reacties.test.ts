import { beforeEach, describe, expect, it } from 'vitest';
import { GeheugenOpslag, VolleOpslag } from '../bewaren/testhulp';
import { alsReactie, bewaarReactie, haalReactieWeg, leesReacties, reactiesSleutel, type Reactie } from './reacties';

const TWIJFEL: Reactie = { nr: 'O4.2', hoofdstuk: 4, kwestie: 'Vers 4:12 vrij vertaald', tekst: 'Liever dichter bij de bron.', wordtVraag: false, gegeven: '2026-11-16T10:00:00.000Z' };
const ANDERE: Reactie = { nr: 'O5.1', hoofdstuk: 5, kwestie: 'Naam van de stad', tekst: '', wordtVraag: true, gegeven: '2026-11-16T10:05:00.000Z' };

let opslag: GeheugenOpslag;
beforeEach(() => {
	opslag = new GeheugenOpslag();
});

describe('bewaarReactie en leesReacties', () => {
	it('geeft terug wat bewaard is, per boek, onder de sleutel bet-reacties/<boek>', () => {
		expect(leesReacties(opslag, 'lukas')).toEqual([]);

		expect(bewaarReactie(opslag, 'lukas', TWIJFEL)).toEqual({ gelukt: true });
		bewaarReactie(opslag, 'lukas', ANDERE);

		expect(leesReacties(opslag, 'lukas')).toEqual([TWIJFEL, ANDERE]);
		expect(leesReacties(opslag, 'johannes')).toEqual([]);
		expect([...opslag.items.keys()]).toEqual([reactiesSleutel('lukas')]);
		expect(reactiesSleutel('lukas')).toBe('bet-reacties/lukas');
	});

	it('vervangt een eerdere reactie op hetzelfde nummer en laat de andere staan', () => {
		bewaarReactie(opslag, 'lukas', TWIJFEL);
		bewaarReactie(opslag, 'lukas', ANDERE);
		const opnieuw = { ...TWIJFEL, tekst: 'Toch laten staan.', wordtVraag: true, gegeven: '2026-11-16T11:00:00.000Z' };

		bewaarReactie(opslag, 'lukas', opnieuw);

		expect(leesReacties(opslag, 'lukas')).toEqual([ANDERE, opnieuw]);
	});

	it('bewaart een reactie zonder tekst als het vinkje aanstaat, en snijdt witruimte van de tekst', () => {
		bewaarReactie(opslag, 'lukas', { ...ANDERE, tekst: '   ' });
		bewaarReactie(opslag, 'lukas', { ...TWIJFEL, tekst: '  met spaties \n' });

		expect(leesReacties(opslag, 'lukas')).toEqual([{ ...ANDERE, tekst: '' }, { ...TWIJFEL, tekst: 'met spaties' }]);
	});

	it('houdt geen reactie zonder tekst en zonder vinkje: bewaren haalt een bestaande reactie weg', () => {
		bewaarReactie(opslag, 'lukas', TWIJFEL);
		bewaarReactie(opslag, 'lukas', ANDERE);

		expect(bewaarReactie(opslag, 'lukas', { ...TWIJFEL, tekst: '  ', wordtVraag: false })).toEqual({ gelukt: true });

		expect(leesReacties(opslag, 'lukas')).toEqual([ANDERE]);
	});

	it('legt de lege reactie niet vast als er niets te vervangen was, en laat de sleutel verdwijnen bij de laatste', () => {
		bewaarReactie(opslag, 'lukas', { ...TWIJFEL, tekst: '', wordtVraag: false });
		expect(opslag.items.size).toBe(0);

		bewaarReactie(opslag, 'lukas', TWIJFEL);
		expect(opslag.items.size).toBe(1);
		bewaarReactie(opslag, 'lukas', { ...TWIJFEL, tekst: '', wordtVraag: false });

		expect(opslag.items.size).toBe(0);
	});

	it('geeft een melding als de opslag vol is', () => {
		const uitkomst = bewaarReactie(new VolleOpslag(), 'lukas', TWIJFEL);

		expect(uitkomst).toEqual({ gelukt: false, melding: expect.stringContaining('De reactie kon niet worden opgeslagen') });
	});
});

describe('haalReactieWeg', () => {
	it('haalt alleen de reactie op dat nummer weg', () => {
		bewaarReactie(opslag, 'lukas', TWIJFEL);
		bewaarReactie(opslag, 'lukas', ANDERE);

		expect(haalReactieWeg(opslag, 'lukas', 'O4.2')).toEqual({ gelukt: true });

		expect(leesReacties(opslag, 'lukas')).toEqual([ANDERE]);
	});

	it('doet niets bij een nummer zonder reactie', () => {
		bewaarReactie(opslag, 'lukas', TWIJFEL);

		expect(haalReactieWeg(opslag, 'lukas', 'O9.9')).toEqual({ gelukt: true });

		expect(leesReacties(opslag, 'lukas')).toEqual([TWIJFEL]);
	});
});

describe('leesReacties bij beschadigde opslag', () => {
	it('geeft een lege lijst bij onleesbare JSON of een andere vorm', () => {
		opslag.setItem(reactiesSleutel('lukas'), '{kapot');
		expect(leesReacties(opslag, 'lukas')).toEqual([]);

		opslag.setItem(reactiesSleutel('lukas'), '{"nr":"O1.1"}');
		expect(leesReacties(opslag, 'lukas')).toEqual([]);
	});

	it('slaat een onleesbare reactie over en houdt de rest', () => {
		opslag.setItem(reactiesSleutel('lukas'), JSON.stringify([{ nr: 'O1.1' }, TWIJFEL, { ...ANDERE, wordtVraag: 'ja' }]));

		expect(leesReacties(opslag, 'lukas')).toEqual([TWIJFEL]);
	});
});

describe('alsReactie', () => {
	it('weigert een hoofdstuk dat geen positief geheel getal is', () => {
		expect(alsReactie({ ...TWIJFEL, hoofdstuk: 0 })).toBeNull();
		expect(alsReactie({ ...TWIJFEL, hoofdstuk: 1.5 })).toBeNull();
		expect(alsReactie({ ...TWIJFEL, hoofdstuk: '4' })).toBeNull();
		expect(alsReactie(TWIJFEL)).toEqual(TWIJFEL);
	});
});
