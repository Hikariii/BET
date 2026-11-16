import { describe, expect, it } from 'vitest';
import { markeringTekst, reactieLabel, sectieId, sectiekop } from './richtlijnTekst';

describe('markeringTekst', () => {
	it('zegt per soort wat er met de regel gebeurd is, met de versie', () => {
		expect(markeringTekst({ versie: '1.4', soort: 'nieuw' })).toBe('nieuw in v1.4');
		expect(markeringTekst({ versie: '1.4', soort: 'gewijzigd' })).toBe('gewijzigd in v1.4');
		expect(markeringTekst({ versie: '2.0', soort: 'open' })).toBe('open in v2.0');
	});
});

describe('reactieLabel', () => {
	it('noemt een reactie met het vinkje een voorstel en een andere gereageerd', () => {
		expect(reactieLabel({ voorstel: true })).toBe('voorstel');
		expect(reactieLabel({ voorstel: false })).toBe('gereageerd');
	});
});

describe('sectieId en sectiekop', () => {
	it('maakt het id uit het paragraafnummer, en uit het volgnummer bij een kop zonder nummer', () => {
		expect(sectieId({ paragraaf: '17B', titel: 'x', markering: null, niveau: 3, markdown: '', eigenMarkdown: '' }, 4)).toBe('richtlijn-17B');
		expect(sectieId({ paragraaf: '', titel: 'x', markering: null, niveau: 2, markdown: '', eigenMarkdown: '' }, 4)).toBe('richtlijn-sectie-4');
	});

	it('zet het teken § voor het nummer en laat het weg zonder nummer', () => {
		expect(sectiekop({ paragraaf: '17B', titel: 'Messias / Christus' })).toBe('§17B Messias / Christus');
		expect(sectiekop({ paragraaf: '', titel: 'Bijlage' })).toBe('Bijlage');
	});
});
