import { describe, expect, it } from 'vitest';
import { bewaarVers, leesTussenstand, tussenstandSleutel } from '../bewerken/tussenstand';
import { antwoordenSleutel, bewaarAntwoord, leesAntwoorden, type Antwoord } from '../antwoorden/antwoorden';
import { bewaarReactie, leesReacties, reactiesSleutel, type Reactie } from '../reacties/reacties';
import { keuzesSleutel, leesKeuzes, pasKeuzeToe, type StructureleKeuze } from '../vervangen/keuzes';
import { zoekVondsten } from '../vervangen/zoekEnVervang';
import type { HoofdstukVerzen } from '../vervangen/types';
import { backupBestandsnaam, leesBackup, maakBackup, pasBackupToe, voorbeeldInladen, type Backup } from './backup';
import { BOEK, GeheugenOpslag, inhoud, OpslagMetVolleSleutel } from './testhulp';

const NU = new Date('2026-11-16T14:32:00.000Z');

const KEUZE_VERZEN: HoofdstukVerzen[] = [
	{ hoofdstuk: 2, goedgekeurd: false, verzen: [{ vers: 7, inhoud: inhoud(' harde man'), repo: inhoud(' harde man') }] },
];

const ANTWOORD: Antwoord = { kwestie: 'Harde man', optie: 'a) zachte', toelichting: 'Zachte man waar het over karakter gaat.', keuzeIds: ['wordt-ingevuld'], gegeven: '2026-11-15T09:01:00.000Z' };

const REACTIE: Reactie = { nr: 'O1.1', hoofdstuk: 1, kwestie: 'Vrije weergave', tekst: 'Liever dichter bij de bron.', wordtVraag: true, gegeven: '2026-11-15T09:30:00.000Z' };

/** Een opslag met twee bewerkte verzen in hoofdstuk 1, één keuze in hoofdstuk 2, het antwoord op een vraag, dat bij die keuze hoort, en een reactie op een opmerking. */
function gevuldeOpslag(): GeheugenOpslag {
	const opslag = new GeheugenOpslag();
	bewaarVers(opslag, 'lukas', 1, 1, inhoud(' eerste'), inhoud(' oud een'));
	bewaarVers(opslag, 'lukas', 1, 2, inhoud(' tweede'), inhoud(' oud twee'));
	const { keuze } = pasKeuzeToe(opslag, 'lukas', KEUZE_VERZEN, 'harde', 'zachte', zoekVondsten(KEUZE_VERZEN, 'harde'), new Date('2026-11-15T09:00:00.000Z'));
	bewaarAntwoord(opslag, 'lukas', { ...ANTWOORD, keuzeIds: [keuze.id] });
	bewaarReactie(opslag, 'lukas', REACTIE);
	return opslag;
}

/** Een keuze met alle velden van fase 8: markering, variant, overgeslagen plek en vraag. */
const MARKERINGSKEUZE: StructureleKeuze = {
	id: 'markering-1',
	soort: 'markering',
	zoekterm: 'gezegend',
	nieuw: '',
	van: 'eeuwigleven',
	naar: 'genade',
	varianten: [{ vorm: 'gezegenden', nieuw: '' }],
	toegepast: '2026-11-16T08:00:00.000Z',
	verzen: [{ hoofdstuk: 2, vers: 7, voor: inhoud(' a'), na: inhoud(' b') }],
	overgeslagen: [{ hoofdstuk: 3, vers: 1, gevonden: 'gezegend', reden: 'met de hand' }],
	vraag: 'Gezegend',
};

function teruglezen(opslag: GeheugenOpslag): Backup {
	const uitkomst = leesBackup(JSON.stringify(maakBackup(opslag, BOEK, 'abc123', NU)), 'lukas');
	if (!uitkomst.gelukt) throw new Error(uitkomst.melding);
	return uitkomst.backup;
}

function weigeringMetDetails(tekst: string, boek = 'lukas'): { melding: string; details: string } {
	const uitkomst = leesBackup(tekst, boek);
	if (uitkomst.gelukt) throw new Error('De back-up is niet geweigerd.');
	return { melding: uitkomst.melding, details: uitkomst.details };
}

function weigering(tekst: string, boek = 'lukas'): string {
	return weigeringMetDetails(tekst, boek).melding;
}

