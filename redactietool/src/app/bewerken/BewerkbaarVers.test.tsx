// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { leesTussenstand } from '../../bewerken/tussenstand';
import { repoHoofdstuk } from '../../bewaren/testhulp';
import type { BoekData } from '../../data/types';
import { groepeerPerVers } from '../groepeerPerVers';
import { BewerkbaarVers } from './BewerkbaarVers';

const BOEK: BoekData = { id: 'lukas', naam: 'Lukas', prefix: 'lukas', hoofdstukken: [], stijlen: [] };
const HOOFDSTUK = repoHoofdstuk(1, { 1: ' Eerste vers.', 2: ' Tweede vers.' });
const DELEN_VAN_VERS_1 = groepeerPerVers(HOOFDSTUK.bron, HOOFDSTUK.vereenvoudigd).find((groep) => groep.nummer === 1)?.vereenvoudigd ?? [];

function opgeslagenTekst(): string | null {
	const vers = leesTussenstand(window.localStorage, 'lukas', 1).verzen[1];
	return vers === undefined ? null : vers.inhoud.delen.map((deel) => deel.stukken.map((stuk) => stuk.tekst).join('')).join('\n');
}

/** Houdt de toestand die HoofdstukScherm voor een vers bijhoudt: of de editor open is en wat er bewaard staat. */
function VersMetToestand() {
	const [bewerken, zetBewerken] = useState(false);
	const [, zetTeller] = useState(0);
	const bewerkt = leesTussenstand(window.localStorage, 'lukas', 1).verzen[1] ?? null;
	return (
		<BewerkbaarVers
			boek={BOEK}
			hoofdstuk={HOOFDSTUK}
			nummer={1}
			delen={DELEN_VAN_VERS_1}
			bewerkt={bewerkt}
			bewerken={bewerken}
			onBewerk={() => zetBewerken(true)}
			onSluit={() => zetBewerken(false)}
			onOpslagGewijzigd={() => zetTeller((teller) => teller + 1)}
		/>
	);
}

function startBewerken(): HTMLElement {
	render(<VersMetToestand />);
	const tekst = document.querySelector<HTMLElement>('[data-help="vers-bewerken"]');
	if (tekst === null) throw new Error('de tekst van het vers is niet klikbaar');
	fireEvent.click(tekst);
	return screen.getByRole('textbox');
}

/**
 * Typt zoals een browser: de tekst in de DOM verandert, met de cursor aan het eind, en ProseMirror leest de verandering uit de DOM.
 * ProseMirror verwerkt gewone tekens niet via een toetsgebeurtenis.
 */
async function typ(editor: HTMLElement, tekst: string): Promise<void> {
	const tekstknoop = editor.querySelector('p')?.lastChild;
	if (!(tekstknoop instanceof Text)) throw new Error('de editor heeft geen tekst om achter te typen');
	window.getSelection()?.collapse(tekstknoop, tekstknoop.data.length);
	document.dispatchEvent(new Event('selectionchange'));
	tekstknoop.data += tekst;
	await waitFor(() => expect(opgeslagenTekst()).not.toBeNull());
}

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('BewerkbaarVers', () => {
	it('opent de editor met de tekst van het vers als de tekst wordt aangeklikt', () => {
		const editor = startBewerken();

		expect(editor.textContent).toBe(' Eerste vers.');
		expect(opgeslagenTekst()).toBeNull();
	});

	it('bewaart wat je typt, en toont dat het vers gewijzigd is', async () => {
		const editor = startBewerken();

		await typ(editor, ' Amen.');

		expect(editor.textContent).toBe(' Eerste vers. Amen.');
		expect(opgeslagenTekst()).toBe(' Eerste vers. Amen.');
		expect(document.querySelector('[data-help="vers-gewijzigd"]')).not.toBeNull();
	});

	it('sluit de editor met Escape en laat de bewaarde bewerking staan', async () => {
		const editor = startBewerken();
		await typ(editor, ' Amen.');

		fireEvent.keyDown(editor, { key: 'Escape' });

		await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
		expect(opgeslagenTekst()).toBe(' Eerste vers. Amen.');
		expect(document.querySelector('[data-help="vers-bewerken"]')).not.toBeNull();
	});

	it('laat Enter niets doen: het vers blijft één alinea', () => {
		const editor = startBewerken();

		fireEvent.keyDown(editor, { key: 'Enter' });

		expect(editor.querySelectorAll('p')).toHaveLength(1);
		expect(opgeslagenTekst()).toBeNull();
	});

	it('zet het vers terug op de repo met de knop onder het bewerkte vers', async () => {
		const editor = startBewerken();
		await typ(editor, ' Amen.');
		fireEvent.keyDown(editor, { key: 'Escape' });
		await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
		const terugzetten = document.querySelector<HTMLElement>('[data-help="terug-naar-de-repo"]');
		expect(terugzetten).not.toBeNull();
		if (terugzetten === null) return;

		fireEvent.click(terugzetten);

		expect(opgeslagenTekst()).toBeNull();
		expect(document.querySelector('[data-help="terug-naar-de-repo"]')).toBeNull();
		expect(document.querySelector('[data-help="vers-gewijzigd"]')).toBeNull();
	});
});
