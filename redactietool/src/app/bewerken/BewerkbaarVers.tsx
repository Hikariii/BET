import { useEffect, useRef, useState } from 'preact/hooks';
import type { BoekData, HoofdstukData } from '../../data/types';
import { bewaarOfWis, isVerouderd, pastOpRepo, wisVers } from '../../bewerken/tussenstand';
import type { BewerktVers, VersInhoud } from '../../bewerken/types';
import { knipVers } from '../../bewerken/versknip';
import { waarschuwingenVoorVers } from '../../bewerken/waarschuwingen';
import type { VersDeel } from '../groepeerPerVers';
import { VersTekst } from '../VersTekst';
import { browseropslag } from './useTussenstand';
import { VersEditor } from './VersEditor';

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
	const bewerkKnop = useRef<HTMLButtonElement>(null);
	const eerderBewerkt = useRef(false);
	useEffect(() => {
		if (eerderBewerkt.current && !bewerken) bewerkKnop.current?.focus();
		eerderBewerkt.current = bewerken;
	}, [bewerken]);

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
	const waarschuwingen = bewerkt === null || bron === null ? [] : waarschuwingenVoorVers(bron, bewerkt.inhoud);
	const verouderd = bewerkt !== null && repo !== null && !bewerkingPastNiet && isVerouderd(repo, bewerkt.basis);

	return (
		<>
			{bewerken && startInhoud !== null ? (
				<VersEditor
					inhoud={startInhoud}
					stijlen={boek.stijlen}
					label={`Vereenvoudigde tekst van vers ${nummer}`}
					onWijzig={bewaar}
					onSluit={onSluit}
				/>
			) : (
				<VersTekst delen={delen} stijlen={boek.stijlen} />
			)}
			<div class="versacties">
				{!bewerken && repo !== null && (
					<button type="button" ref={bewerkKnop} onClick={onBewerk} aria-label={`Bewerken, vers ${nummer}`}>
						Bewerken
					</button>
				)}
				{bewerkt !== null && <span class="versmarkering">gewijzigd</span>}
				{bewerkt !== null && (
					<button type="button" onClick={terugNaarRepo} aria-label={`Terug naar de repo, vers ${nummer}`}>
						Terug naar de repo
					</button>
				)}
			</div>
			{bewerkingPastNiet && (
				<p class="versverouderd" role="status">
					Deze bewerking kan niet worden toegepast: de indeling in alinea's is in de repo veranderd. Kies Terug naar de repo of bewerk het vers opnieuw.
				</p>
			)}
			{verouderd && (
				<p class="versverouderd" role="status">
					De repo is veranderd sinds je dit vers bewerkte. Je wijziging bouwt op de oude versie; controleer hem voor je hem gebruikt.
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