const GEEN_BACKUP = 'Dit is geen back-up van deze tool. Kies het bestand dat je met Back-up downloaden hebt gemaakt; de naam begint met de naam van het boek en bevat .bet-bewaard, bijvoorbeeld lukas.bet-bewaard-2026-11-16-1103.json.';
const BESCHADIGD = 'Deze back-up is beschadigd en kan niet worden ingeladen. Maak met Back-up downloaden een nieuwe, of kies een eerdere back-up.';

describe('maakBackup', () => {
	it('bevat de tussenstanden per hoofdstuk, de keuzes, het boek, de datum en de repo-commit', () => {
		const backup = maakBackup(gevuldeOpslag(), BOEK, 'abc123', NU);

		expect(backup).toMatchObject({ formaat: 'bet-bewaard', versie: 3, boek: 'lukas', gemaakt: NU.toISOString(), repoCommit: 'abc123' });
		expect(backup.tussenstanden.map((stand) => [stand.hoofdstuk, Object.keys(stand.verzen)])).toEqual([
			[1, ['1', '2']],
			[2, ['7']],
		]);
		expect(backup.keuzes).toMatchObject([{ zoekterm: 'harde', nieuw: 'zachte' }]);
		expect(backup.antwoorden).toEqual([{ ...ANTWOORD, keuzeIds: backup.keuzes.map((keuze) => keuze.id) }]);
		expect(backup.reacties).toEqual([REACTIE]);
	});

	it('laat een hoofdstuk zonder bewerkingen en de opslag van een ander boek weg', () => {
		const opslag = gevuldeOpslag();
		bewaarVers(opslag, 'johannes', 3, 1, inhoud(' a'), inhoud(' b'));

		const backup = maakBackup(opslag, BOEK, null, NU);

		expect(backup.tussenstanden.map((stand) => stand.hoofdstuk)).toEqual([1, 2]);
		expect(backup.repoCommit).toBeNull();
	});

	it('geeft het bestand een naam met het boek', () => {
		expect(backupBestandsnaam('lukas')).toBe('lukas.bet-bewaard.json');
	});
});

