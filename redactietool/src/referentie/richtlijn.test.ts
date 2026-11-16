import { describe, expect, it } from 'vitest';
import { leesRepobestand } from './bestanden.testhulp';
import { leesRichtlijn } from './richtlijn';

describe('leesRichtlijn op redactierichtlijn.md', () => {
	const tekst = leesRepobestand('richtlijn/redactierichtlijn.md');
	const richtlijn = leesRichtlijn(tekst);
	const secties = richtlijn.secties;
	const zoek = (paragraaf: string) => secties.find((sectie) => sectie.paragraaf === paragraaf);

	it('geeft elke kop van niveau twee en drie', () => {
		const koppen = tekst.split('\n').filter((regel) => /^#{2,3} /.test(regel));

		expect(koppen.length).toBeGreaterThan(30);
		expect(secties).toHaveLength(koppen.length);
		expect(secties.filter((sectie) => sectie.niveau === 3)).toHaveLength(koppen.filter((regel) => regel.startsWith('### ')).length);
	});

	it('geeft de koppen zonder nummer een lege paragraaf', () => {
		expect(secties.filter((sectie) => sectie.paragraaf === '').map((sectie) => sectie.titel)).toEqual([
			'Over deze versie',
			'Bijlage: wat nog moet gebeuren',
		]);
	});

	it('geeft elk nummer maar één keer', () => {
		const nummers = secties.map((sectie) => sectie.paragraaf).filter((paragraaf) => paragraaf !== '');

		expect(new Set(nummers).size).toBe(nummers.length);
	});

	it('geeft paragraaf 11 met de titel en de inhoud tot de volgende kop', () => {
		const paragraaf = zoek('11');

		expect(paragraaf).toMatchObject({ paragraaf: '11', titel: 'Ouderwets Nederlands moderniseren', niveau: 2 });
		expect(paragraaf?.markdown.startsWith('Wanneer er een goed modern equivalent bestaat.\n\n| Oud | Nieuw | Bron |')).toBe(true);
		expect(paragraaf?.markdown).not.toContain('## 12.');
	});

	it('haalt de markering [v1.4 open] uit de titel van 17B', () => {
		expect(zoek('17B')).toMatchObject({ paragraaf: '17B', titel: 'Messias / Christus', niveau: 3 });
		expect(zoek('17B')?.markdown.startsWith('v1.3.1: bij de eerste keer in een nieuwe context')).toBe(true);
		expect(zoek('17B')?.markdown).not.toContain('17C');
	});

	it('haalt de markering [v1.4 nieuw] zonder sterretjes uit de titel van 7A', () => {
		expect(zoek('7A')).toMatchObject({ paragraaf: '7A', titel: 'Vaste zinsbouwregels uit Lukas 1–3', niveau: 3 });
	});

	it('geeft de titel uit de kop van niveau een', () => {
		expect(richtlijn.titel).toBe(tekst.split('\n')[0]?.replace(/^# /, ''));
		expect(richtlijn.titel).toMatch(/^Redactierichtlijn v\d/);
	});

	it('geeft de versiemarkering per kop: nieuw, gewijzigd, open of geen', () => {
		expect(zoek('7A')?.markering).toEqual({ versie: '1.4', soort: 'nieuw' });
		expect(zoek('17A')?.markering).toEqual({ versie: '1.4', soort: 'gewijzigd' });
		expect(zoek('17B')?.markering).toEqual({ versie: '1.4', soort: 'open' });
		expect(zoek('11')?.markering).toBeNull();
	});

	it('geeft de markering van elke kop die er in het bestand een heeft', () => {
		const metMarkering = tekst.split('\n').filter((regel) => /^#{2,3} .*\[v\d/.test(regel));

		expect(metMarkering.length).toBeGreaterThan(5);
		expect(secties.filter((sectie) => sectie.markering !== null)).toHaveLength(metMarkering.length);
	});

	it('geeft bij een paragraaf met subparagrafen alleen de eigen tekst in eigenMarkdown', () => {
		const zeventien = zoek('17');

		expect(zeventien?.markdown).toContain('### 17B. Messias / Christus');
		expect(zeventien?.eigenMarkdown).not.toContain('### ');
		expect(zeventien?.eigenMarkdown.length).toBeGreaterThan(0);
		expect(zoek('17B')?.eigenMarkdown).toBe(zoek('17B')?.markdown);
	});

	it('laat de scheidingslijn aan het eind van een sectie weg', () => {
		expect(zoek('')?.markdown).not.toMatch(/-{3,}\s*$/);
		expect(secties.filter((sectie) => /\n-{3,}\s*$/.test(sectie.markdown))).toEqual([]);
	});

	it('laat een paragraaf op niveau twee zijn subparagrafen bevatten', () => {
		expect(zoek('17')?.markdown).toContain('### 17B. Messias / Christus');
	});

	it('laat geen markering of nummer in een titel staan', () => {
		expect(secties.filter((sectie) => /\[v\d|\*\*|^\d/.test(sectie.titel))).toEqual([]);
	});
});

describe('leesRichtlijn op kleine invoer', () => {
	it('geeft de nummers met een letter en de koppen zonder nummer', () => {
		const tekst = ['## 3. Eén', '', '### 3B. Twee', '', 'Tekst.', '', '## Zonder nummer'].join('\n');

		expect(leesRichtlijn(tekst).secties.map(({ paragraaf, titel, niveau }) => [paragraaf, titel, niveau])).toEqual([
			['3', 'Eén', 2],
			['3B', 'Twee', 3],
			['', 'Zonder nummer', 2],
		]);
	});

	it('beëindigt een sectie bij een kop van gelijk niveau en bij een kop van hoger niveau', () => {
		const tekst = ['## 1. A', 'a1', '### 1A. B', 'b1', '### 1B. C', 'c1', '## 2. D', 'd1'].join('\n');
		const [a, b, c, d] = leesRichtlijn(tekst).secties;

		expect(a?.markdown).toBe('a1\n### 1A. B\nb1\n### 1B. C\nc1');
		expect(b?.markdown).toBe('b1');
		expect(c?.markdown).toBe('c1');
		expect(d?.markdown).toBe('d1');
	});

	it('laat een kop van niveau vier bij de inhoud horen', () => {
		const [sectie] = leesRichtlijn('## 1. A\n#### Detail\ntekst').secties;

		expect(sectie?.markdown).toBe('#### Detail\ntekst');
	});

	it('beëindigt een sectie bij een kop van niveau een', () => {
		const [sectie] = leesRichtlijn('## 1. A\ntekst\n# Hoofdkop\nbuiten').secties;

		expect(sectie?.markdown).toBe('tekst');
	});

	it('leest een kop in een codeblok niet als sectie', () => {
		const secties = leesRichtlijn('## 1. A\n```\n## 2. Niet echt\n```\nna').secties;

		expect(secties.map(({ paragraaf }) => paragraaf)).toEqual(['1']);
		expect(secties[0]?.markdown).toBe('```\n## 2. Niet echt\n```\nna');
	});

	it('haalt de witregels voor en na de inhoud weg en behoudt die binnenin', () => {
		const [sectie] = leesRichtlijn('## 1. A\n\n\neen\n\ntwee\n\n\n## 2. B').secties;

		expect(sectie?.markdown).toBe('een\n\ntwee');
	});

	it('geeft een kop zonder inhoud een lege markdown', () => {
		expect(leesRichtlijn('## 1. A\n## 2. B').secties.map(({ markdown }) => markdown)).toEqual(['', '']);
	});

	it('leest een markering met vet en een markering zonder vet', () => {
		const titels = leesRichtlijn('## 5. A **[v1.4 gewijzigd]**\n## 6. [v1.4 nieuw] B').secties.map(({ titel }) => titel);

		expect(titels).toEqual(['A', 'B']);
	});

	it('geeft de titel en negeert een markering die de tool niet kent', () => {
		const { titel, secties } = leesRichtlijn('# Handboek v2\n\n## 1. A [v2.0 nieuw]\n## 2. B [v2.0 vervallen]\n## 3. C');

		expect(titel).toBe('Handboek v2');
		expect(secties.map(({ titel: sectietitel, markering }) => [sectietitel, markering])).toEqual([
			['A', { versie: '2.0', soort: 'nieuw' }],
			['B', null],
			['C', null],
		]);
	});

	it('knipt de eigen tekst bij de eerste subparagraaf en laat een kop van niveau vier erbinnen', () => {
		const [een, subparagraaf] = leesRichtlijn('## 1. A\neigen\n#### Detail\nnog eigen\n### 1A. B\nsub\n---').secties;

		expect(een?.eigenMarkdown).toBe('eigen\n#### Detail\nnog eigen');
		expect(een?.markdown).toBe('eigen\n#### Detail\nnog eigen\n### 1A. B\nsub');
		expect(subparagraaf?.markdown).toBe('sub');
	});

	it('houdt een getal in de titel dat geen paragraafnummer is', () => {
		expect(leesRichtlijn('## 2026 begint').secties[0]).toMatchObject({ paragraaf: '', titel: '2026 begint' });
	});
});
