import { describe, expect, it } from 'vitest';
import { leesRepobestand } from './bestanden.testhulp';
import { leesStatus } from './status';

const KOP = '| Hoofdstuk | Bron | Status | Versie | Herkomst | Opmerking |\n| --- | --- | --- | --- | --- | --- |';

describe('leesStatus op STATUS.md van Lukas', () => {
	const hoofdstukken = leesStatus(leesRepobestand('bijbel/lukas/STATUS.md'));

	it('geeft de hoofdstukken 1 tot en met 24 in volgorde', () => {
		expect(hoofdstukken.map(({ nummer }) => nummer)).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
	});

	it('geeft Lukas 1 als goedgekeurd met versie en herkomst', () => {
		expect(hoofdstukken[0]).toMatchObject({
			nummer: 1,
			status: 'goedgekeurd',
			versie: 'v1.0',
			herkomst: "aangeleverd (datum onbekend): `origineel/Lukas Jezus' woorden en highlights hoofdstuk 1 - eenvoudiger 0.9.docx`",
		});
	});

	it('geeft Lukas 4 in review met een lege versie', () => {
		expect(hoofdstukken[3]).toEqual({
			nummer: 4,
			status: 'review',
			versie: '',
			herkomst: '',
			opmerking: '41/44 verzen gewijzigd; onafhankelijke controle verwerkt; 10 vragen; export/lukas-04-review.docx',
		});
	});
});

describe('leesStatus op kleine invoer', () => {
	it('maakt van de status - de status nog niet begonnen', () => {
		expect(leesStatus(`${KOP}\n| Lukas 7 | ✓ | - | | | |`)).toEqual([
			{ nummer: 7, status: 'nog niet begonnen', versie: '', herkomst: '', opmerking: '' },
		]);
	});

	it('kent alle statussen uit het plan', () => {
		const statussen = ['concept', 'review', 'bij editor', 'verwerkt', 'goedgekeurd'];
		const regels = statussen.map((status, index) => `| Lukas ${index + 1} | ✓ | ${status} | | | |`).join('\n');

		expect(leesStatus(`${KOP}\n${regels}`).map(({ status }) => status)).toEqual(statussen);
	});

	it('meldt een onbekende status met het regelnummer', () => {
		expect(() => leesStatus(`Tekst\n\n${KOP}\n| Lukas 1 | ✓ | goedgekeurd | | | |\n| Lukas 2 | ✓ | klaar | | | |`)).toThrowError(
			"regel 6: onbekende status 'klaar'",
		);
	});

	it('weigert de naam van een status die alleen in de tool bestaat', () => {
		expect(() => leesStatus(`${KOP}\n| Lukas 1 | ✓ | nog niet begonnen | | | |`)).toThrowError("regel 3: onbekende status 'nog niet begonnen'");
	});

	it('meldt een hoofdstuk zonder nummer met het regelnummer', () => {
		expect(() => leesStatus(`${KOP}\n| Lukas | ✓ | concept | | | |`)).toThrowError("regel 3: hoofdstuk 'Lukas' heeft geen nummer");
	});

	it('neemt het laatste getal van de hoofdstukcel, ook als de boeknaam een getal en een spatie heeft', () => {
		expect(leesStatus(`${KOP}\n| 1 Korintiërs 3 | ✓ | concept | | | |`).map(({ nummer }) => nummer)).toEqual([3]);
	});

	it('meldt een boeknaam met een getal maar zonder hoofdstuknummer', () => {
		expect(() => leesStatus(`${KOP}\n| 1 Johannes | ✓ | concept | | | |`)).toThrowError("regel 3: hoofdstuk '1 Johannes' heeft geen nummer");
	});

	it('meldt een bestand zonder tabel', () => {
		expect(() => leesStatus('Geen tabel.')).toThrowError('regel 1: geen tabel gevonden');
	});
});
