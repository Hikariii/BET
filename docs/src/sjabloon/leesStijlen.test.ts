import { describe, expect, it } from 'vitest';
import type { WordStijl } from '../data/types';
import { leesStijlen } from './leesStijlen';
import { leesStylesXmlVanSjabloon } from './sjabloon.testhulp';

function stijlenUitSjabloon(): Map<string, WordStijl> {
	return new Map(leesStijlen(leesStylesXmlVanSjabloon()).map((stijl) => [stijl.id, stijl]));
}

function stijlXml(attributen: string, inhoud: string): string {
	return `<w:styles><w:style ${attributen}>${inhoud}</w:style></w:styles>`;
}

describe('leesStijlen op het Word-sjabloon van Lukas', () => {
	const stijlen = stijlenUitSjabloon();

	it('geeft de stijlen die de tool nodig heeft, met weergavenaam, kleur en opmaak', () => {
		expect(stijlen.get('Jezuswoorden')).toEqual({
			id: 'Jezuswoorden',
			naam: 'Jezus_woorden',
			soort: 'alinea',
			kleur: 'FF0000',
			vet: false,
			cursief: false,
		});
		expect(stijlen.get('eeuwigleven')).toEqual({
			id: 'eeuwigleven',
			naam: 'eeuwig leven',
			soort: 'teken',
			kleur: '00B0F0',
			vet: true,
			cursief: true,
		});
		expect(stijlen.get('citaatOT')).toEqual({
			id: 'citaatOT',
			naam: 'citaat OT',
			soort: 'alinea',
			kleur: '002060',
			vet: false,
			cursief: true,
		});
		expect(stijlen.get('GodsStem')).toMatchObject({ naam: 'Gods Stem', vet: true, cursief: true });
		expect(stijlen.get('Bblhfdstk')).toMatchObject({ soort: 'teken', kleur: '7F7F7F' });
	});

	it('neemt alleen alinea- en tekenstijlen mee, geen tabel- of lijststijlen', () => {
		const soorten = new Set([...stijlen.values()].map((stijl) => stijl.soort));
		expect(soorten).toEqual(new Set(['alinea', 'teken']));
		expect(stijlen.has('Standaardtabel')).toBe(false);
	});

	it('geeft een stijl zonder eigen tekenkleur kleur null, ook als de alinearand een kleur heeft', () => {
		expect(stijlen.get('Jezuswoorden')?.kleur).toBe('FF0000');
		expect(stijlen.get('Standaard')).toMatchObject({ kleur: null, vet: false });
	});
});

describe('leesStijlen op losse XML', () => {
	it.each([
		['<w:b/>', true],
		['<w:b w:val="1"/>', true],
		['<w:b w:val="true"/>', true],
		['<w:b w:val="on"/>', true],
		['<w:b w:val="0"/>', false],
		['<w:b w:val="false"/>', false],
		['<w:bCs/>', false],
		['', false],
	])('leest vet uit %s als %s', (element, verwacht) => {
		const [stijl] = leesStijlen(
			stijlXml('w:type="character" w:styleId="x"', `<w:name w:val="x"/><w:rPr>${element}</w:rPr>`),
		);
		expect(stijl?.vet).toBe(verwacht);
	});

	it('leest cursief met w:val net als vet', () => {
		const uit = stijlXml('w:type="character" w:styleId="x"', '<w:rPr><w:i w:val="0"/></w:rPr>');
		const aan = stijlXml('w:type="character" w:styleId="x"', '<w:rPr><w:i w:val="true"/></w:rPr>');
		expect(leesStijlen(uit)[0]?.cursief).toBe(false);
		expect(leesStijlen(aan)[0]?.cursief).toBe(true);
	});

	it('negeert de opmaak van het alineateken in w:pPr', () => {
		const [stijl] = leesStijlen(
			stijlXml(
				'w:type="paragraph" w:styleId="x"',
				'<w:pPr><w:rPr><w:b/><w:color w:val="112233"/></w:rPr></w:pPr><w:rPr><w:i/></w:rPr>',
			),
		);
		expect(stijl).toMatchObject({ vet: false, cursief: true, kleur: null });
	});

	it('leest de kleur ook als w:val niet het eerste attribuut is en geeft auto als null', () => {
		const met = stijlXml('w:type="character" w:styleId="x"', '<w:rPr><w:color w:themeColor="text1" w:val="7f7f7f"/></w:rPr>');
		const auto = stijlXml('w:type="character" w:styleId="x"', '<w:rPr><w:color w:val="auto"/></w:rPr>');
		expect(leesStijlen(met)[0]?.kleur).toBe('7F7F7F');
		expect(leesStijlen(auto)[0]?.kleur).toBeNull();
	});

	it('zet XML-tekens in de weergavenaam om en valt terug op het styleId zonder naam', () => {
		const xml =
			stijlXml('w:type="paragraph" w:styleId="a"', '<w:name w:val="Tom &amp; &quot;Jerry&quot; &#233;"/>') +
			stijlXml('w:type="paragraph" w:styleId="b"', '');
		expect(leesStijlen(xml).map((stijl) => stijl.naam)).toEqual(['Tom & "Jerry" é', 'b']);
	});

	it('slaat tabel-, nummering- en stijlen zonder styleId over', () => {
		const xml =
			stijlXml('w:type="table" w:styleId="t"', '<w:name w:val="t"/>') +
			stijlXml('w:type="numbering" w:styleId="n"', '<w:name w:val="n"/>') +
			stijlXml('w:type="paragraph"', '<w:name w:val="zonder"/>');
		expect(leesStijlen(xml)).toEqual([]);
	});
});
