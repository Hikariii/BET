import { describe, expect, it } from 'vitest';
import type { Verwijzing } from '../data/types';
import { leesLog } from './leesLog';

/** In de logs scheidt de em-dash de wijziging van de reden. */
const STREEP = String.fromCharCode(0x2014);
const BOM = String.fromCharCode(0xfeff);

/** Een log met één vers waarvan de wijzigingen de gegeven regels zijn. */
function logMetWijzigingen(...regels: string[]): string {
	return ['# Wijzigingslog Lukas 9', '', '## Vers 5', '- **Wijzigingen:**', ...regels.map((regel) => `  - ${regel}`)].join('\n');
}

function verwijzingenVan(regel: string): Verwijzing[] {
	const [vers] = leesLog(logMetWijzigingen(regel)).verzen;
	return vers?.wijzigingen[0]?.verwijzingen ?? [];
}

const paragraaf = (nummer: string): Verwijzing => ({ soort: 'paragraaf', paragraaf: nummer });
const precedent: Verwijzing = { soort: 'precedent' };

describe('verwijzingen in een wijzigingsregel', () => {
	it('vindt een paragraaf met en zonder letter', () => {
		expect(verwijzingenVan(`"Heere" → "Heer" ${STREEP} §11`)).toEqual([paragraaf('11')]);
		expect(verwijzingenVan(`"En" weg ${STREEP} §7A (zinsbegin)`)).toEqual([paragraaf('7A')]);
		expect(verwijzingenVan(`x ${STREEP} §17B`)).toEqual([paragraaf('17B')]);
		expect(verwijzingenVan(`x ${STREEP} §25A`)).toEqual([paragraaf('25A')]);
	});

	it('vindt meerdere paragrafen in volgorde van voorkomen', () => {
		expect(verwijzingenVan(`x ${STREEP} §27, §11 en §2`)).toEqual([paragraaf('27'), paragraaf('11'), paragraaf('2')]);
	});

	it('vindt beide paragrafen in "§7A/§21" en "§13/§24"', () => {
		expect(verwijzingenVan(`x ${STREEP} §7A/§21`)).toEqual([paragraaf('7A'), paragraaf('21')]);
		expect(verwijzingenVan(`x ${STREEP} §13 / §24`)).toEqual([paragraaf('13'), paragraaf('24')]);
	});

	it('telt een herhaalde paragraaf één keer, op de plek van het eerste voorkomen', () => {
		expect(verwijzingenVan(`§5, §7A, §5, §7A en §9`)).toEqual([paragraaf('5'), paragraaf('7A'), paragraaf('9')]);
	});

	it('houdt §11 en §11A uit elkaar', () => {
		expect(verwijzingenVan(`§11, §11A`)).toEqual([paragraaf('11'), paragraaf('11A')]);
	});

	it('leest geen paragraaf in een versverwijzing na een paragraaf', () => {
		expect(verwijzingenVan(`x ${STREEP} §17, 21:24`)).toEqual([paragraaf('17')]);
	});

	it('neemt het nummer uit een samenstelling als "§11-geest"', () => {
		expect(verwijzingenVan(`x ${STREEP} §11-geest`)).toEqual([paragraaf('11')]);
	});

	it('vindt het woord precedent, ook met hoofdletter en in het meervoud, één keer per regel', () => {
		expect(verwijzingenVan(`x ${STREEP} precedent Lk 4–24, ook precedent 9:23`)).toEqual([precedent]);
		expect(verwijzingenVan(`x ${STREEP} Precedent`)).toEqual([precedent]);
		expect(verwijzingenVan(`x ${STREEP} volgens de precedenten`)).toEqual([precedent]);
	});

	it('zet paragraaf en precedent in de volgorde van de tekst', () => {
		expect(verwijzingenVan(`x ${STREEP} §7A, precedent`)).toEqual([paragraaf('7A'), precedent]);
		expect(verwijzingenVan(`x ${STREEP} precedent, §11, §7A`)).toEqual([precedent, paragraaf('11'), paragraaf('7A')]);
	});

	it('geeft niets voor een regel zonder verwijzing', () => {
		expect(verwijzingenVan(`"Heere" → "Heer" ${STREEP} modernisering`)).toEqual([]);
	});

	it('houdt een versnummer of het woord paragraaf zonder § buiten beschouwing', () => {
		expect(verwijzingenVan(`x ${STREEP} zie 21:24 en paragraaf 11`)).toEqual([]);
	});
});