describe('leesBackup', () => {
	it('geeft terug wat maakBackup maakte, na een omweg door tekst', () => {
		const opslag = gevuldeOpslag();

		expect(teruglezen(opslag)).toEqual(maakBackup(opslag, BOEK, 'abc123', NU));
	});

	it('weigert een back-up van een ander boek met de stap, en zet de namen in de details', () => {
		const tekst = JSON.stringify(maakBackup(gevuldeOpslag(), BOEK, null, NU));

		expect(leesBackup(tekst, 'lukas').gelukt).toBe(true);
		expect(weigeringMetDetails(tekst, 'johannes')).toEqual({
			melding: 'Deze back-up hoort bij een ander boek. Open eerst het boek "lukas" en laad de back-up daar.',
			details: 'Het boek in de back-up is "lukas", het geopende boek is "johannes".',
		});
	});

	it('zegt bij kapotte JSON dat het geen back-up is, met de reden in de details', () => {
		expect(weigeringMetDetails('{"formaat": "bet-bew')).toEqual({ melding: GEEN_BACKUP, details: 'De inhoud is geen geldige JSON.' });
	});

	it('zegt bij een ander formaat, ook de export voor Claude, dat het geen back-up is', () => {
		expect(weigeringMetDetails(JSON.stringify({ formaat: 'bet-redactie-export', versie: 1, boek: 'lukas' }))).toEqual({
			melding: GEEN_BACKUP,
			details: 'Het formaat is niet "bet-bewaard".',
		});
		expect(weigering('[1, 2]')).toBe(GEEN_BACKUP);
	});

	it('weigert een nieuwere versie met de stap om de pagina te verversen', () => {
		const backup = { ...maakBackup(gevuldeOpslag(), BOEK, null, NU), versie: 4 };

		expect(weigeringMetDetails(JSON.stringify(backup))).toEqual({
			melding: 'Deze back-up komt van een nieuwere versie van de tool. Ververs de pagina om de nieuwste versie te laden en probeer het opnieuw.',
			details: 'De back-up heeft versie 4; deze tool leest alleen versie 3.',
		});
	});

	it('weigert een oudere versie, ook als de rest nog past, met een nette melding', () => {
		const huidige = maakBackup(gevuldeOpslag(), BOEK, 'abc123', NU);
		const melding = 'Deze back-up komt van een oudere versie van de tool en kan niet meer worden ingeladen. Vraag de eigenaar om hulp.';

		expect(weigeringMetDetails(JSON.stringify({ ...huidige, versie: 2 }))).toEqual({ melding, details: 'De back-up heeft versie 2; deze tool leest alleen versie 3.' });
		expect(weigering(JSON.stringify({ ...huidige, versie: 1 }))).toBe(melding);
	});

	it('weigert een versie die geen geheel getal is als beschadigd', () => {
		const huidige = maakBackup(gevuldeOpslag(), BOEK, null, NU);

		expect(weigeringMetDetails(JSON.stringify({ ...huidige, versie: '3' }))).toEqual({ melding: BESCHADIGD, details: 'De versie "3" is geen geheel getal.' });
		expect(weigering(JSON.stringify({ ...huidige, versie: 2.5 }))).toBe(BESCHADIGD);
	});

	it('weigert een antwoord in de oude vorm met één keuzeId als beschadigd', () => {
		const { antwoorden, ...basis } = maakBackup(gevuldeOpslag(), BOEK, 'abc123', NU);
		expect(antwoorden).toHaveLength(1);
		const oud = { kwestie: 'Harde man', optie: 'a) zachte', keuzeId: 'k1', gegeven: '2026-11-15T09:01:00.000Z' };

		expect(weigeringMetDetails(JSON.stringify({ ...basis, antwoorden: [oud] }))).toEqual({ melding: BESCHADIGD, details: 'Een antwoord in de back-up is onleesbaar.' });
	});

	it('weigert een versie 3 zonder antwoorden, met een onleesbaar antwoord en met twee antwoorden op dezelfde vraag', () => {
		const { antwoorden, ...basis } = maakBackup(gevuldeOpslag(), BOEK, null, NU);
		const antwoord = antwoorden[0];
		if (antwoord === undefined) throw new Error('Geen antwoord in de testdata.');
		const details = (tekst: string) => weigeringMetDetails(tekst).details;

		expect(details(JSON.stringify(basis))).toBe('In de back-up ontbreken de antwoorden.');
		expect(details(JSON.stringify({ ...basis, antwoorden: [{ kwestie: 'x' }] }))).toBe('Een antwoord in de back-up is onleesbaar.');
		expect(details(JSON.stringify({ ...basis, antwoorden: [antwoord, { ...antwoord, optie: 'b)' }] }))).toBe('Een vraag heeft in de back-up twee antwoorden.');
		expect(weigering(JSON.stringify(basis))).toBe(BESCHADIGD);
	});

	it('leest een back-up zonder reacties als een lege lijst, en weigert een onleesbare reactie of twee reacties op dezelfde opmerking', () => {
		const { reacties, ...basis } = maakBackup(gevuldeOpslag(), BOEK, null, NU);
		expect(reacties).toEqual([REACTIE]);
		const details = (tekst: string) => weigeringMetDetails(tekst).details;

		const zonder = leesBackup(JSON.stringify(basis), 'lukas');
		expect(zonder.gelukt && zonder.backup.reacties).toEqual([]);
		expect(details(JSON.stringify({ ...basis, reacties: 'veel' }))).toBe('De reacties in de back-up hebben een onbekende vorm.');
		expect(details(JSON.stringify({ ...basis, reacties: [{ nr: 'O1.1' }] }))).toBe('Een reactie in de back-up is onleesbaar.');
		expect(details(JSON.stringify({ ...basis, reacties: [REACTIE, { ...REACTIE, tekst: 'anders' }] }))).toBe('Opmerking O1.1 heeft in de back-up twee reacties.');
	});

	it('houdt een keuze met markering, varianten, overgeslagen plekken en vraag intact door de back-up heen', () => {
		const bron = new GeheugenOpslag();
		bron.setItem(keuzesSleutel('lukas'), JSON.stringify([MARKERINGSKEUZE]));

		const backup = teruglezen(bron);
		expect(backup.keuzes).toEqual([MARKERINGSKEUZE]);

		const doel = new GeheugenOpslag();
		pasBackupToe(doel, BOEK, backup, 'vervangen');
		expect(leesKeuzes(doel, 'lukas')).toEqual([MARKERINGSKEUZE]);
		const doelSamen = new GeheugenOpslag();
		pasBackupToe(doelSamen, BOEK, backup, 'samenvoegen');
		expect(leesKeuzes(doelSamen, 'lukas')).toEqual([MARKERINGSKEUZE]);
	});

	it('weigert het hele bestand als één vers onleesbaar is', () => {
		const backup = JSON.parse(JSON.stringify(maakBackup(gevuldeOpslag(), BOEK, null, NU))) as { tussenstanden: { verzen: Record<string, unknown> }[] };
		const eerste = backup.tussenstanden[0];
		if (eerste === undefined) throw new Error('Geen hoofdstuk in de testdata.');
		eerste.verzen['2'] = { inhoud: 'geen inhoud' };

		expect(weigeringMetDetails(JSON.stringify(backup))).toEqual({ melding: BESCHADIGD, details: 'Vers 1:2 in de back-up is onleesbaar.' });
	});

	it('weigert een onleesbare keuze, een dubbel hoofdstuk en een ongeldige datum', () => {
		const basis = JSON.parse(JSON.stringify(maakBackup(gevuldeOpslag(), BOEK, null, NU))) as Record<string, unknown> & {
			keuzes: unknown[];
			tussenstanden: unknown[];
		};

		const details = (tekst: string) => weigeringMetDetails(tekst).details;

		expect(details(JSON.stringify({ ...basis, keuzes: [{ id: 'x' }] }))).toBe('Een vervanging in de back-up is onleesbaar.');
		expect(details(JSON.stringify({ ...basis, tussenstanden: [...basis.tussenstanden, basis.tussenstanden[0]] }))).toBe(
			'Hoofdstuk 1 staat twee keer in de back-up.',
		);
		expect(details(JSON.stringify({ ...basis, gemaakt: 'gisteren' }))).toContain('datum');
	});
});

