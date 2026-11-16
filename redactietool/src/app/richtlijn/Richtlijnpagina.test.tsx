// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Richtlijn } from '../../data/types';
import { bewaarRichtlijnReactie, leesRichtlijnReacties, type RichtlijnReactie } from '../../reacties/richtlijnReacties';
import { Richtlijnpagina } from './Richtlijnpagina';

const RICHTLIJN: Richtlijn = {
	titel: 'Redactierichtlijn v9.9 (proef)',
	secties: [
		{ paragraaf: '', titel: 'Over deze versie', markering: null, niveau: 2, markdown: 'Dit is de proefversie.', eigenMarkdown: 'Dit is de proefversie.' },
		{ paragraaf: '1', titel: 'Werk vanuit de bron', markering: null, niveau: 2, markdown: 'Altijd de bron.\n\n### 1A. Detail\n\nHet detail.', eigenMarkdown: 'Altijd de bron.' },
		{ paragraaf: '1A', titel: 'Detail', markering: { versie: '9.9', soort: 'open' }, niveau: 3, markdown: 'Het detail.', eigenMarkdown: 'Het detail.' },
		{ paragraaf: '2', titel: 'Namen', markering: { versie: '9.9', soort: 'nieuw' }, niveau: 2, markdown: 'Namen houden hun spelling.', eigenMarkdown: 'Namen houden hun spelling.' },
		{ paragraaf: '3', titel: 'Typografie', markering: { versie: '9.9', soort: 'gewijzigd' }, niveau: 2, markdown: 'Aanhalingstekens.', eigenMarkdown: 'Aanhalingstekens.' },
		{ paragraaf: '', titel: 'Bijlage: wat nog moet gebeuren', markering: null, niveau: 2, markdown: 'Nog te doen.', eigenMarkdown: 'Nog te doen.' },
	],
};

vi.mock('../gegevens', () => ({ laadRichtlijn: () => Promise.resolve(RICHTLIJN) }));

const OP_PARAGRAAF_1: RichtlijnReactie = { id: '§1', paragraaf: '1', titel: 'Werk vanuit de bron', tekst: 'Mooi zo.', voorstel: false, gegeven: '2026-11-16T10:00:00.000Z' };

async function toon(paragraaf: string | null = null) {
	render(<Richtlijnpagina boek="lukas" paragraaf={paragraaf} />);
	await screen.findByRole('heading', { level: 1, name: RICHTLIJN.titel });
}

function inhoud(): HTMLElement {
	return screen.getByRole('navigation', { name: 'Inhoud' });
}

function sectie(naam: string): HTMLElement {
	const kop = screen.getByRole('heading', { name: new RegExp(`^${naam}`) });
	const huis = kop.closest('section');
	if (huis === null) throw new Error(`De kop ${naam} staat niet in een sectie.`);
	return huis;
}

function bewaard(): RichtlijnReactie[] {
	return leesRichtlijnReacties(window.localStorage);
}