describe('secties per vers', () => {
	it('leest een enkel vers met wijzigingen en een vraag', () => {
		const log = leesLog(
			[
				'## Vers 5',
				'- **Bron:** In de dagen van Herodes',
				'- **Nieuw:** In de tijd dat Herodes',
				'- **Wijzigingen:**',
				`  - "In de dagen van" → "In de tijd dat" ${STREEP} §7 (zinsconstructie)`,
				`  - "Heere" → "Heer" ${STREEP} §11`,
				'- **Twijfel / vraag aan redactie:** Mag dit?',
			].join('\n'),
		);
		expect(log.verzen).toEqual([
			{
				verzen: [5],
				wijzigingen: [
					{ tekst: `"In de dagen van" → "In de tijd dat" ${STREEP} §7 (zinsconstructie)`, verwijzingen: [paragraaf('7')] },
					{ tekst: `"Heere" → "Heer" ${STREEP} §11`, verwijzingen: [paragraaf('11')] },
				],
				vragen: ['Mag dit?'],
			},
		]);
	});

	it.each([
		['een koppelteken', '## Vers 3-5'],
		['een gedachtestreep', '## Vers 3–5'],
		['een em-dash', `## Vers 3${STREEP}5`],
		['spaties rond het streepje', '## Vers 3 – 5'],
		['een dubbele punt achter de kop', '## Vers 3-5:'],
		['een kop in hoofdletters', '## VERS 3-5'],
	])('leest een reeks met %s', (_naam, kop) => {
		const [vers] = leesLog(`${kop}\n- **Wijzigingen:** x`).verzen;
		expect(vers?.verzen).toEqual([3, 4, 5]);
	});

	it('slaat een omgekeerde reeks over', () => {
		const log = leesLog('## Vers 5-3\n- **Wijzigingen:** x\n## Vers 7\n- **Wijzigingen:** y');
		expect(log.verzen.map((vers) => vers.verzen)).toEqual([[7]]);
	});

	it('negeert koppen die geen versnummer hebben, ook met "Vers" in de tekst', () => {
		const log = leesLog('## Vers 5a\n- **Wijzigingen:** x\n## Verslag\n- **Wijzigingen:** y');
		expect(log.verzen).toEqual([]);
	});

	it('leest een wijziging op de regel van het veld zelf', () => {
		const [vers] = leesLog('## Vers 5\n- **Wijzigingen:** "a" → "b"').verzen;
		expect(vers?.wijzigingen.map((regel) => regel.tekst)).toEqual(['"a" → "b"']);
	});

	it('leest een veldnaam met de dubbele punt buiten de sterretjes', () => {
		const [vers] = leesLog('## Vers 5\n- **Wijzigingen**: x').verzen;
		expect(vers?.wijzigingen.map((regel) => regel.tekst)).toEqual(['x']);
	});

	it('voegt een vervolgregel zonder lijstteken aan de vorige regel toe', () => {
		const [vers] = leesLog('## Vers 5\n- **Wijzigingen:**\n  - eerste\n    en verder\n  - tweede').verzen;
		expect(vers?.wijzigingen.map((regel) => regel.tekst)).toEqual(['eerste en verder', 'tweede']);
	});

	it('neemt een regel zonder lijstteken direct onder het veld als eerste regel', () => {
		const [vers] = leesLog('## Vers 5\n- **Wijzigingen:**\nlos stuk tekst').verzen;
		expect(vers?.wijzigingen.map((regel) => regel.tekst)).toEqual(['los stuk tekst']);
	});

	it('neemt een niet-vette lijstregel zonder inspringing als vervolg van de vorige regel', () => {
		const [vers] = leesLog('## Vers 5\n- **Wijzigingen:**\n  - eerste\n- tweede').verzen;
		expect(vers?.wijzigingen.map((regel) => regel.tekst)).toEqual(['eerste - tweede']);
	});

	it('slaat lege regels over en negeert Bron, Nieuw en onbekende velden met hun vervolg', () => {
		const [vers] = leesLog(
			['## Vers 5', '- **Bron:** a', '  - subitem van bron', '', '- **Nieuw:** b', '- **Wijzigingen:**', '', '  - x', '', '- **Opmerking:** c', '  - d'].join('\n'),
		).verzen;
		expect(vers?.wijzigingen.map((regel) => regel.tekst)).toEqual(['x']);
		expect(vers?.vragen).toEqual([]);
	});

	it('herkent vraagvelden aan "twijfel" of "vraag" in de naam', () => {
		const [vers] = leesLog(
			['## Vers 5', '- **Twijfel:** een', '- **Vraag aan de redactie:** twee', '- **Twijfel / vraag aan redactie:**', '  - drie'].join('\n'),
		).verzen;
		expect(vers?.vragen).toEqual(['een', 'twee', 'drie']);
	});

	it('weert lege vraagwaarden', () => {
		const [vers] = leesLog(
			[
				'## Vers 5',
				'- **Twijfel / vraag aan redactie:** (optioneel)',
				'- **Twijfel:** Geen',
				'- **Twijfel:** nee',
				'- **Twijfel:** n.v.t.',
				'- **Twijfel:** NVT',
				'- **Twijfel:** -',
				`- **Twijfel:** ${STREEP}`,
				'- **Twijfel:** ( geen )',
				'- **Twijfel:** geen idee of dit mag',
			].join('\n'),
		).verzen;
		expect(vers?.vragen).toEqual(['geen idee of dit mag']);
	});

	it('houdt een vers zonder regels als sectie bij', () => {
		const log = leesLog('## Vers 5\n- **Bron:** a\n## Vers 6\n- **Wijzigingen:** x');
		expect(log.verzen.map((vers) => [vers.verzen, vers.wijzigingen.length])).toEqual([
			[[5], 0],
			[[6], 1],
		]);
	});

	it('beëindigt een vers bij elke andere kop, ook een zonder versnummer', () => {
		const log = leesLog(
			[
				'## Vers 5',
				'- **Wijzigingen:** x',
				'## Opmaakherstel 2026-11-15',
				'- **Wijzigingen:** hoort niet bij vers 5',
				'- 2:24: markering torah terug',
				'## Aandachtspunten (stap 1)',
				'- **Twijfel:** ook niet',
				'### Onderdeel',
				'- **Wijzigingen:** ook niet',
			].join('\n'),
		);
		expect(log.verzen).toHaveLength(1);
		expect(log.verzen[0]?.wijzigingen.map((regel) => regel.tekst)).toEqual(['x']);
		expect(log.verzen[0]?.vragen).toEqual([]);
	});

	it('negeert wat boven de eerste kop staat', () => {
		const log = leesLog('# Wijzigingslog Lukas 1\n\n- **Wijzigingen:** los\n\nIntro.\n\n## Vers 1\n- **Wijzigingen:** x');
		expect(log.verzen.map((vers) => vers.wijzigingen.map((regel) => regel.tekst))).toEqual([['x']]);
	});

	it('houdt twee secties voor hetzelfde vers beide bij', () => {
		const log = leesLog('## Vers 5\n- **Wijzigingen:** a\n## Vers 5\n- **Wijzigingen:** b');
		expect(log.verzen.map((vers) => vers.wijzigingen.map((regel) => regel.tekst))).toEqual([['a'], ['b']]);
	});
});

