// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { createRef } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bewaarVers, leesTussenstand } from '../../bewerken/tussenstand';
import { maakBackup } from '../../bewaren/backup';
import { BOEK as BOEK_MET_HOOFDSTUKKEN, GeheugenOpslag, inhoud } from '../../bewaren/testhulp';
import type { BoekData } from '../../data/types';
import { BackupInladen } from './BackupInladen';

const BOEK: BoekData = {
	id: 'lukas',
	naam: 'Lukas',
	prefix: 'lukas',
	hoofdstukken: BOEK_MET_HOOFDSTUKKEN.hoofdstukken.map(({ nummer }) => ({ nummer, status: 'goedgekeurd', versie: 'v1.0', herkomst: '', opmerking: '' })),
	stijlen: [],
};

const NU = new Date('2026-11-16T14:32:00.000Z');

/** Een back-up met de verzen 1:1 en 1:2, als bestand dat de gebruiker kiest. */
function backupBestand(boekId = 'lukas'): File {
	const bron = new GeheugenOpslag();
	bewaarVers(bron, 'lukas', 1, 1, inhoud(' uit de back-up, vers een'), inhoud(' oud een'));
	bewaarVers(bron, 'lukas', 1, 2, inhoud(' uit de back-up, vers twee'), inhoud(' oud twee'));
	const backup = { ...maakBackup(bron, BOEK_MET_HOOFDSTUKKEN, 'abc1234', NU), boek: boekId };
	return new File([JSON.stringify(backup)], 'lukas.bet-bewaard.json', { type: 'application/json' });
}

function toonScherm() {
	const invoer = createRef<HTMLInputElement>();
	const focusNaSluiten = createRef<HTMLElement>();
	render(
		<>
			<button type="button" ref={focusNaSluiten}>
				Terug naar de pagina
			</button>
			<BackupInladen boek={BOEK} focusNaSluiten={focusNaSluiten} invoer={invoer} />
		</>,
	);
	const veld = invoer.current;
	if (veld === null) throw new Error('het bestandsveld is niet getekend');
	return { veld };
}

async function kiesBestand(veld: HTMLInputElement, bestand: File): Promise<void> {
	Object.defineProperty(veld, 'files', { value: [bestand], configurable: true });
	fireEvent.change(veld);
}

function vers(hoofdstuk: number, nummer: number) {
	return leesTussenstand(window.localStorage, 'lukas', hoofdstuk).verzen[nummer]?.inhoud;
}

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('BackupInladen', () => {
	it('toont na het kiezen van een bestand een voorbeeld met de drie knoppen en schrijft nog niets', async () => {
		bewaarVers(window.localStorage, 'lukas', 1, 2, inhoud(' lokaal, vers twee'), inhoud(' oud twee'));
		const { veld } = toonScherm();
		expect(screen.queryByRole('heading', { name: /back-up inladen/i })).toBeNull();

		await kiesBestand(veld, backupBestand());

		expect(await screen.findByText('lukas.bet-bewaard.json')).toBeTruthy();
		expect(await screen.findByRole('button', { name: /^samenvoegen/i })).toBeTruthy();
		expect(screen.getByRole('button', { name: /^vervangen/i })).toBeTruthy();
		expect(screen.getByRole('button', { name: /^annuleren/i })).toBe(document.activeElement);
		expect(vers(1, 1)).toBeUndefined();
		expect(vers(1, 2)).toEqual(inhoud(' lokaal, vers twee'));
	});

	it('voegt samen: het nieuwe vers komt erbij en het lokale vers blijft staan als het nieuwer is', async () => {
		const lokaal = new Date(NU.getTime() + 60_000);
		bewaarVers(window.localStorage, 'lukas', 1, 2, inhoud(' lokaal, vers twee'), inhoud(' oud twee'));
		const stand = leesTussenstand(window.localStorage, 'lukas', 1);
		const lokaalVers = stand.verzen[2];
		if (lokaalVers === undefined) throw new Error('lokaal vers ontbreekt');
		lokaalVers.bewaard = lokaal.toISOString();
		window.localStorage.setItem('bet-tussenstand/lukas/1', JSON.stringify(stand));
		const { veld } = toonScherm();
		await kiesBestand(veld, backupBestand());
		fireEvent.click(await screen.findByRole('button', { name: /^samenvoegen/i }));

		await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/^Klaar/));
		expect(vers(1, 1)).toEqual(inhoud(' uit de back-up, vers een'));
		expect(vers(1, 2)).toEqual(inhoud(' lokaal, vers twee'));
	});

	it('annuleert zonder iets te schrijven en geeft de focus terug aan de knop waarmee de gebruiker begon', async () => {
		const { veld } = toonScherm();
		await kiesBestand(veld, backupBestand());
		fireEvent.click(await screen.findByRole('button', { name: /^annuleren/i }));

		await waitFor(() => expect(screen.queryByRole('button', { name: /^samenvoegen/i })).toBeNull());
		expect(vers(1, 1)).toBeUndefined();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Terug naar de pagina' }));
	});

	it('weigert een back-up van een ander boek met de bestandsnaam en schrijft niets', async () => {
		const { veld } = toonScherm();
		await kiesBestand(veld, backupBestand('marcus'));

		const melding = await screen.findByRole('alert');
		expect(melding.textContent).toContain('lukas.bet-bewaard.json');
		expect(screen.queryByRole('button', { name: /^samenvoegen/i })).toBeNull();
		expect(vers(1, 1)).toBeUndefined();
	});
});
