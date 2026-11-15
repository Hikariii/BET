import { describe, expect, it } from 'vitest';
import type { HoofdstukData, Precedent } from '../../data/types';
import { telPrecedenten, type GetelPrecedent } from '../../begrippen/telPrecedenten';
import { leesRepobestand } from '../../referentie/bestanden.testhulp';
import { leesPrecedenten } from '../../referentie/precedenten';
import { leesLukasHoofdstukken } from '../../uitlijning/lukasHoofdstukken.testhulp';
import { beslotenSamenvatting, metBronvormNogEerst, pastBijStatus, pastBijZoekterm, precedentSleutel, staatZekerNogOud } from './beslotenOverzicht';

type TellingOpties = {
	bron?: string;
	vereenvoudigd?: string;
	status?: Precedent['status'];
	telbaar?: boolean;
	toegepast?: number;
	nietToegepast?: number;
	opmerkingen?: string[];
};

function verzen(aantal: number) {
	return Array.from({ length: aantal }, (_, index) => ({ hoofdstuk: 1, vers: index + 1 }));
}

function telling({ bron = 'bron', vereenvoudigd = 'nieuw', status = 'voorlopig', telbaar = true, toegepast = 0, nietToegepast = 0, opmerkingen = [] }: TellingOpties): GetelPrecedent {
	return {
		precedent: { sectie: 'Test', bron, vereenvoudigd, plaats: '', status, opmerking: '' },
		telbaar,
		reden: telbaar ? null : 'werkregel',
		toegepast: verzen(toegepast),
		nietToegepast: verzen(nietToegepast),
		onbepaald: [],
		blijft: false,
		opmerkingen,
	};
}

const zekerNogOud = telling({ bron: 'zeker', nietToegepast: 2 });
const onzekerNogOud = telling({ bron: 'onzeker', nietToegepast: 5, opmerkingen: ['haakjes genegeerd'] });
const allesToegepast = telling({ bron: 'klaar', toegepast: 9 });
const nietTelbaar = telling({ bron: 'regel', telbaar: false });

describe('staatZekerNogOud', () => {
	it('markeert alleen een telling zonder opmerking waar de bronvorm nog staat', () => {
		expect(staatZekerNogOud(zekerNogOud)).toBe(true);
		expect(staatZekerNogOud(onzekerNogOud)).toBe(false);
		expect(staatZekerNogOud(allesToegepast)).toBe(false);
	});
});

describe('metBronvormNogEerst', () => {
	it('zet zeker nog oud voor onzeker nog oud, dan de rest, en wat niet te tellen is onderaan', () => {
		const gesorteerd = [nietTelbaar, allesToegepast, onzekerNogOud, zekerNogOud].sort(metBronvormNogEerst);

		expect(gesorteerd).toEqual([zekerNogOud, onzekerNogOud, allesToegepast, nietTelbaar]);
	});

	it('zet binnen een groep het hoogste aantal nog oude verzen vooraan', () => {
		const meer = telling({ bron: 'meer', nietToegepast: 7 });

		expect([zekerNogOud, meer].sort(metBronvormNogEerst)).toEqual([meer, zekerNogOud]);
	});
});

describe('pastBijZoekterm en pastBijStatus', () => {
	const vast = telling({ bron: 'Zoon des mensen', vereenvoudigd: 'Mensenzoon', status: 'vast' });

	it('zoekt zonder hoofdletters in bron en vereenvoudigd en laat bij een lege zoekterm alles door', () => {
		expect(pastBijZoekterm(vast, ' ZOON ')).toBe(true);
		expect(pastBijZoekterm(vast, 'mensenzoon')).toBe(true);
		expect(pastBijZoekterm(vast, 'synagoge')).toBe(false);
		expect(pastBijZoekterm(vast, '  ')).toBe(true);
	});

	it('filtert op status en laat bij "alle" alles door', () => {
		expect(pastBijStatus(vast, 'vast')).toBe(true);
		expect(pastBijStatus(vast, 'voorlopig')).toBe(false);
		expect(pastBijStatus(vast, 'alle')).toBe(true);
	});
});

describe('beslotenSamenvatting', () => {
	it('telt de precedenten met een bronvorm die nog staat en daarvan de onzekere', () => {
		const zichtbaar = [zekerNogOud, onzekerNogOud, onzekerNogOud, allesToegepast, nietTelbaar];

		expect(beslotenSamenvatting(zichtbaar, 478)).toBe('5 van 478 precedenten, waarvan 3 met een bronvorm die nog staat, waarvan 2 met een onzekere telling.');
	});

	it('telt een onzekere telling zonder nog oude verzen niet mee', () => {
		const onzekerKlaar = telling({ toegepast: 3, opmerkingen: ['haakjes genegeerd'] });

		expect(beslotenSamenvatting([onzekerKlaar], 1)).toBe('1 van 1 precedenten, waarvan 0 met een bronvorm die nog staat, waarvan 0 met een onzekere telling.');
	});
});

describe('Besloten op de data van Lukas', () => {
	const hoofdstukken: HoofdstukData[] = leesLukasHoofdstukken().map((lukas) => ({
		nummer: lukas.nummer,
		bron: lukas.bron,
		vereenvoudigd: lukas.vereenvoudigd,
		log: { verzen: [], algemeneVragen: [] },
	}));
	const precedenten = leesPrecedenten(leesRepobestand('bijbel/lukas/referentie/precedenten.md'));
	const tellingen = telPrecedenten(precedenten, hoofdstukken);

	it('geeft elk precedent een eigen sleutel', () => {
		expect(new Set(tellingen.map(precedentSleutel)).size).toBe(tellingen.length);
	});

	it('telt onzekere rijen met een bronvorm die nog staat niet als zeker nog oud', () => {
		const metBronvormNog = tellingen.filter((rij) => rij.nietToegepast.length > 0);
		const onzeker = metBronvormNog.filter((rij) => rij.opmerkingen.length > 0);

		expect(onzeker.length).toBeGreaterThan(0);
		expect(onzeker.length).toBeLessThan(metBronvormNog.length);
		expect(metBronvormNog.filter(staatZekerNogOud)).toHaveLength(metBronvormNog.length - onzeker.length);
		expect(beslotenSamenvatting(tellingen, tellingen.length)).toContain(
			`waarvan ${metBronvormNog.length} met een bronvorm die nog staat, waarvan ${onzeker.length} met een onzekere telling`,
		);
	});
});