describe('voorbeeldInladen', () => {
	it('zegt per vers nieuw, anders of gelijk en welke keuzes erbij komen', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();
		bewaarVers(doel, 'lukas', 1, 1, inhoud(' eerste'), inhoud(' oud een'));
		bewaarVers(doel, 'lukas', 1, 2, inhoud(' lokaal anders'), inhoud(' oud twee'));

		const voorbeeld = voorbeeldInladen(doel, BOEK, backup);

		// Welke van de twee versies van 1:2 nieuwer is, hangt hier van de klok af; dat bewaken de tests met vaste tijden.
		const anders = (soort: string) => (soort === 'overschrijft' || soort === 'jouwe-blijft' ? 'anders' : soort);
		expect(voorbeeld.verzen.map((vers) => [vers.hoofdstuk, vers.vers, anders(vers.soort)])).toEqual([
			[1, 1, 'gelijk'],
			[1, 2, 'anders'],
			[2, 7, 'nieuw'],
		]);
		expect(voorbeeld.telling).toMatchObject({ nieuw: 1, gelijk: 1, keuzesNieuw: 1, antwoordenNieuw: 1 });
		expect(voorbeeld.antwoorden).toEqual([{ kwestie: 'Harde man', optie: 'a) zachte', soort: 'nieuw' }]);
		expect(voorbeeld.telling.overschrijft + voorbeeld.telling.jouweBlijft).toBe(1);
		expect(voorbeeld.keuzes).toMatchObject([{ zoekterm: 'harde', soort: 'nieuw' }]);
	});

	it('zegt per vers in beide of jouw versie of die uit de back-up nieuwer is', () => {
		const oudeBackup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();
		bewaarVers(doel, 'lukas', 1, 2, inhoud(' lokaal anders'), inhoud(' oud twee'));
		const lokaal = leesTussenstand(doel, 'lukas', 1).verzen[2];
		if (lokaal === undefined) throw new Error('Geen lokaal vers.');
		const stand = oudeBackup.tussenstanden[0];
		if (stand === undefined) throw new Error('Geen hoofdstuk in de back-up.');
		const uitBackup = stand.verzen[2];
		if (uitBackup === undefined) throw new Error('Geen vers in de back-up.');

		uitBackup.bewaard = new Date(Date.parse(lokaal.bewaard) - 60_000).toISOString();
		expect(voorbeeldInladen(doel, BOEK, oudeBackup).verzen.find((vers) => vers.vers === 2)?.soort).toBe('jouwe-blijft');

		uitBackup.bewaard = new Date(Date.parse(lokaal.bewaard) + 60_000).toISOString();
		expect(voorbeeldInladen(doel, BOEK, oudeBackup).verzen.find((vers) => vers.vers === 2)?.soort).toBe('overschrijft');
	});

	it('telt wat Vervangen zou wissen omdat het niet in de back-up staat', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = gevuldeOpslag();
		bewaarVers(doel, 'lukas', 3, 4, inhoud(' alleen lokaal'), inhoud(' oud'));
		pasKeuzeToe(doel, 'lukas', KEUZE_VERZEN, 'man', 'vrouw', zoekVondsten(KEUZE_VERZEN, 'man'), new Date('2026-11-16T08:00:00.000Z'));
		expect(leesKeuzes(doel, 'lukas')).toHaveLength(2);

		bewaarAntwoord(doel, 'lukas', { kwestie: 'Alleen lokaal', optie: 'x', toelichting: '', keuzeIds: [], gegeven: NU.toISOString() });
		bewaarReactie(doel, 'lukas', { ...REACTIE, nr: 'O9.9', hoofdstuk: 9 });

		expect(voorbeeldInladen(doel, BOEK, backup).vervangenWist).toEqual({ verzen: 1, keuzes: 1, antwoorden: 1, reacties: 1 });
	});

	it('zegt per antwoord of het nieuw, gelijk of nieuwer of ouder is dan het lokale antwoord op dezelfde vraag', () => {
		const backup = teruglezen(gevuldeOpslag());
		const uitBackup = backup.antwoorden[0];
		if (uitBackup === undefined) throw new Error('Geen antwoord in de back-up.');
		const soortMetLokaal = (lokaal: Antwoord | null) => {
			const doel = new GeheugenOpslag();
			if (lokaal !== null) bewaarAntwoord(doel, 'lukas', lokaal);
			return voorbeeldInladen(doel, BOEK, backup).antwoorden[0]?.soort;
		};

		expect(soortMetLokaal(null)).toBe('nieuw');
		expect(soortMetLokaal(uitBackup)).toBe('gelijk');
		expect(soortMetLokaal({ ...uitBackup, optie: 'b)', gegeven: '2026-11-15T09:00:00.000Z' })).toBe('overschrijft');
		expect(soortMetLokaal({ ...uitBackup, optie: 'b)', gegeven: '2026-11-15T09:02:00.000Z' })).toBe('jouwe-blijft');
	});

	it('zegt per reactie of die nieuw, gelijk, nieuwer of ouder is dan de lokale reactie op dezelfde opmerking', () => {
		const backup = teruglezen(gevuldeOpslag());
		const soortMetLokaal = (lokaal: Reactie | null) => {
			const doel = new GeheugenOpslag();
			if (lokaal !== null) bewaarReactie(doel, 'lukas', lokaal);
			return voorbeeldInladen(doel, BOEK, backup).reacties;
		};

		expect(soortMetLokaal(null)).toEqual([{ nr: 'O1.1', soort: 'nieuw' }]);
		expect(voorbeeldInladen(new GeheugenOpslag(), BOEK, backup).telling.reactiesNieuw).toBe(1);
		expect(soortMetLokaal(REACTIE)).toEqual([{ nr: 'O1.1', soort: 'gelijk' }]);
		expect(soortMetLokaal({ ...REACTIE, tekst: 'ouder', gegeven: '2026-11-15T09:00:00.000Z' })).toEqual([{ nr: 'O1.1', soort: 'overschrijft' }]);
		expect(soortMetLokaal({ ...REACTIE, tekst: 'nieuwer', gegeven: '2026-11-15T10:00:00.000Z' })).toEqual([{ nr: 'O1.1', soort: 'jouwe-blijft' }]);
	});

	it('schrijft niets', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();

		voorbeeldInladen(doel, BOEK, backup);

		expect(doel.items.size).toBe(0);
	});
});

