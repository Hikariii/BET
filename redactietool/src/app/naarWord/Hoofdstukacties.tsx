import { useState } from 'preact/hooks';
import type { BoekData, HoofdstukData } from '../../data/types';
import { leesTussenstand } from '../../bewerken/tussenstand';
import { exportBestandsnaam, maakExport } from '../../export/maakExport';
import type { RedactieExport } from '../../export/types';
import type { Hoofdstuk } from '../../formaat/types';
import { maakKlembordInhoud, vulKopieerGebeurtenis } from '../../klembord/kopieer';
import { browseropslag } from '../bewerken/useTussenstand';
import './hoofdstukacties.css';

type Props = {
	boek: BoekData;
	/** Het hoofdstuk uit de repo. */
	repo: HoofdstukData;
	/** Het hoofdstuk zoals in de tool, met de tussenstand toegepast; dit gaat naar Word. */
	weergave: Hoofdstuk;
};

type KopieUitkomst = { soort: 'gekopieerd' } | { soort: 'mislukt'; melding: string };

/** Safari herkend aan de user agent; een hint, want de user agent is niet betrouwbaar (iPadOS). */
const SAFARI = /Safari/;
const ANDERE_BROWSER = /Chrome|Chromium|Edg|CriOS|FxiOS|OPR/;

function isSafari(): boolean {
	return SAFARI.test(navigator.userAgent) && !ANDERE_BROWSER.test(navigator.userAgent);
}

function meervoud(aantal: number, enkelvoud: string, meervoudsvorm: string): string {
	return `${aantal} ${aantal === 1 ? enkelvoud : meervoudsvorm}`;
}

/** Zet het hoofdstuk op het klembord via een eigen `copy`-handler; de standaardkopie van de browser laat de Word-stijlnamen weg. */
function kopieerNaarKlembord(weergave: Hoofdstuk, boek: BoekData): KopieUitkomst {
	const inhoud = maakKlembordInhoud([weergave], boek.stijlen);
	let melding: string | null = 'De browser startte de kopieeractie niet.';
	const bijKopie = (gebeurtenis: ClipboardEvent) => {
		try {
			vulKopieerGebeurtenis(gebeurtenis, inhoud);
			melding = null;
		} catch (fout) {
			melding = fout instanceof Error ? fout.message : 'Onbekende fout bij het kopiëren.';
		}
	};
	document.addEventListener('copy', bijKopie);
	try {
		// execCommand is verouderd maar de enige weg naar een copy-gebeurtenis na een klik, waarvan de handler de clipboardData vult; zonder selectie werkt dat in Chromium.
		document.execCommand('copy');
	} finally {
		document.removeEventListener('copy', bijKopie);
	}
	return melding === null ? { soort: 'gekopieerd' } : { soort: 'mislukt', melding };
}

function downloadAlsBestand(bestandsnaam: string, uitvoer: RedactieExport): void {
	const bestand = new Blob([`${JSON.stringify(uitvoer, null, 2)}\n`], { type: 'application/json' });
	const adres = URL.createObjectURL(bestand);
	const koppeling = document.createElement('a');
	koppeling.href = adres;
	koppeling.download = bestandsnaam;
	document.body.append(koppeling);
	koppeling.click();
	koppeling.remove();
	URL.revokeObjectURL(adres);
}

/** Knoppen bovenaan het hoofdstuk: Kopiëren naar Word (met de waarschuwing in Safari) en Export voor Claude. */
export function Hoofdstukacties({ boek, repo, weergave }: Props) {
	const [kopie, zetKopie] = useState<KopieUitkomst | null>(null);
	const [exportOpen, zetExportOpen] = useState(false);
	const [toelichting, zetToelichting] = useState('');

	const bouwExport = (tekst: string) =>
		maakExport({
			boek: boek.id,
			hoofdstuk: repo,
			tussenstand: leesTussenstand(browseropslag(), boek.id, repo.nummer),
			repoCommit: __REPO_COMMIT__,
			toelichting: tekst,
			nu: new Date(),
		});
	const huidigeExport = bouwExport('');
	const aantalBewerkt = huidigeExport.verzen.length;
	const aantalVerouderd = huidigeExport.verzen.filter((vers) => vers.verouderd).length;

	const kopieer = () => zetKopie(kopieerNaarKlembord(weergave, boek));
	const download = (gebeurtenis: SubmitEvent) => {
		gebeurtenis.preventDefault();
		downloadAlsBestand(exportBestandsnaam(boek.prefix, repo.nummer), bouwExport(toelichting));
	};

	return (
		<section class="hoofdstukacties" aria-label="Acties voor dit hoofdstuk">
			<div class="hoofdstukacties-knoppen">
				<button type="button" onClick={kopieer}>
					Kopiëren naar Word
				</button>
				<button type="button" aria-expanded={exportOpen} onClick={() => zetExportOpen(!exportOpen)}>
					Export voor Claude
				</button>
				<span class="hoofdstukacties-aantal">{meervoud(aantalBewerkt, 'vers bewerkt', 'verzen bewerkt')}</span>
			</div>
			{isSafari() && <p class="hoofdstukacties-safari">Kopiëren naar Word werkt in Chrome of Edge.</p>}
			<div role="status" class="hoofdstukacties-status">
				{kopie?.soort === 'gekopieerd' && 'Gekopieerd'}
				{kopie?.soort === 'mislukt' && `Kopiëren mislukt: ${kopie.melding}`}
			</div>
			{aantalVerouderd > 0 && (
				<p class="hoofdstukacties-verouderd" role="status">
					{meervoud(aantalVerouderd, 'bewerking is', 'bewerkingen zijn')} verouderd: de repo is sinds de bewerking veranderd. Controleer
					{aantalVerouderd === 1 ? ' die' : ' ze'} voordat je kopieert.
				</p>
			)}
			{exportOpen && (
				<form class="hoofdstukacties-export" onSubmit={download}>
					<label for="export-toelichting">Toelichting voor de verwerking</label>
					<textarea
						id="export-toelichting"
						rows={3}
						value={toelichting}
						onInput={(gebeurtenis) => zetToelichting(gebeurtenis.currentTarget.value)}
					/>
					{aantalBewerkt === 0 && <p role="status">Niets gewijzigd in dit hoofdstuk.</p>}
					<button type="submit">Downloaden</button>
				</form>
			)}
		</section>
	);
}
