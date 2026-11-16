import { useEffect, useRef, useState } from 'preact/hooks';
import type { BoekData, HoofdstukData } from '../../data/types';
import { bewaarOfWis, isVerouderd, pastOpRepo, wisVers } from '../../bewerken/tussenstand';
import type { BewerktVers, VersInhoud } from '../../bewerken/types';
import { knipVers } from '../../bewerken/versknip';
import { waarschuwingenVoorVers } from '../../bewerken/waarschuwingen';
import type { VersDeel } from '../groepeerPerVers';
import { VersTekst } from '../VersTekst';
import { browseropslag } from './useTussenstand';
import { plekVanKlik, type KlikPlek } from './klikPlek';
import { VersEditor } from './VersEditor';
import './versklik.css';

type Props = {
	boek: BoekData;
	hoofdstuk: HoofdstukData;
	nummer: number;
	/** De vereenvoudiging van dit vers met de tussenstand erin verwerkt. */
	delen: readonly VersDeel[];
	/** De bewaarde bewerking van dit vers; `null` als het vers gelijk is aan de repo. */
	bewerkt: BewerktVers | null;
	bewerken: boolean;
	onBewerk: () => void;
	onSluit: () => void;
	/** Na elke wijziging in de opslag. */
	onOpslagGewijzigd: () => void;
};

/** De cel "vereenvoudigd" van een vers: de tekst of de editor, met markering, melding en waarschuwingen. */
export function BewerkbaarVers({ boek, hoofdstuk, nummer, delen, bewerkt, bewerken, onBewerk, onSluit, onOpslagGewijzigd }: Props) {
	const [opslagmelding, zetOpslagmelding] = useState<string | null>(null);
	const klikbareTekst = useRef<HTMLDivElement>(null);
	const tekstWeergave = useRef<HTMLDivElement>(null);
	const startPlek = useRef<KlikPlek | null>(null);
	const eerderBewerkt = useRef(false);
	useEffect(() => {
		if (eerderBewerkt.current && !bewerken) klikbareTekst.current?.focus();
		eerderBewerkt.current = bewerken;
	}, [bewerken]);

	const beginBewerken = (plek: KlikPlek | null) => {
		startPlek.current = plek;
		onBewerk();
	};

	const klikInTekst = (gebeurtenis: MouseEvent) => {
		const opKnopOfLink = (gebeurtenis.target as Element).closest('a, button, summary') !== null;
		const tekstGeselecteerd = window.getSelection()?.isCollapsed === false;
		if (opKnopOfLink || tekstGeselecteerd) return;
		beginBewerken(tekstWeergave.current === null ? null : plekVanKlik(gebeurtenis, tekstWeergave.current));
	};

	const toetsOpTekst = (gebeurtenis: KeyboardEvent) => {
		if (gebeurtenis.target !== gebeurtenis.currentTarget || (gebeurtenis.key !== 'Enter' && gebeurtenis.key !== ' ')) return;
		gebeurtenis.preventDefault();
		beginBewerken(null);
	};

	const tekstId = `vers-${nummer}-tekst`;
	const repo = knipVers(hoofdstuk.vereenvoudigd, nummer);
	const bron = knipVers(hoofdstuk.bron, nummer);
	const opslag = browseropslag();

	const bewaar = (inhoud: VersInhoud) => {
		const uitkomst = bewaarOfWis(opslag, boek.id, hoofdstuk.nummer, nummer, inhoud, repo);
		zetOpslagmelding(uitkomst.gelukt ? null : uitkomst.melding);
		onOpslagGewijzigd();
	};

	const terugNaarRepo = () => {
		wisVers(opslag, boek.id, hoofdstuk.nummer, nummer);
		zetOpslagmelding(null);
		onOpslagGewijzigd();
		onSluit();
	};

	const bewerkingPastNiet = bewerkt !== null && repo !== null && !pastOpRepo(repo, bewerkt);
	const startInhoud = bewerkt === null || bewerkingPastNiet ? repo : bewerkt.inhoud;
	// Een bewerking die niet past, staat niet op het scherm; waarschuwingen erover zouden verwarren.
	const waarschuwingen = bewerkt === null || bron === null || bewerkingPastNiet ? [] : waarschuwingenVoorVers(bron, bewerkt.inhoud);
	const verouderd = bewerkt !== null && repo !== null && !bewerkingPastNiet && isVerouderd(repo, bewerkt.basis);

	return (
		<>
			{bewerken && startInhoud !== null ? (
				<VersEditor
					inhoud={startInhoud}
					stijlen={boek.stijlen}
					label={`Vereenvoudigde tekst van vers ${nummer}`}
					startPlek={startPlek.current}
					onWijzig={bewaar}
					onSluit={onSluit}
				/>
			) : repo === null ? (
				<VersTekst delen={delen} stijlen={boek.stijlen} />
			) : (
				<div
					ref={klikbareTekst}
					class="versklik"
					data-help="vers-bewerken"
					role="button"
					tabIndex={0}
					aria-label={`Vers ${nummer} bewerken`}
					aria-describedby={tekstId}
					onClick={klikInTekst}
					onKeyDown={toetsOpTekst}
				>
					<div ref={tekstWeergave} id={tekstId}>
						<VersTekst delen={delen} stijlen={boek.stijlen} />
					</div>
				</div>
			)}
			<div class="versacties">
				{bewerkt !== null && (
					<span class="versmarkering" data-help="vers-gewijzigd">
						gewijzigd
					</span>
				)}
				{bewerkt !== null && (
					<button
						type="button"
						data-help="terug-naar-de-repo"
						onClick={terugNaarRepo}
						aria-label={`Vers ${nummer} terugzetten`}
						title="Zet de vereenvoudiging van Claude terug; je wijzigingen in dit vers gaan weg."
					>
						Vers terugzetten
					</button>
				)}
			</div>
			{bewerkingPastNiet && bewerkt !== null && (
				<div class="versverouderd" role="status">
					<p>
						Deze bewerking kan niet worden toegepast: Claude heeft de indeling in alinea's veranderd. Je eerdere tekst staat hieronder; kopieer
						hem als je hem wilt houden, want opnieuw bewerken of Vers terugzetten overschrijft hem.
					</p>
					{bewerkt.inhoud.delen.map((deel) => (
						<p class="eerdere-tekst">{deel.stukken.map((stuk) => stuk.tekst).join('').trim()}</p>
					))}
				</div>
			)}
			{verouderd && (
				<p class="versverouderd" role="status">
					Claude heeft dit vers veranderd nadat jij het bewerkte. Je wijziging bouwt op de oude tekst; lees hem na voor je hem gebruikt.
				</p>
			)}
			{opslagmelding !== null && (
				<p class="versopslagfout" role="alert">
					{opslagmelding}
				</p>
			)}
			{waarschuwingen.length > 0 && (
				<ul class="verswaarschuwingen" aria-label={`Waarschuwingen bij vers ${nummer}`}>
					{waarschuwingen.map((waarschuwing) => (
						<li>{waarschuwing.tekst}</li>
					))}
				</ul>
			)}
		</>
	);
}