beforeEach(() => {
	window.localStorage.clear();
	Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe('de pagina Richtlijn', () => {
	it('toont de titel, de tekst over deze versie, de inhoud met markeringen en alle secties', async () => {
		await toon();

		expect(screen.getByText('Dit is de proefversie.')).toBeTruthy();
		const lijst = within(inhoud());
		expect(lijst.getByRole('link', { name: '§1 Werk vanuit de bron' }).getAttribute('href')).toBe('#/lukas/richtlijn/1');
		expect(within(lijst.getByRole('link', { name: '§1A Detail' }).closest('li') ?? document.body).getByText('open in v9.9')).toBeTruthy();
		expect(within(lijst.getByRole('link', { name: '§2 Namen' }).closest('li') ?? document.body).getByText('nieuw in v9.9')).toBeTruthy();
		expect(within(lijst.getByRole('link', { name: '§3 Typografie' }).closest('li') ?? document.body).getByText('gewijzigd in v9.9')).toBeTruthy();
		expect(lijst.queryByRole('link', { name: 'Over deze versie' })).toBeNull();
		expect(screen.getByText('Altijd de bron.')).toBeTruthy();
		expect(screen.getByText('Het detail.')).toBeTruthy();
		expect(screen.getAllByText('Het detail.')).toHaveLength(1);
		expect(screen.getByText('Nog te doen.')).toBeTruthy();
	});

	it('geeft de paragraaf uit het adres de focus en scrolt ernaartoe', async () => {
		await toon('2');

		await waitFor(() => expect(document.activeElement?.id).toBe('richtlijn-2'));
		expect(document.activeElement?.textContent).toContain('§2 Namen');
		expect(Element.prototype.scrollIntoView).toHaveBeenCalledOnce();
	});

	it('meldt een paragraaf die niet in de richtlijn staat en scrolt niet', async () => {
		await toon('99');

		expect(screen.getByRole('alert').textContent).toBe('§99 staat niet in de richtlijn.');
		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
	});

	it('bewaart een reactie op een paragraaf onder het id van die paragraaf en zet het label gereageerd in de inhoud', async () => {
		await toon();
		expect(within(inhoud()).queryByText('gereageerd')).toBeNull();

		const vak = sectie('§2 Namen');
		fireEvent.click(within(vak).getByRole('button', { name: 'Reageren op §2 Namen' }));
		fireEvent.input(within(vak).getByLabelText('Je reactie voor Claude'), { target: { value: 'Ook bijnamen.' } });
		fireEvent.click(within(vak).getByRole('button', { name: 'Opslaan' }));

		expect(bewaard()).toMatchObject([{ id: '§2', paragraaf: '2', titel: 'Namen', tekst: 'Ook bijnamen.', voorstel: false }]);
		expect(within(inhoud()).getByText('gereageerd')).toBeTruthy();
		expect(within(inhoud()).queryByText('voorstel')).toBeNull();
	});

	it('toont de uitleg bij het vinkje en zet bij een voorstel het label voorstel in de inhoud, ook zonder tekst', async () => {
		await toon();
		const vak = sectie('§3 Typografie');

		fireEvent.click(within(vak).getByRole('button', { name: 'Reageren op §3 Typografie' }));
		expect(within(vak).getByText('Claude schrijft een voorstel voor de richtlijn; de eigenaar beslist.')).toBeTruthy();
		fireEvent.click(within(vak).getByLabelText('Voorstel voor een nieuwe of andere regel'));
		fireEvent.click(within(vak).getByRole('button', { name: 'Opslaan' }));

		expect(bewaard()).toMatchObject([{ id: '§3', tekst: '', voorstel: true }]);
		expect(within(inhoud()).getByText('voorstel')).toBeTruthy();
	});

	it('toont een bestaande reactie en haalt hem weg met Weghalen', async () => {
		bewaarRichtlijnReactie(window.localStorage, OP_PARAGRAAF_1);
		await toon();
		const vak = sectie('§1 Werk vanuit de bron');
		expect(within(vak).getByText('Mooi zo.')).toBeTruthy();
		expect(within(inhoud()).getByText('gereageerd')).toBeTruthy();

		fireEvent.click(within(vak).getByRole('button', { name: 'Reageren op §1 Werk vanuit de bron' }));
		fireEvent.click(within(vak).getByRole('button', { name: 'Weghalen' }));

		expect(bewaard()).toEqual([]);
		expect(within(inhoud()).queryByText('gereageerd')).toBeNull();
	});

	it('heeft geen vak Reageren bij de tekst over deze versie en bij een kop zonder nummer', async () => {
		await toon();

		expect(within(sectie('Over deze versie')).queryByRole('button', { name: /Reageren/ })).toBeNull();
		expect(within(sectie('Bijlage')).queryByRole('button', { name: /Reageren/ })).toBeNull();
	});
});

describe('Nieuwe regel voorstellen', () => {
	function nieuweRegel(): HTMLElement {
		return sectie('Nieuwe regel voorstellen');
	}

	function dien(tekst: string): void {
		fireEvent.input(within(nieuweRegel()).getByLabelText('Je voorstel voor een nieuwe regel'), { target: { value: tekst } });
		fireEvent.click(within(nieuweRegel()).getByRole('button', { name: 'Voorstel opslaan' }));
	}

	it('maakt bij elk voorstel een nieuwe reactie zonder paragraaf, met een eigen id, en leegt het veld', async () => {
		await toon();

		dien('Eerste voorstel.');
		dien('Tweede voorstel.');

		const voorstellen = bewaard();
		expect(voorstellen).toMatchObject([
			{ paragraaf: null, titel: '', tekst: 'Eerste voorstel.', voorstel: true },
			{ paragraaf: null, titel: '', tekst: 'Tweede voorstel.', voorstel: true },
		]);
		expect(new Set(voorstellen.map((voorstel) => voorstel.id)).size).toBe(2);
		expect(voorstellen.every((voorstel) => voorstel.id.startsWith('nieuw-'))).toBe(true);
		expect((within(nieuweRegel()).getByLabelText('Je voorstel voor een nieuwe regel') as HTMLTextAreaElement).value).toBe('');
		expect(within(nieuweRegel()).getByText('Eerste voorstel.')).toBeTruthy();
		expect(within(nieuweRegel()).getByText('Tweede voorstel.')).toBeTruthy();
		expect(within(inhoud()).getByText('2 voorstellen')).toBeTruthy();
	});

	it('bewaart niets bij een leeg voorstel en zegt wat er mist', async () => {
		await toon();

		dien('   ');

		expect(bewaard()).toEqual([]);
		expect(within(nieuweRegel()).getByRole('alert').textContent).toBe('Schrijf je voorstel.');
	});

	it('past een eerder voorstel aan en haalt een ander weg', async () => {
		await toon();
		dien('Eerste voorstel.');
		dien('Tweede voorstel.');
		const [eerste] = bewaard();

		fireEvent.click(within(nieuweRegel()).getAllByRole('button', { name: /aanpassen$/ })[0] as HTMLElement);
		fireEvent.input(within(nieuweRegel()).getByLabelText('Je voorstel'), { target: { value: 'Eerste voorstel, beter.' } });
		fireEvent.click(within(nieuweRegel()).getByRole('button', { name: 'Opslaan' }));

		expect(bewaard().map((voorstel) => [voorstel.id, voorstel.tekst])).toEqual([
			[bewaard()[0]?.id, 'Tweede voorstel.'],
			[eerste?.id, 'Eerste voorstel, beter.'],
		]);

		fireEvent.click(within(nieuweRegel()).getAllByRole('button', { name: /weghalen$/ })[0] as HTMLElement);

		expect(bewaard().map((voorstel) => voorstel.tekst)).toEqual(['Eerste voorstel, beter.']);
		expect(within(nieuweRegel()).queryByText('Tweede voorstel.')).toBeNull();
	});

	it('weigert een aangepast voorstel zonder tekst en laat het staan', async () => {
		await toon();
		dien('Eerste voorstel.');

		fireEvent.click(within(nieuweRegel()).getByRole('button', { name: /aanpassen$/ }));
		fireEvent.input(within(nieuweRegel()).getByLabelText('Je voorstel'), { target: { value: '' } });
		fireEvent.click(within(nieuweRegel()).getByRole('button', { name: 'Opslaan' }));

		expect(bewaard()).toMatchObject([{ tekst: 'Eerste voorstel.' }]);
		expect(within(nieuweRegel()).getByRole('alert').textContent).toBe('Schrijf je voorstel, of kies Weghalen.');
	});

	it('laat Annuleren een aanpassing verwerpen', async () => {
		await toon();
		dien('Eerste voorstel.');

		fireEvent.click(within(nieuweRegel()).getByRole('button', { name: /aanpassen$/ }));
		fireEvent.input(within(nieuweRegel()).getByLabelText('Je voorstel'), { target: { value: 'Weggooien.' } });
		fireEvent.click(within(nieuweRegel()).getByRole('button', { name: 'Annuleren' }));

		expect(bewaard()).toMatchObject([{ tekst: 'Eerste voorstel.' }]);
		expect(within(nieuweRegel()).getByText('Eerste voorstel.')).toBeTruthy();
	});
});
