import { describe, expect, it } from 'vitest';
import { bewaarVers, leesTussenstand, tussenstandSleutel } from '../bewerken/tussenstand';
import { keuzesSleutel, leesKeuzes, pasKeuzeToe } from '../vervangen/keuzes';
import { zoekVondsten } from '../vervangen/zoekEnVervang';
import type { HoofdstukVerzen } from '../vervangen/types';
import { backupBestandsnaam, leesBackup, maakBackup, pasBackupToe, voorbeeldInladen, type Backup } from './backup';
import { BOEK, GeheugenOpslag, inhoud, OpslagMetVolleSleutel } from './testhulp';

const NU = new Date('2026-11-16T14:32:00.000Z');

const KEUZE_VERZEN: HoofdstukVerzen[] = [
	{ hoofdstuk: 2, goedgekeurd: false, verzen: [{ vers: 7, inhoud: inhoud(' harde man'), repo: inhoud(' harde man') }] },
];

/** Een opslag met twee bewerkte verzen in hoofdstuk 1 en één keuze in hoofdstuk 2. */
function gevuldeOpslag(): GeheugenOpslag {
	const opslag = new GeheugenOpslag();
	bewaarVers(opslag, 'lukas', 1, 1, inhoud(' eerste'), inhoud(' oud een'));
	bewaarVers(opslag, 'lukas', 1, 2, inhoud(' tweede'), inhoud(' oud twee'));
	pasKeuzeToe(opslag, 'lukas', KEUZE_VERZEN, 'harde', 'zachte', zoekVondsten(KEUZE_VERZEN, 'harde'), new Date('2026-11-15T09:00:00.000Z'));
	return opslag;
}

function teruglezen(opslag: GeheugenOpslag): Backup {
	const uitkomst = leesBackup(JSON.stringify(maakBackup(opslag, BOEK, 'abc123', NU)), 'lukas');
	if (!uitkomst.gelukt) throw new Error(uitkomst.melding);
	return uitkomst.backup;
}

function weigering(tekst: string, boek = 'lukas'): string {
	const uitkomst = leesBackup(tekst, boek);
	if (uitkomst.gelukt) throw new Error('De back-up is niet geweigerd.');
	return uitkomst.melding;
}

describe('maakBackup', () => {
	it('bevat de tussenstanden per hoofdstuk, de keuzes, het boek, de datum en de repo-commit', () => {
		const backup = maakBackup(gevuldeOpslag(), BOEK, 'abc123', NU);

		expect(backup).toMatchObject({ formaat: 'bet-bewaard', versie: 1, boek: 'lukas', gemaakt: NU.toISOString(), repoCommit: 'abc123' });
		expect(backup.tussenstanden.map((stand) => [stand.hoofdstuk, Object.keys(stand.verzen)])).toEqual([
			[1, ['1', '2']],
			[2, ['7']],
		]);
		expect(backup.keuzes).toMatchObject([{ zoekterm: 'harde', nieuw: 'zachte' }]);
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

	it('weigert een back-up van een ander boek, met beide namen in de melding', () => {
		const tekst = JSON.stringify(maakBackup(gevuldeOpslag(), BOEK, null, NU));

		expect(leesBackup(tekst, 'lukas').gelukt).toBe(true);
		expect(weigering(tekst, 'johannes')).toBe('Deze back-up is van het boek "lukas", niet van "johannes".');
	});

	it('weigert kapotte JSON', () => {
		expect(weigering('{"formaat": "bet-bew')).toContain('geen geldige JSON');
	});

	it('weigert een ander formaat, ook de export voor Claude', () => {
		expect(weigering(JSON.stringify({ formaat: 'bet-redactie-export', versie: 1, boek: 'lukas' }))).toContain('bet-bewaard');
		expect(weigering('[1, 2]')).toContain('bet-bewaard');
	});

	it('weigert een andere versie', () => {
		const backup = { ...maakBackup(gevuldeOpslag(), BOEK, null, NU), versie: 2 };

		expect(weigering(JSON.stringify(backup))).toContain('versie 2');
	});

	it('weigert het hele bestand als één vers onleesbaar is', () => {
		const backup = JSON.parse(JSON.stringify(maakBackup(gevuldeOpslag(), BOEK, null, NU))) as { tussenstanden: { verzen: Record<string, unknown> }[] };
		const eerste = backup.tussenstanden[0];
		if (eerste === undefined) throw new Error('Geen hoofdstuk in de testdata.');
		eerste.verzen['2'] = { inhoud: 'geen inhoud' };

		expect(weigering(JSON.stringify(backup))).toBe('Vers 1:2 in de back-up is onleesbaar.');
	});

	it('weigert een onleesbare keuze, een dubbel hoofdstuk en een ongeldige datum', () => {
		const basis = JSON.parse(JSON.stringify(maakBackup(gevuldeOpslag(), BOEK, null, NU))) as Record<string, unknown> & {
			keuzes: unknown[];
			tussenstanden: unknown[];
		};

		expect(weigering(JSON.stringify({ ...basis, keuzes: [{ id: 'x' }] }))).toBe('Een keuze in de back-up is onleesbaar.');
		expect(weigering(JSON.stringify({ ...basis, tussenstanden: [...basis.tussenstanden, basis.tussenstanden[0]] }))).toBe(
			'Hoofdstuk 1 staat twee keer in de back-up.',
		);
		expect(weigering(JSON.stringify({ ...basis, gemaakt: 'gisteren' }))).toContain('datum');
	});
});

describe('voorbeeldInladen', () => {
	it('zegt per vers nieuw, overschrijft of gelijk en welke keuzes erbij komen', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();
		bewaarVers(doel, 'lukas', 1, 1, inhoud(' eerste'), inhoud(' oud een'));
		bewaarVers(doel, 'lukas', 1, 2, inhoud(' lokaal anders'), inhoud(' oud twee'));

		const voorbeeld = voorbeeldInladen(doel, BOEK, backup);

		expect(voorbeeld.verzen.map((vers) => [vers.hoofdstuk, vers.vers, vers.soort])).toEqual([
			[1, 1, 'gelijk'],
			[1, 2, 'overschrijft'],
			[2, 7, 'nieuw'],
		]);
		expect(voorbeeld.telling).toEqual({ nieuw: 1, overschrijft: 1, gelijk: 1, keuzesNieuw: 1 });
		expect(voorbeeld.keuzes).toMatchObject([{ zoekterm: 'harde', soort: 'nieuw' }]);
	});

	it('zegt of de lokale bewerking nieuwer is dan die in de back-up', () => {
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
		expect(voorbeeldInladen(doel, BOEK, oudeBackup).verzen.find((vers) => vers.vers === 2)?.lokaalNieuwer).toBe(true);

		uitBackup.bewaard = new Date(Date.parse(lokaal.bewaard) + 60_000).toISOString();
		expect(voorbeeldInladen(doel, BOEK, oudeBackup).verzen.find((vers) => vers.vers === 2)?.lokaalNieuwer).toBe(false);
	});

	it('telt wat Vervangen zou wissen omdat het niet in de back-up staat', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = gevuldeOpslag();
		bewaarVers(doel, 'lukas', 3, 4, inhoud(' alleen lokaal'), inhoud(' oud'));
		pasKeuzeToe(doel, 'lukas', KEUZE_VERZEN, 'man', 'vrouw', zoekVondsten(KEUZE_VERZEN, 'man'), new Date('2026-11-16T08:00:00.000Z'));
		expect(leesKeuzes(doel, 'lukas')).toHaveLength(2);

		expect(voorbeeldInladen(doel, BOEK, backup).vervangenWist).toEqual({ verzen: 1, keuzes: 1 });
	});

	it('schrijft niets', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();

		voorbeeldInladen(doel, BOEK, backup);

		expect(doel.items.size).toBe(0);
	});
});

