import { describe, expect, it } from 'vitest';
import { parseerHoofdstuk } from '../formaat/parseer';
import { lijnHoofdstukUit, lijnVersUit, type Uitlijningsdeel } from './uitlijn';

/** `soort: bronwoorden > nieuwewoorden`, zoals een lezer de uitlijning met de hand zou opschrijven. */
function leesbaar(delen: readonly Uitlijningsdeel[]): string[] {
	return delen.map((deel) => `${deel.soort}: ${deel.bron.map((woord) => woord.tekst).join(' ')} > ${deel.nieuw.map((woord) => woord.tekst).join(' ')}`);
}

describe('lijnVersUit', () => {
	it('geeft één gelijk stuk als de tekst gelijk bleef', () => {
		expect(leesbaar(lijnVersUit('Hij kwam terug.', 'Hij kwam terug.'))).toEqual(['gelijk: Hij kwam terug > Hij kwam terug']);
	});

	it('negeert leestekens en hoofdletters bij het vergelijken en bewaart de bronspelling', () => {
		const delen = lijnVersUit('Hij zei: “Kom!”', 'hij zei kom');

		expect(leesbaar(delen)).toEqual(['gelijk: Hij zei Kom > hij zei kom']);
	});

	it('vervangt een enkel woord tussen twee ankers', () => {
		const delen = lijnVersUit('de Heere sprak tot hem', 'de Heer sprak tot hem');

		expect(leesbaar(delen)).toEqual(['gelijk: de > de', 'vervangen: Heere > Heer', 'gelijk: sprak tot hem > sprak tot hem']);
	});

	it('meldt een weggevallen "En" aan het begin', () => {
		const delen = lijnVersUit('En de duivel zei tegen Hem', 'De duivel zei tegen Hem');

		expect(leesbaar(delen)).toEqual(['weggevallen: En > ', 'gelijk: de duivel zei tegen Hem > De duivel zei tegen Hem']);
	});

	it('meldt toegevoegde woorden', () => {
		const delen = lijnVersUit('Hij ging weg', 'Hij ging snel weg');

		expect(leesbaar(delen)).toEqual(['gelijk: Hij ging > Hij ging', 'toegevoegd:  > snel', 'gelijk: weg > weg']);
	});

	it('vervangt een woordgroep door een woordgroep van andere lengte', () => {
		const delen = lijnVersUit('de Zoon des mensen komt', 'de Mensenzoon komt');

		expect(leesbaar(delen)).toEqual(['gelijk: de > de', 'vervangen: Zoon des mensen > Mensenzoon', 'gelijk: komt > komt']);
	});

	it('knipt een vervangen stuk bij verwante woorden, zodat woorden eromheen apart blijven', () => {
		const delen = lijnVersUit('Petrus zei Heere ga weg', 'Petrus Heer ga weg');

		expect(leesbaar(delen)).toEqual(['gelijk: Petrus > Petrus', 'weggevallen: zei > ', 'vervangen: Heere > Heer', 'gelijk: ga weg > ga weg']);
	});

	it('knipt niet bij een samenstelling die maar voor de helft overeenkomt', () => {
		const delen = lijnVersUit('de Zoon des mensen komt', 'de mensenzoon komt');

		expect(leesbaar(delen)).toEqual(['gelijk: de > de', 'vervangen: Zoon des mensen > mensenzoon', 'gelijk: komt > komt']);
	});

	it('kiest bij een omgezette zin de reeks gelijke woorden met het hoogste gewicht', () => {
		const delen = lijnVersUit('de man sloeg de hond', 'de hond sloeg de man');

		const gelijkeWoorden = delen.filter((deel) => deel.soort === 'gelijk').flatMap((deel) => deel.bron.map((woord) => woord.vergelijkvorm));
		expect(gelijkeWoorden).toEqual(['de', 'sloeg', 'de']);
	});

	it('geeft voor een lege vereenvoudiging alles als weggevallen', () => {
		expect(leesbaar(lijnVersUit('Dit is weg', ''))).toEqual(['weggevallen: Dit is weg > ']);
	});
});

describe('lijnHoofdstukUit', () => {
	it('lijnt per versnummer uit, ook als een vers over meer alinea\'s loopt', () => {
		const bron = parseerHoofdstuk('# Lukas 4\n\n[3] En de duivel zei:\n@jezus Kom hier.\n\n[4] Daarna ging hij.\n');
		const vereenvoudigd = parseerHoofdstuk('# Lukas 4\n\n[3] De duivel zei:\n@jezus “Kom hier.”\n\n[4] Daarna ging hij.\n');

		const uitlijning = lijnHoofdstukUit(bron, vereenvoudigd);

		expect(uitlijning.map((vers) => vers.vers)).toEqual([3, 4]);
		expect(leesbaar(uitlijning[0]?.delen ?? [])).toEqual(['weggevallen: En > ', 'gelijk: de duivel zei Kom hier > De duivel zei Kom hier']);
		expect(leesbaar(uitlijning[1]?.delen ?? [])).toEqual(['gelijk: Daarna ging hij > Daarna ging hij']);
	});

	it('laat een vers dat in de vereenvoudiging ontbreekt volledig wegvallen', () => {
		const bron = parseerHoofdstuk('# Lukas 4\n\n[1] Eerste vers. [2] Tweede vers.\n');
		const vereenvoudigd = parseerHoofdstuk('# Lukas 4\n\n[1] Eerste vers.\n');

		const uitlijning = lijnHoofdstukUit(bron, vereenvoudigd);

		expect(uitlijning.map((vers) => vers.vers)).toEqual([1, 2]);
		expect(leesbaar(uitlijning[1]?.delen ?? [])).toEqual(['weggevallen: Tweede vers > ']);
	});
});
