import type { RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
	leesBackup,
	pasBackupToe,
	voorbeeldInladen,
	type Backup,
	type InlaadModus,
	type InlaadUitkomst,
	type InlaadVoorbeeld,
} from '../../bewaren/backup';
import type { BoekData } from '../../data/types';
import { browseropslag, ruweBrowseropslag } from '../bewerken/useTussenstand';
import { meervoud, tijdVan } from './bewaarTekst';
import './bewaren.css';

type Toestand =
	| { soort: 'fout'; bestandsnaam: string; melding: string }
	| { soort: 'voorbeeld'; bestandsnaam: string; backup: Backup; voorbeeld: InlaadVoorbeeld }
	| { soort: 'klaar'; modus: InlaadModus; uitkomst: InlaadUitkomst };

type Props = {
	boek: BoekData;
	/** De knop of link waar de gebruiker mee begon; krijgt de focus terug als het venster sluit. */
	focusNaSluiten: RefObject<HTMLElement | null>;
	/** Het verborgen bestandsveld; de knop "Back-up inladen" klikt erop (`invoer.current?.click()`). */
	invoer: RefObject<HTMLInputElement | null>;
};

const VERSOORTEN: Record<InlaadVoorbeeld['verzen'][number]['soort'], string> = {
	nieuw: 'nieuw',
	overschrijft: 'back-up nieuwer',
	'jouwe-blijft': 'jouw versie nieuwer',
	gelijk: 'gelijk',
};

function versPerHoofdstuk(voorbeeld: InlaadVoorbeeld): { hoofdstuk: number; verzen: InlaadVoorbeeld['verzen'] }[] {
	const groepen = new Map<number, InlaadVoorbeeld['verzen']>();
	for (const vers of voorbeeld.verzen) groepen.set(vers.hoofdstuk, [...(groepen.get(vers.hoofdstuk) ?? []), vers]);
	return [...groepen].map(([hoofdstuk, verzen]) => ({ hoofdstuk, verzen }));
}

/**
 * Het bestandsveld en het venster voor "Back-up inladen": bestand kiezen, voorbeeld bekijken, samenvoegen, vervangen of annuleren.
 * Het venster is een modale `<dialog>`: de browser houdt de focus erin en sluit het met Escape.
 */
export function BackupInladen({ boek, focusNaSluiten, invoer }: Props) {
	const [toestand, zetToestand] = useState<Toestand | null>(null);
	const venster = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialoog = venster.current;
		if (dialoog === null) return;
		if (toestand !== null && !dialoog.open) dialoog.showModal();
		// De veilige knop krijgt de focus: in het voorbeeld zou één Enter anders meteen samenvoegen en werk overschrijven.
		if (toestand !== null) (dialoog.querySelector<HTMLElement>('[data-beginfocus]') ?? dialoog.querySelector('button'))?.focus();
	}, [toestand?.soort]);

	const leesGekozenBestand = async (gebeurtenis: Event) => {
		const veld = gebeurtenis.currentTarget as HTMLInputElement;
		const bestand = veld.files?.[0];
		veld.value = '';
		if (bestand === undefined) return;
		const uitkomst = leesBackup(await bestand.text(), boek.id);
		if (!uitkomst.gelukt) {
			zetToestand({ soort: 'fout', bestandsnaam: bestand.name, melding: uitkomst.melding });
			return;
		}
		zetToestand({
			soort: 'voorbeeld',
			bestandsnaam: bestand.name,
			backup: uitkomst.backup,
			voorbeeld: voorbeeldInladen(ruweBrowseropslag(), boek, uitkomst.backup),
		});
	};

	const sluit = () => {
		zetToestand(null);
		focusNaSluiten.current?.focus();
	};

	const laatIn = (backup: Backup, modus: InlaadModus) =>
		zetToestand({ soort: 'klaar', modus, uitkomst: pasBackupToe(browseropslag(), boek, backup, modus) });

	return (
		<>
			<input ref={invoer} type="file" accept=".json,application/json" class="bewaren-bestandsveld" tabIndex={-1} aria-hidden="true" onChange={leesGekozenBestand} />
			<dialog ref={venster} class="bewaren-venster" aria-labelledby="backup-inladen-titel" onClose={sluit}>
				{toestand !== null && (
					<div class="bewaren-venster-inhoud">
						<h2 id="backup-inladen-titel">Back-up inladen</h2>
						{toestand.soort === 'fout' && <Geweigerd toestand={toestand} onSluit={() => venster.current?.close()} />}
						{toestand.soort === 'voorbeeld' && (
							<Voorbeeld toestand={toestand} onKies={(modus) => laatIn(toestand.backup, modus)} onAnnuleer={() => venster.current?.close()} />
						)}
						{toestand.soort === 'klaar' && <Klaar toestand={toestand} onSluit={() => venster.current?.close()} />}
					</div>
				)}
			</dialog>
		</>
	);
}