describe('pasBackupToe', () => {
	it('samenvoegen houdt de lokale verzen en keuzes en laat de back-up winnen bij een vers in beide', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();
		bewaarVers(doel, 'lukas', 1, 2, inhoud(' lokaal anders'), inhoud(' oud twee'));
		bewaarVers(doel, 'lukas', 3, 4, inhoud(' alleen lokaal'), inhoud(' oud'));

		const uitkomst = pasBackupToe(doel, BOEK, backup, 'samenvoegen');

		expect(uitkomst).toEqual({ geschreven: { verzen: 3, keuzes: 1 }, meldingen: [] });
		expect(leesTussenstand(doel, 'lukas', 1).verzen[2]?.inhoud).toEqual(inhoud(' tweede'));
		expect(leesTussenstand(doel, 'lukas', 1).verzen[1]?.inhoud).toEqual(inhoud(' eerste'));
		expect(leesTussenstand(doel, 'lukas', 2).verzen[7]).toBeDefined();
		expect(leesTussenstand(doel, 'lukas', 3).verzen[4]?.inhoud).toEqual(inhoud(' alleen lokaal'));
		expect(leesKeuzes(doel, 'lukas')).toHaveLength(1);
	});

	it('samenvoegen twee keer na elkaar verandert de tweede keer niets', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();

		pasBackupToe(doel, BOEK, backup, 'samenvoegen');
		const uitkomst = pasBackupToe(doel, BOEK, backup, 'samenvoegen');

		expect(uitkomst).toEqual({ geschreven: { verzen: 0, keuzes: 0 }, meldingen: [] });
		expect(leesKeuzes(doel, 'lukas')).toHaveLength(1);
	});

	it('vervangen wist eerst wat er is en zet dan alleen de back-up neer', () => {
		const backup = teruglezen(gevuldeOpslag());
		const doel = new GeheugenOpslag();
		bewaarVers(doel, 'lukas', 3, 4, inhoud(' alleen lokaal'), inhoud(' oud'));
		pasKeuzeToe(doel, 'lukas', KEUZE_VERZEN, 'man', 'vrouw', zoekVondsten(KEUZE_VERZEN, 'man'), new Date('2026-11-16T08:00:00.000Z'));
		expect(leesTussenstand(doel, 'lukas', 3).verzen[4]).toBeDefined();

		const uitkomst = pasBackupToe(doel, BOEK, backup, 'vervangen');

		expect(uitkomst).toEqual({ geschreven: { verzen: 3, keuzes: 1 }, meldingen: [] });
		expect(leesTussenstand(doel, 'lukas', 3).verzen).toEqual({});
		expect(leesKeuzes(doel, 'lukas').map((keuze) => keuze.zoekterm)).toEqual(['harde']);
		expect(teruglezen(doel).tussenstanden).toEqual(backup.tussenstanden);
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

		expect(uitkomst.geschreven).toEqual({ verzen: 0, keuzes: 0 });
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
		expect(uitkomst.geschreven).toEqual({ verzen: 1, keuzes: 1 });
		expect(leesTussenstand(doel, 'lukas', 2).verzen[7]).toBeDefined();
	});
});
