import { describe, expect, it } from 'vitest';
import type { BewaardOverzicht } from '../../bewaren/overzicht';
import { backupBestandsnaamMetTijd, backupHerinnering, laatsteBackupRegel, tijdGeleden } from './backupTekst';

/** Een tijdstip in de lokale tijdzone, zodat de test niet van de tijdzone van de machine afhangt. */
function lokaal(maand: number, dag: number, uur = 12, minuut = 0): Date {
	return new Date(2026, maand - 1, dag, uur, minuut);
}

const NU = lokaal(11, 20, 15);

/** Een overzicht met één bewerkt vers, bewaard op `bewaard`. */
function overzichtMetBewerking(bewaard: Date): BewaardOverzicht {
	return {
		hoofdstukken: [{ hoofdstuk: 1, verzen: [{ vers: 1, bewaard: bewaard.toISOString(), verouderd: false, herkomst: 'zelf getypt' }] }],
		keuzes: [],
		antwoorden: [],
		reacties: [],
		totaal: { verzen: 1, hoofdstukken: 1, verouderd: 0, keuzes: 0, antwoorden: 0, reacties: 0 },
		verouderdBekend: true,
		laatstBewaard: bewaard.toISOString(),
	};
}

const LEEG_OVERZICHT: BewaardOverzicht = {
	hoofdstukken: [],
	keuzes: [],
	antwoorden: [],
	reacties: [],
	totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 0, antwoorden: 0, reacties: 0 },
	verouderdBekend: true,
	laatstBewaard: null,
};

describe('tijdGeleden', () => {
	it.each([
		['vandaag, eerder op de dag', lokaal(11, 20, 0), 'vandaag'],
		['gisteren, ook al is het minder dan 24 uur geleden', lokaal(11, 19, 23), 'gisteren'],
		['drie dagen', lokaal(11, 17), '3 dagen geleden'],
		['dertien dagen', lokaal(11, 7), '13 dagen geleden'],
		['veertien dagen als twee weken', lokaal(11, 6), '2 weken geleden'],
		['twee maanden', lokaal(9, 20), '2 maanden geleden'],
	])('%s', (_omschrijving, moment, verwacht) => {
		expect(tijdGeleden(moment.toISOString(), NU)).toBe(verwacht);
	});

	it('telt een moment in de toekomst als vandaag', () => {
		expect(tijdGeleden(lokaal(11, 25).toISOString(), NU)).toBe('vandaag');
	});
});

describe('laatsteBackupRegel', () => {
	it('zegt nooit zonder back-up', () => {
		expect(laatsteBackupRegel(null, NU)).toBe('Laatste back-up: nooit');
	});

	it('noemt hoe lang geleden de back-up was', () => {
		expect(laatsteBackupRegel(lokaal(11, 19, 9, 5).toISOString(), NU)).toContain('Laatste back-up: gisteren (');
	});

	it('zet de tijd erbij als de back-up vandaag was', () => {
		expect(laatsteBackupRegel(lokaal(11, 20, 14, 32).toISOString(), lokaal(11, 20, 16))).toBe('Laatste back-up: vandaag (14:32)');
	});

	it('zet bij een eerdere dag ook de datum erbij', () => {
		const regel = laatsteBackupRegel(lokaal(11, 17, 9, 5).toISOString(), NU);

		expect(regel).toContain('3 dagen geleden (');
		expect(regel).toContain('09:05');
	});
});