describe('algemene vragen', () => {
	it('leest genummerde items en lijstitems onder "Vragen aan redactie"', () => {
		const log = leesLog('## Vragen aan redactie\n\n1. eerste\n2. tweede\n- derde\n* vierde\n');
		expect(log.algemeneVragen).toEqual(['eerste', 'tweede', 'derde', 'vierde']);
	});

	it('voegt een ingesprongen vervolgregel toe, maar negeert een regel zonder inspringing', () => {
		const log = leesLog('## Vragen aan redactie\n1. eerste\n   vervolg\n\tnog meer\nlosse zin\n2. tweede');
		expect(log.algemeneVragen).toEqual(['eerste vervolg nog meer', 'tweede']);
	});

	it('houdt hier de lege vraagwaarden niet tegen', () => {
		const log = leesLog('## Vragen aan redactie\n1. geen\n2. (optioneel)');
		expect(log.algemeneVragen).toEqual(['geen', '(optioneel)']);
	});

	it('stopt bij de volgende kop en leest daarna weer verzen', () => {
		const log = leesLog('## Vragen aan redactie\n1. a\n## Vers 5\n- **Wijzigingen:** x\n- **Twijfel:** v\n');
		expect(log.algemeneVragen).toEqual(['a']);
		expect(log.verzen).toHaveLength(1);
		expect(log.verzen[0]?.vragen).toEqual(['v']);
	});

	it('leest de vragen ook als de kop na de verzen staat, en eindigt een vers bij de kop', () => {
		const log = leesLog('## Vers 5\n- **Wijzigingen:** x\n## Vragen aan redactie\n1. a\n- **Twijfel:** een lijstitem');
		expect(log.verzen[0]?.vragen).toEqual([]);
		expect(log.algemeneVragen).toEqual(['a', '**Twijfel:** een lijstitem']);
	});

	it('houdt Aandachtspunten en Consistentieronde buiten de vragen', () => {
		const log = leesLog('## Vragen aan redactie\n1. a\n## Aandachtspunten (stap 1)\n1. niet\n## Consistentieronde\n- niet');
		expect(log.algemeneVragen).toEqual(['a']);
	});

	it('geeft niets als de kop ontbreekt', () => {
		expect(leesLog('## Vers 5\n1. geen vraag\n').algemeneVragen).toEqual([]);
	});
});

describe('bestandsvormen', () => {
	it('geeft hetzelfde resultaat voor CRLF en met een BOM voor de eerste regel', () => {
		const tekst = '## Vers 5\n- **Wijzigingen:**\n  - x\n## Vragen aan redactie\n1. a\n';
		expect(leesLog(`${BOM}${tekst.replaceAll('\n', '\r\n')}`)).toEqual(leesLog(tekst));
	});

	it('geeft een lege log voor een lege tekst', () => {
		expect(leesLog('')).toEqual({ verzen: [], algemeneVragen: [] });
	});
});
