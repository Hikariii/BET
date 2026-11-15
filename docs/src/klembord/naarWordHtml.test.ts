import { describe, expect, it } from 'vitest';
import type { WordStijl } from '../data/types';
import { parseerHoofdstuk } from '../formaat/parseer';
import { vulKopieerGebeurtenis, maakKlembordInhoud, type KopieerGebeurtenis } from './kopieer';
import { naarPlatteTekst, naarWordHtml } from './naarWordHtml';
import { stijlenUitSjabloon } from './prototype.testhulp';

const stijlen = stijlenUitSjabloon();

function html(...bestandsteksten: string[]): string {
	return naarWordHtml(bestandsteksten.map(parseerHoofdstuk), stijlen);
}

function lichaam(uitvoer: string): string {
	return uitvoer.split('<!--StartFragment-->')[1]!.split('<!--EndFragment-->')[0]!;
}

describe('naarWordHtml', () => {
	it('zet de titel inline voor de eerste alinea zonder stijl, met de lege regels ertussen weg', () => {
		const uitvoer = lichaam(html('# Lukas 1\n\n[1] Begin.\n'));
		expect(uitvoer).toBe('<p class="MsoNormal"><span class="Bblhfdstk">Lukas 1</span> <sup>1</sup> Begin.</p>');
	});

	it('houdt de titel apart als de eerste alinea een alineastijl heeft', () => {
		const uitvoer = lichaam(html('# Lukas 1\n@jezus [1] Kom.\n'));
		expect(uitvoer).toBe(
			'<p class="MsoNormal"><span class="Bblhfdstk">Lukas 1</span></p><p class="Jezuswoorden"><sup>1</sup> Kom.</p>',
		);
	});

	it('maakt van één lege regel een lege alinea en van twee een sectiescheiding met rand', () => {
		const eenLeeg = lichaam(html('# Lukas 1\n@jezus A\n\n@jezus B\n'));
		const tweeLeeg = lichaam(html('# Lukas 1\n@jezus A\n\n\n@jezus B\n'));
		expect(eenLeeg).toContain('A</p><p class="MsoNormal">&nbsp;</p><p class="Jezuswoorden">B');
		expect(eenLeeg).not.toContain('border-top');
		expect(tweeLeeg).toContain(
			'A</p><p class="MsoNormal">&nbsp;</p><p class="MsoNormal" style="border-top:solid windowtext 1.0pt;padding-top:1.0pt">&nbsp;</p><p class="Jezuswoorden">B',
		);
	});

	it('stapelt de opmaak van buiten naar binnen als highlight, onderwijs, onderstreept, vet, cursief, domein', () => {
		const uitvoer = lichaam(
			html('# Lukas 1\n@god {onderwijs}=={onderstreept}{vet}{cursief}{genade}y{/genade}{/cursief}{/vet}{/onderstreept}=={/onderwijs}\n'),
		);
		expect(uitvoer).toContain(
			'<span style="background:yellow;mso-highlight:yellow"><span style="color:#FF0000"><u><b><i><span class="genade">y</span></i></b></u></span></span>',
		);
	});

	it('escapet &, < en > in de tekst en laat aanhalingstekens staan', () => {
		const uitvoer = lichaam(html('# Lukas 1\n@jezus Tom & <Jerry> "zei" \'s\n'));
		expect(uitvoer).toContain('Tom &amp; &lt;Jerry&gt; "zei" \'s');
	});

	it('zet één lege alinea tussen hoofdstukken, en geen tweede als het vorige op een lege regel eindigt', () => {
		const gewoon = lichaam(html('# Lukas 1\n@jezus A\n', '# Lukas 2\n@jezus B\n'));
		const metLegeRegel = lichaam(html('# Lukas 1\n@jezus A\n\n', '# Lukas 2\n@jezus B\n'));
		expect(gewoon).toContain('A</p><p class="MsoNormal">&nbsp;</p><p class="MsoNormal"><span class="Bblhfdstk">Lukas 2</span></p>');
		expect(metLegeRegel.match(/&nbsp;/g)).toHaveLength(1);
	});

	it('zet de weergavenaam uit het sjabloon als mso-style-name in het stijlblok', () => {
		const uitvoer = html('# Lukas 1\n@jezus A\n');
		expect(uitvoer).toContain('p.Jezuswoorden, li.Jezuswoorden, div.Jezuswoorden {mso-style-name:"Jezus_woorden";');
		expect(uitvoer).toContain('span.eeuwigleven {mso-style-name:"eeuwig leven";');
		expect(uitvoer).toContain('<meta name="ProgId" content="Word.Document">');
	});

	it('gooit een fout als een stijl uit het formaat niet in het sjabloon staat', () => {
		const zonderGods: WordStijl[] = stijlen.filter((stijl) => stijl.id !== 'GodsStem');
		expect(() => naarWordHtml([parseerHoofdstuk('# Lukas 1\n@jezus A\n')], zonderGods)).toThrow('GodsStem');
	});
});

describe('naarPlatteTekst', () => {
	it('geeft één regel per alinea met versnummers als cijfers en lege regels als lege regels', () => {
		const hoofdstuk = parseerHoofdstuk('# Lukas 1\n\n[1] Begin {vet}nu{/vet}.\n@jezus [2] Kom.\n\n\n@god Stem\n');
		expect(naarPlatteTekst([hoofdstuk])).toBe('Lukas 1\n\n1 Begin nu.\n2 Kom.\n\n\nStem');
	});
});

describe('vulKopieerGebeurtenis', () => {
	function gebeurtenis(): { gebeurtenis: KopieerGebeurtenis; gezet: Map<string, string>; standaardGestopt: () => boolean } {
		const gezet = new Map<string, string>();
		let gestopt = false;
		return {
			gebeurtenis: {
				clipboardData: { setData: (formaat, gegevens) => void gezet.set(formaat, gegevens) },
				preventDefault: () => {
					gestopt = true;
				},
			},
			gezet,
			standaardGestopt: () => gestopt,
		};
	}

	it('zet text/html en text/plain en stopt de standaardkopie', () => {
		const { gebeurtenis: gebeurtenisMetKlembord, gezet, standaardGestopt } = gebeurtenis();
		expect(gezet.size).toBe(0);
		expect(standaardGestopt()).toBe(false);

		vulKopieerGebeurtenis(
			gebeurtenisMetKlembord,
			maakKlembordInhoud([parseerHoofdstuk('# Lukas 1\n@jezus [1] Kom.\n')], stijlen),
		);

		expect(gezet.get('text/html')).toContain('class="Jezuswoorden"');
		expect(gezet.get('text/plain')).toBe('Lukas 1\n1 Kom.');
		expect(standaardGestopt()).toBe(true);
	});

	it('gooit een fout zonder clipboardData', () => {
		expect(() =>
			vulKopieerGebeurtenis({ clipboardData: null, preventDefault: () => undefined }, { html: '', tekst: '' }),
		).toThrow('clipboardData');
	});
});
