import { useMemo, useState } from 'preact/hooks';
import type { BoekData, HoofdstukData, OpenVraag } from '../../data/types';
import type { Tussenstand } from '../../bewerken/types';
import { leesAntwoorden } from '../../antwoorden/antwoorden';
import { exportBestandsnaam, maakExport } from '../../export/maakExport';
import type { Hoofdstuk } from '../../formaat/types';
import { maakKlembordInhoud, vulKopieerGebeurtenis } from '../../klembord/kopieer';
import { leesKeuzes } from '../../vervangen/keuzes';
import { meervoud, verouderdMelding } from '../bewaren/bewaarTekst';
import { browseropslag } from '../bewerken/useTussenstand';
import { downloadAlsJson } from '../downloadBestand';
import './hoofdstukacties.css';

type Props = {
	boek: BoekData;
	/** Het hoofdstuk uit de repo. */
	repo: HoofdstukData;
	/** Het hoofdstuk zoals in de tool, met de tussenstand toegepast; dit gaat naar Word. */
	weergave: Hoofdstuk;
	/** Dezelfde tussenstand waaruit `weergave` gemaakt is, zodat teller, export en klembord gelijk lopen. */
	tussenstand: Tussenstand;
	/** De open vragen uit het register; de export zet de verzen van de vraag bij elk antwoord. */
	openVragen: readonly OpenVraag[];
};

/** `van`: de tussenstand op het moment van kopiëren; is die veranderd, dan is het klembord verouderd. */
type KopieUitkomst = { soort: 'gekopieerd'; van: Tussenstand } | { soort: 'mislukt'; melding: string };

/** Safari herkend aan de user agent; een hint, want de user agent is niet betrouwbaar (iPadOS). */
const SAFARI = /Safari/;
const ANDERE_BROWSER = /Chrome|Chromium|Edg|CriOS|FxiOS|OPR/;

function isSafari(): boolean {
	return SAFARI.test(navigator.userAgent) && !ANDERE_BROWSER.test(navigator.userAgent);
}

/** Zet het hoofdstuk op het klembord via een eigen `copy`-handler; de standaardkopie van de browser laat de Word-stijlnamen weg. */
function kopieerNaarKlembord(weergave: Hoofdstuk, boek: BoekData, tussenstand: Tussenstand): KopieUitkomst {
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
		// Bewuste uitzondering op de regel tegen @deprecated (typescript.md): zie klembord/kopieer.ts; alleen een copy-gebeurtenis laat de handler de Word-stijlnamen op het klembord zetten.
		document.execCommand('copy');
	} finally {
		document.removeEventListener('copy', bijKopie);
	}
	return melding === null ? { soort: 'gekopieerd', van: tussenstand } : { soort: 'mislukt', melding };
}

/** Knoppen bovenaan het hoofdstuk: Hoofdstuktekst kopiëren voor Word (met de waarschuwing in Safari) en Export voor Claude. */
export function Hoofdstukacties({ boek, repo, weergave, tussenstand, openVragen }: Props) {
	const [kopie, zetKopie] = useState<KopieUitkomst | null>(null);
	const [exportOpen, zetExportOpen] = useState(false);
	const [toelichting, zetToelichting] = useState('');
	const [gedownload, zetGedownload] = useState('');

	const bouwExport = (tekst: string) =>
		maakExport({
			boek: boek.id,
			hoofdstuk: repo,
			tussenstand,
			keuzes: leesKeuzes(browseropslag(), boek.id),
			antwoorden: leesAntwoorden(browseropslag(), boek.id),
			vragen: new Map(openVragen.map((vraag) => [vraag.kwestie, { nr: vraag.nr, verzen: vraag.verzen }])),
			repoCommit: __REPO_COMMIT__,
			toelichting: tekst,
			nu: new Date(),
		});
	const { aantalBewerkt, verouderdeVerzen } = useMemo(() => {
		const verzen = bouwExport('').verzen;
		return { aantalBewerkt: verzen.length, verouderdeVerzen: verzen.filter((vers) => vers.verouderd).map((vers) => `vers ${vers.vers}`) };
	}, [boek.id, repo, tussenstand]);

	const kopieer = () => {
		zetGedownload('');
		zetKopie(kopieerNaarKlembord(weergave, boek, tussenstand));
	};
	const download = (gebeurtenis: SubmitEvent) => {
		gebeurtenis.preventDefault();
		const bestandsnaam = exportBestandsnaam(boek.prefix, repo.nummer);
		downloadAlsJson(bestandsnaam, bouwExport(toelichting));
		zetKopie(null);
		zetGedownload(`Gedownload als ${bestandsnaam} (${meervoud(aantalBewerkt, 'vers', 'verzen')}). Lever het samen met je Word-bestand aan.`);
		zetExportOpen(false);
	};

	return (
		<section class="hoofdstukacties" aria-label="Acties voor dit hoofdstuk">
			<div class="hoofdstukacties-knoppen">
				<button type="button" data-help="hoofdstuk-kopieren" onClick={kopieer}>
					Hoofdstuktekst kopiëren voor Word
				</button>
				<button type="button" data-help="export-voor-claude" aria-expanded={exportOpen} onClick={() => zetExportOpen(!exportOpen)}>
					Export voor Claude
				</button>
				<span class="hoofdstukacties-aantal">{meervoud(aantalBewerkt, 'vers bewerkt', 'verzen bewerkt')}</span>
			</div>
			{isSafari() && <p class="hoofdstukacties-safari">Hoofdstuktekst kopiëren voor Word werkt in Chrome of Edge.</p>}
			<div role="status" class="hoofdstukacties-status">
				{kopie?.soort === 'gekopieerd' && kopie.van === tussenstand && 'Gekopieerd. Plak het in Word.'}
				{kopie?.soort === 'mislukt' && `Kopiëren mislukt (${kopie.melding.replace(/\.$/, '')}). Probeer het opnieuw, of gebruik Chrome of Edge.`}
				{gedownload}
			</div>
			{verouderdeVerzen.length > 0 && (
				<p class="hoofdstukacties-verouderd" role="status">
					{verouderdMelding(verouderdeVerzen, 'voordat je kopieert')}
				</p>
			)}
			{exportOpen && (
				<form class="hoofdstukacties-export" onSubmit={download}>
					<label for="export-toelichting">Toelichting voor Claude (mag leeg)</label>
					<textarea
						id="export-toelichting"
						rows={3}
						value={toelichting}
						onInput={(gebeurtenis) => zetToelichting(gebeurtenis.currentTarget.value)}
					/>
					<p class="hoofdstukacties-hulp">Dit bestand is uitleg bij je Word-bestand. Lever het samen met dat bestand aan.</p>
					{aantalBewerkt === 0 && <p role="status">Niets gewijzigd in dit hoofdstuk.</p>}
					<button type="submit">Downloaden</button>
				</form>
			)}
		</section>
	);
}
