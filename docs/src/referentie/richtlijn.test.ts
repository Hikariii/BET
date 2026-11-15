import { describe, expect, it } from 'vitest';
import { leesRepobestand } from './bestanden.testhulp';
import { leesRichtlijn } from './richtlijn';

describe('leesRichtlijn op redactierichtlijn.md', () => {
	const tekst = leesRepobestand('richtlijn/redactierichtlijn.md');
	const secties = leesRichtlijn(tekst);
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

		expect(leesRichtlijn(tekst).map(({ paragraaf, titel, niveau }) => [paragraaf, titel, niveau])).toEqual([
			['3', 'Eén', 2],
			['3B', 'Twee', 3],
			['', 'Zonder nummer', 2],
		]);
	});

	it('beëindigt een sectie bij een kop van gelijk niveau en bij een kop van hoger niveau', () => {
		const tekst = ['## 1. A', 'a1', '### 1A. B', 'b1', '### 1B. C', 'c1', '## 2. D', 'd1'].join('\n');
		const [a, b, c, d] = leesRichtlijn(tekst);

		expect(a?.markdown).toBe('a1\n### 1A. B\nb1\n### 1B. C\nc1');
		expect(b?.markdown).toBe('b1');
		expect(c?.markdown).toBe('c1');
		expect(d?.markdown).toBe('d1');
	});

	it('laat een kop van niveau vier bij de inhoud horen', () => {
		const [sectie] = leesRichtlijn('## 1. A\n#### Detail\ntekst');

		expect(sectie?.markdown).toBe('#### Detail\ntekst');
	});

	it('beëindigt een sectie bij een kop van niveau een', () => {
		const [sectie] = leesRichtlijn('## 1. A\ntekst\n# Hoofdkop\nbuiten');

		expect(sectie?.markdown).toBe('tekst');
	});

	it('leest een kop in een codeblok niet als sectie', () => {
		const secties = leesRichtlijn('## 1. A\n```\n## 2. Niet echt\n```\nna');

		expect(secties.map(({ paragraaf }) => paragraaf)).toEqual(['1']);
		expect(secties[0]?.markdown).toBe('```\n## 2. Niet echt\n```\nna');
	});

	it('haalt de witregels voor en na de inhoud weg en behoudt die binnenin', () => {
		const [sectie] = leesRichtlijn('## 1. A\n\n\neen\n\ntwee\n\n\n## 2. B');

		expect(sectie?.markdown).toBe('een\n\ntwee');
	});

	it('geeft een kop zonder inhoud een lege markdown', () => {
		expect(leesRichtlijn('## 1. A\n## 2. B').map(({ markdown }) => markdown)).toEqual(['', '']);
	});

	it('leest een markering met vet en een markering zonder vet', () => {
		const titels = leesRichtlijn('## 5. A **[v1.4 gewijzigd]**\n## 6. [v1.4 nieuw] B').map(({ titel }) => titel);

		expect(titels).toEqual(['A', 'B']);
	});

	it('houdt een getal in de titel dat geen paragraafnummer is', () => {
		expect(leesRichtlijn('## 2026 begint')[0]).toMatchObject({ paragraaf: '', titel: '2026 begint' });
	});
});