describe('backupHerinnering', () => {
	it('zwijgt zonder bewerkingen, ook zonder back-up', () => {
		expect(backupHerinnering(LEEG_OVERZICHT, null, NU)).toBeNull();
	});

	it('zwijgt zonder back-up zolang de oudste bewerking jonger is dan 7 dagen', () => {
		expect(backupHerinnering(overzichtMetBewerking(lokaal(11, 15)), null, NU)).toBeNull();
	});

	it('herinnert zonder back-up als de oudste bewerking ouder is dan 7 dagen', () => {
		expect(backupHerinnering(overzichtMetBewerking(lokaal(11, 10)), null, NU)).toBe('Maak een back-up: je hebt er nog geen gemaakt.');
	});

	it('herinnert zonder back-up op grond van de oudste bewerking, ook als een andere vers vandaag bewerkt is', () => {
		const oud = overzichtMetBewerking(lokaal(11, 10));
		const overzicht: BewaardOverzicht = {
			...oud,
			hoofdstukken: [
				{ hoofdstuk: 1, verzen: [...(oud.hoofdstukken[0]?.verzen ?? []), { vers: 2, bewaard: NU.toISOString(), verouderd: false, herkomst: 'zelf getypt' }] },
			],
			laatstBewaard: NU.toISOString(),
		};

		expect(backupHerinnering(overzicht, null, NU)).not.toBeNull();
	});

	it('telt een toegepaste keuze als bewerking', () => {
		const overzicht: BewaardOverzicht = {
			...LEEG_OVERZICHT,
			keuzes: [{ id: 'k', soort: 'tekst', zoekterm: 'a', nieuw: 'b', van: null, naar: null, toegepast: lokaal(11, 10).toISOString(), aantalVerzen: 2 }],
			totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 1, antwoorden: 0, reacties: 0 },
			laatstBewaard: lokaal(11, 10).toISOString(),
		};

		expect(backupHerinnering(overzicht, null, NU)).not.toBeNull();
	});

	it('telt een reactie als bewerking, zonder back-up en na een oude back-up', () => {
		const gegeven = lokaal(11, 10).toISOString();
		const overzicht: BewaardOverzicht = {
			...LEEG_OVERZICHT,
			reacties: [{ nr: 'O1.1', hoofdstuk: 1, kwestie: 'Vrije weergave', wordtVraag: false, heeftTekst: true, gegeven }],
			totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 0, antwoorden: 0, reacties: 1 },
			laatstBewaard: gegeven,
		};

		expect(backupHerinnering(overzicht, null, NU)).toBe('Maak een back-up: je hebt er nog geen gemaakt.');
		expect(backupHerinnering(overzicht, lokaal(11, 8).toISOString(), NU)).toBe('Maak een back-up: je laatste is van 12 dagen geleden.');
	});

	it('telt een gegeven antwoord als bewerking, zonder back-up en na een oude back-up', () => {
		const gegeven = lokaal(11, 10).toISOString();
		const overzicht: BewaardOverzicht = {
			...LEEG_OVERZICHT,
			antwoorden: [{ kwestie: 'Harde man', optie: 'a) zachte', gegeven }],
			totaal: { verzen: 0, hoofdstukken: 0, verouderd: 0, keuzes: 0, antwoorden: 1, reacties: 0 },
			laatstBewaard: gegeven,
		};

		expect(backupHerinnering(overzicht, null, NU)).toBe('Maak een back-up: je hebt er nog geen gemaakt.');
		expect(backupHerinnering(overzicht, lokaal(11, 8).toISOString(), NU)).toBe('Maak een back-up: je laatste is van 12 dagen geleden.');
		expect(backupHerinnering(overzicht, lokaal(11, 12).toISOString(), NU)).toBeNull();
	});

	it('herinnert als er na een oude back-up bewerkt is', () => {
		expect(backupHerinnering(overzichtMetBewerking(lokaal(11, 19)), lokaal(11, 8).toISOString(), NU)).toBe(
			'Maak een back-up: je laatste is van 12 dagen geleden.',
		);
	});

	it('zwijgt bij een oude back-up als er daarna niet bewerkt is', () => {
		expect(backupHerinnering(overzichtMetBewerking(lokaal(11, 5)), lokaal(11, 8).toISOString(), NU)).toBeNull();
	});

	it('zwijgt bij een back-up van minder dan 7 dagen oud, ook als er daarna bewerkt is', () => {
		expect(backupHerinnering(overzichtMetBewerking(lokaal(11, 19)), lokaal(11, 15).toISOString(), NU)).toBeNull();
	});
});

describe('backupBestandsnaamMetTijd', () => {
	it('zet datum en tijd in de naam, met nullen voor een enkel cijfer', () => {
		expect(backupBestandsnaamMetTijd('lukas', lokaal(11, 6, 9, 5))).toBe('lukas.bet-bewaard-2026-11-06-0905.json');
	});

	it('geeft twee back-ups van verschillende minuten een verschillende naam', () => {
		expect(backupBestandsnaamMetTijd('lukas', lokaal(11, 20, 14, 32))).not.toBe(backupBestandsnaamMetTijd('lukas', lokaal(11, 20, 14, 33)));
	});
});