function Geweigerd({ toestand, onSluit }: { toestand: Extract<Toestand, { soort: 'fout' }>; onSluit: () => void }) {
	return (
		<>
			<p role="alert">
				<strong>{toestand.bestandsnaam}</strong> kan niet worden ingeladen. {toestand.melding}
			</p>
			<p class="bewaren-venster-knoppen">
				<button type="button" onClick={onSluit}>
					Sluiten
				</button>
			</p>
		</>
	);
}

type VoorbeeldProps = { toestand: Extract<Toestand, { soort: 'voorbeeld' }>; onKies: (modus: InlaadModus) => void; onAnnuleer: () => void };

function Voorbeeld({ toestand, onKies, onAnnuleer }: VoorbeeldProps) {
	const { backup, voorbeeld } = toestand;
	const { telling, vervangenWist } = voorbeeld;
	return (
		<>
			<p>
				<strong>{toestand.bestandsnaam}</strong>, gemaakt op {tijdVan(backup.gemaakt)}
				{backup.repoCommit !== null && <>, versie van de teksten {backup.repoCommit.slice(0, 7)}</>}.
			</p>
			<ul class="bewaren-voorbeeld-telling">
				<li>{meervoud(telling.nieuw, 'vers komt', 'verzen komen')} erbij.</li>
				<li>
					{meervoud(telling.overschrijft + telling.jouweBlijft, 'vers staat', 'verzen staan')} in beide met een andere tekst; bij samenvoegen blijft
					de nieuwste staan: {telling.jouweBlijft} keer jouw versie, {telling.overschrijft} keer die uit de back-up.
				</li>
				<li>{meervoud(telling.gelijk, 'vers is', 'verzen zijn')} al gelijk.</li>
				<li>{meervoud(telling.keuzesNieuw, 'keuze komt', 'keuzes komen')} erbij.</li>
				<li>{meervoud(telling.antwoordenNieuw, 'antwoord komt', 'antwoorden komen')} erbij.</li>
			</ul>
			{voorbeeld.verzen.length > 0 && (
				<details class="bewaren-voorbeeld-verzen">
					<summary>Welke verzen</summary>
					<ul>
						{versPerHoofdstuk(voorbeeld).map(({ hoofdstuk, verzen }) => (
							<li>
								Hoofdstuk {hoofdstuk}: {verzen.map((vers) => `vers ${vers.vers} (${VERSOORTEN[vers.soort]})`).join(', ')}
							</li>
						))}
					</ul>
				</details>
			)}
			<p class="bewaren-venster-uitleg">
				<strong>Samenvoegen</strong> houdt alles wat je nu hebt en zet de back-up erbij; staat een vers in beide, dan blijft de nieuwste versie staan.{' '}
				<strong>Vervangen</strong> wist eerst alles wat deze browser van het boek bewaart
				{vervangenWist.verzen + vervangenWist.keuzes + vervangenWist.antwoorden > 0 &&
					`, dus ook ${meervoud(vervangenWist.verzen, 'vers', 'verzen')}, ${meervoud(vervangenWist.keuzes, 'keuze', 'keuzes')} en ${meervoud(vervangenWist.antwoorden, 'antwoord', 'antwoorden')} die niet in de back-up staan`}
				.
			</p>
			<p class="bewaren-venster-knoppen">
				<button type="button" class="bewaren-hoofdknop" onClick={() => onKies('samenvoegen')}>
					Samenvoegen
				</button>
				<button type="button" onClick={() => onKies('vervangen')}>
					Vervangen
				</button>
				<button type="button" data-beginfocus onClick={onAnnuleer}>
					Annuleren
				</button>
			</p>
		</>
	);
}

function Klaar({ toestand, onSluit }: { toestand: Extract<Toestand, { soort: 'klaar' }>; onSluit: () => void }) {
	const { geschreven, meldingen } = toestand.uitkomst;
	const gelukt = meldingen.length === 0;
	return (
		<>
			<p role={gelukt ? 'status' : 'alert'}>
				{gelukt
					? `Klaar: ${meervoud(geschreven.verzen, 'vers', 'verzen')}, ${meervoud(geschreven.keuzes, 'keuze', 'keuzes')} en ${meervoud(geschreven.antwoorden, 'antwoord', 'antwoorden')} opgeslagen (${toestand.modus}).`
					: 'Het inladen is niet helemaal gelukt.'}
			</p>
			{!gelukt && (
				<ul>
					{meldingen.map((melding) => (
						<li>{melding}</li>
					))}
				</ul>
			)}
			<p class="bewaren-venster-knoppen">
				<button type="button" onClick={onSluit}>
					Sluiten
				</button>
			</p>
		</>
	);
}