describe('pasBackupToe', () => {
	/** Een back-up met vers 1:2 bewaard `verschilMs` na (positief) of vóór (negatief) de lokale bewerking van dat vers in `doel`. */
	function backupMetVers2RelatiefAan(doel: GeheugenOpslag, verschilMs: number) {
		const backup = teruglezen(gevuldeOpslag());
		const lokaal = leesTussenstand(doel, 'lukas', 1).verzen[2];
		const uitBackup = backup.tussenstanden[0]?.verzen[2];
		if (lokaal === undefined || uitBackup === undefined) throw new Error('Vers 1:2 ontbreekt lokaal of in de back-up.');
		uitBackup.bewaard = new Date(Date.parse(lokaal.bewaard) + verschilMs).toISOString();
		return backup;
	}

	it('samenvoegen houdt de lokale verzen en keuzes en zet de back-up erbij; bij een vers in beide wint een nieuwere back-up', () => {
		const doel = new GeheugenOpslag();
		bewaarVers(doel, 'lukas', 1, 2, inhoud(' lokaal anders'), inhoud(' oud twee'));
		bewaarVers(doel, 'lukas', 3, 4, inhoud(' alleen lokaal'), inhoud(' oud'));
		const backup = backupMetVers2RelatiefAan(doel, 60_000);

		const uitkomst = pasBackupToe(doel, BOEK, backup, 'samenvoegen');

		expect(uitkomst).toEqual({ geschreven: { verzen: 3, keuzes: 1, antwoorden: 1, reacties: 1 }, meldingen: [] });
		expect(leesTussenstand(doel, 'lukas', 1).verzen[2]?.inhoud).toEqual(inhoud(' tweede'));
		expect(leesTussenstand(doel, 'lukas', 1).verzen[1]?.inhoud).toEqual(inhoud(' eerste'));
		expect(leesTussenstand(doel, 'lukas', 2).verzen[7]).toBeDefined();
		expect(leesTussenstand(doel, 'lukas', 3).verzen[4]?.inhoud).toEqual(inhoud(' alleen lokaal'));
		expect(leesKeuzes(doel, 'lukas')).toHaveLength(1);
	});

	it('samenvoegen laat een nieuwere lokale versie van een vers in beide staan', () => {
		const doel = new GeheugenOpslag();
		bewaarVers(doel, 'lukas', 1, 2, inhoud(' lokaal anders'), inhoud(' oud twee'));
		const backup = backupMetVers2RelatiefAan(doel, -60_000);
		expect(voorbeeldInladen(doel, BOEK, backup).telling).toMatchObject({ jouweBlijft: 1, overschrijft: 0 });

		const uitkomst = pasBackupToe(doel, BOEK, backup, 'samenvoegen');

		expect(leesTussenstand(doel, 'lukas', 1).verzen[2]?.inhoud).toEqual(inhoud(' lokaal anders'));
		expect(leesTussenstand(doel, 'lukas', 1).verzen[1]?.inhoud).toEqual(inhoud(' eerste'));
		expect(uitkomst.geschreven.verzen).toBe(2);
	});

	it('samenvoegen twee keer na elkaar verandert de tweede keer niets', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();

		pasBackupToe(doel, BOEK, backup, 'samenvoegen');
		const uitkomst = pasBackupToe(doel, BOEK, backup, 'samenvoegen');

		expect(uitkomst).toEqual({ geschreven: { verzen: 0, keuzes: 0, antwoorden: 0, reacties: 0 }, meldingen: [] });
		expect(leesKeuzes(doel, 'lukas')).toHaveLength(1);
	});

	it('vervangen wist eerst wat er is en zet dan alleen de back-up neer', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();
		bewaarVers(doel, 'lukas', 3, 4, inhoud(' alleen lokaal'), inhoud(' oud'));
		pasKeuzeToe(doel, 'lukas', KEUZE_VERZEN, 'man', 'vrouw', zoekVondsten(KEUZE_VERZEN, 'man'), new Date('2026-11-16T08:00:00.000Z'));
		expect(leesTussenstand(doel, 'lukas', 3).verzen[4]).toBeDefined();

		const uitkomst = pasBackupToe(doel, BOEK, backup, 'vervangen');

		expect(uitkomst).toEqual({ geschreven: { verzen: 3, keuzes: 1, antwoorden: 1, reacties: 1 }, meldingen: [] });
		expect(leesTussenstand(doel, 'lukas', 3).verzen).toEqual({});
		expect(leesKeuzes(doel, 'lukas').map((keuze) => keuze.zoekterm)).toEqual(['harde']);
		expect(teruglezen(doel).tussenstanden).toEqual(backup.tussenstanden);
	});

	it('samenvoegen houdt per kwestie de optie en toelichting van het nieuwste antwoord en zet antwoorden die er nog niet zijn erbij', () => {
		const backup = teruglezen(gevuldeOpslag());
		const uitBackup = backup.antwoorden[0];
		if (uitBackup === undefined) throw new Error('Geen antwoord in de back-up.');
		const lokaleKwestie: Antwoord = { kwestie: 'Alleen lokaal', optie: 'x', toelichting: '', keuzeIds: [], gegeven: NU.toISOString() };
		const nieuwerLokaal = { ...uitBackup, optie: 'lokaal nieuwer', toelichting: 'lokale regel', keuzeIds: [], gegeven: '2026-11-15T09:02:00.000Z' };
		const ouderLokaal = { ...uitBackup, optie: 'lokaal ouder', toelichting: 'oude regel', keuzeIds: [], gegeven: '2026-11-15T09:00:00.000Z' };

		const doelNieuwer = new GeheugenOpslag();
		bewaarAntwoord(doelNieuwer, 'lukas', lokaleKwestie);
		bewaarAntwoord(doelNieuwer, 'lukas', nieuwerLokaal);
		expect(pasBackupToe(doelNieuwer, BOEK, backup, 'samenvoegen').geschreven.antwoorden).toBe(1);
		expect(leesAntwoorden(doelNieuwer, 'lukas')).toEqual([lokaleKwestie, { ...nieuwerLokaal, keuzeIds: uitBackup.keuzeIds }]);

		const doelOuder = new GeheugenOpslag();
		bewaarAntwoord(doelOuder, 'lukas', lokaleKwestie);
		bewaarAntwoord(doelOuder, 'lukas', ouderLokaal);
		expect(pasBackupToe(doelOuder, BOEK, backup, 'samenvoegen').geschreven.antwoorden).toBe(1);
		expect(leesAntwoorden(doelOuder, 'lukas')).toEqual([lokaleKwestie, uitBackup]);
	});

	it('samenvoegen voegt de keuzes van beide antwoorden op dezelfde kwestie samen en telt niets als alles al gelijk is', () => {
		const backup = teruglezen(gevuldeOpslag());
		const uitBackup = backup.antwoorden[0];
		if (uitBackup === undefined) throw new Error('Geen antwoord in de back-up.');
		const doel = new GeheugenOpslag();
		bewaarAntwoord(doel, 'lukas', { ...uitBackup, keuzeIds: ['lokale-keuze'] });

		const eerste = pasBackupToe(doel, BOEK, backup, 'samenvoegen');

		expect(eerste.geschreven.antwoorden).toBe(1);
		expect(leesAntwoorden(doel, 'lukas')).toEqual([{ ...uitBackup, keuzeIds: ['lokale-keuze', ...uitBackup.keuzeIds] }]);
		expect(pasBackupToe(doel, BOEK, backup, 'samenvoegen').geschreven.antwoorden).toBe(0);
	});

	it('samenvoegen houdt per opmerking de nieuwste reactie en zet reacties die er nog niet zijn erbij', () => {
		const backup = teruglezen(gevuldeOpslag());
		const alleenLokaal: Reactie = { ...REACTIE, nr: 'O3.1', hoofdstuk: 3, kwestie: 'Alleen lokaal' };
		const nieuwerLokaal: Reactie = { ...REACTIE, tekst: 'lokaal nieuwer', wordtVraag: false, gegeven: '2026-11-15T10:00:00.000Z' };
		const ouderLokaal: Reactie = { ...REACTIE, tekst: 'lokaal ouder', wordtVraag: false, gegeven: '2026-11-15T09:00:00.000Z' };

		const doelNieuwer = new GeheugenOpslag();
		bewaarReactie(doelNieuwer, 'lukas', alleenLokaal);
		bewaarReactie(doelNieuwer, 'lukas', nieuwerLokaal);
		const metNieuwerLokaal = pasBackupToe(doelNieuwer, BOEK, backup, 'samenvoegen');
		expect(metNieuwerLokaal.geschreven.reacties).toBe(0);
		expect(leesReacties(doelNieuwer, 'lukas')).toEqual([alleenLokaal, nieuwerLokaal]);

		const doelOuder = new GeheugenOpslag();
		bewaarReactie(doelOuder, 'lukas', alleenLokaal);
		bewaarReactie(doelOuder, 'lukas', ouderLokaal);
		expect(pasBackupToe(doelOuder, BOEK, backup, 'samenvoegen').geschreven.reacties).toBe(1);
		expect(leesReacties(doelOuder, 'lukas')).toEqual([alleenLokaal, REACTIE]);

		const doelLeeg = new GeheugenOpslag();
		expect(pasBackupToe(doelLeeg, BOEK, backup, 'samenvoegen').geschreven.reacties).toBe(1);
		expect(pasBackupToe(doelLeeg, BOEK, backup, 'samenvoegen').geschreven.reacties).toBe(0);
	});

	it('vervangen wist de lokale reacties die niet in de back-up staan, en zet ze terug als het schrijven niet lukt', () => {
		const backup = teruglezen(gevuldeOpslag());
		const lokaal: Reactie = { ...REACTIE, nr: 'O3.1', hoofdstuk: 3, kwestie: 'Alleen lokaal' };
		const doel = new GeheugenOpslag();
		bewaarReactie(doel, 'lukas', lokaal);
		pasBackupToe(doel, BOEK, backup, 'vervangen');
		expect(leesReacties(doel, 'lukas')).toEqual([REACTIE]);

		const vol = new OpslagMetVolleSleutel(reactiesSleutel('lukas'));
		bewaarVers(vol, 'lukas', 3, 4, inhoud(' alleen lokaal'), inhoud(' oud'));
		const uitkomst = pasBackupToe(vol, BOEK, backup, 'vervangen');
		expect(uitkomst.meldingen).toEqual([expect.stringContaining('reacties konden niet'), 'Er is niets veranderd: de oude stand is teruggezet.']);
		expect(leesTussenstand(vol, 'lukas', 3).verzen[4]).toBeDefined();
	});

	it('vervangen wist de lokale antwoorden die niet in de back-up staan', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();
		bewaarAntwoord(doel, 'lukas', { kwestie: 'Alleen lokaal', optie: 'x', toelichting: '', keuzeIds: [], gegeven: NU.toISOString() });

		pasBackupToe(doel, BOEK, backup, 'vervangen');

		expect(leesAntwoorden(doel, 'lukas')).toEqual(backup.antwoorden);
	});

	it('vervangen zet ook de oude antwoorden terug als het schrijven niet lukt', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new OpslagMetVolleSleutel(tussenstandSleutel('lukas', 2));
		const lokaal: Antwoord = { kwestie: 'Alleen lokaal', optie: 'x', toelichting: '', keuzeIds: [], gegeven: NU.toISOString() };
		bewaarAntwoord(doel, 'lukas', lokaal);

		pasBackupToe(doel, BOEK, backup, 'vervangen');

		expect(leesAntwoorden(doel, 'lukas')).toEqual([lokaal]);
	});

	it('vervangen meldt antwoorden die niet te bewaren zijn en zet de oude stand terug', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new OpslagMetVolleSleutel(antwoordenSleutel('lukas'));
		bewaarVers(doel, 'lukas', 3, 4, inhoud(' alleen lokaal'), inhoud(' oud'));

		const uitkomst = pasBackupToe(doel, BOEK, backup, 'vervangen');

		expect(uitkomst.meldingen).toEqual([expect.stringContaining('antwoorden konden niet'), 'Er is niets veranderd: de oude stand is teruggezet.']);
		expect(leesTussenstand(doel, 'lukas', 3).verzen[4]).toBeDefined();
		expect(doel.getItem(keuzesSleutel('lukas'))).toBeNull();
	});

	it('vervangen laat de opslag van een ander boek staan', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();
		bewaarVers(doel, 'johannes', 1, 1, inhoud(' a'), inhoud(' b'));

		pasBackupToe(doel, BOEK, backup, 'vervangen');

		expect(leesTussenstand(doel, 'johannes', 1).verzen[1]).toBeDefined();
	});

	it('vervangen zet de oude stand terug als het schrijven niet lukt, en meldt dat', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new OpslagMetVolleSleutel(tussenstandSleutel('lukas', 2));
		bewaarVers(doel, 'lukas', 3, 4, inhoud(' alleen lokaal'), inhoud(' oud'));
		const voor = doel.getItem(tussenstandSleutel('lukas', 3));

		const uitkomst = pasBackupToe(doel, BOEK, backup, 'vervangen');

		expect(uitkomst.geschreven).toEqual({ verzen: 0, keuzes: 0, antwoorden: 0, reacties: 0 });
		expect(uitkomst.meldingen).toEqual([expect.stringContaining('Hoofdstuk 2 kon niet'), 'Er is niets veranderd: de oude stand is teruggezet.']);
		expect(doel.getItem(tussenstandSleutel('lukas', 3))).toBe(voor);
		expect(doel.getItem(tussenstandSleutel('lukas', 1))).toBeNull();
		expect(doel.getItem(keuzesSleutel('lukas'))).toBeNull();
	});

	it('samenvoegen meldt een hoofdstuk dat niet te bewaren is en gaat door met de rest', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new OpslagMetVolleSleutel(tussenstandSleutel('lukas', 1));

		const uitkomst = pasBackupToe(doel, BOEK, backup, 'samenvoegen');

		expect(uitkomst.meldingen).toEqual([expect.stringContaining('Hoofdstuk 1 kon niet')]);
		expect(uitkomst.geschreven).toEqual({ verzen: 1, keuzes: 1, antwoorden: 1, reacties: 1 });
		expect(leesTussenstand(doel, 'lukas', 2).verzen[7]).toBeDefined();
	});
});
