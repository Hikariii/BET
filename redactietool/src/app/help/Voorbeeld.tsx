import type { ComponentChildren } from 'preact';
import type { BoekData, Status } from '../../data/types';
import { GrootteKeuze } from '../GrootteKeuze';
import { BoekTabbladen } from '../bovenbalk/BoekTabbladen';
import type { BoekPlek } from '../navigatie/boekplekken';
import { KortHoofdstuk } from '../navigatie/KortHoofdstuk';
import { statusKlasse } from '../Zijbalk';
import { plekSleutel } from './wijsAan';

/** Alle statussen van een hoofdstuk; `Record` laat de compiler bewaken dat er geen bijkomt zonder dat de help het toont. */
const STATUSSEN: Record<Status, true> = {
	'nog niet begonnen': true,
	concept: true,
	review: true,
	'bij editor': true,
	verwerkt: true,
	goedgekeurd: true,
};

export const ALLE_STATUSSEN = Object.keys(STATUSSEN) as Status[];

/**
 * Onderdelen die een gewone knop zijn: het voorbeeld is een knop met de naam uit de help.
 * De naam moet gelijk zijn aan de tekst op de echte knop; `sleutels.test.ts` controleert dat.
 */
export const KNOPSLEUTELS: readonly string[] = [
	'hoofdstuk-kopieren',
	'export-voor-claude',
	'terug-naar-de-repo',
	'vragen-kiezen',
	'vragen-zoek-plekken',
	'vervangen-zoeken',
	'back-up-downloaden',
	'back-up-inladen',
];

export type VoorbeeldContext = { boek: BoekData; plekken: readonly BoekPlek[] };

type Props = { sleutel: string; naam: string; context: VoorbeeldContext };

function Statussen() {
	return (
		<ul class="help-statussen">
			{ALLE_STATUSSEN.map((status) => (
				<li>
					<span class="bovenbalk help-balk">
						<span class="bovenbalk-titel">
							<span class={`status status-${statusKlasse(status)}`}>{status}</span>
						</span>
					</span>
					{status}
				</li>
			))}
		</ul>
	);
}

function Hoofdstukken({ boek }: { boek: BoekData }) {
	const goedgekeurd = boek.hoofdstukken.find((hoofdstuk) => hoofdstuk.status === 'goedgekeurd');
	const ander = boek.hoofdstukken.find((hoofdstuk) => hoofdstuk.status !== 'goedgekeurd');
	if (goedgekeurd === undefined || ander === undefined) return null;
	return (
		<div class="bovenbalk help-balk">
			<div class="bovenbalk-strip">
				<nav class="hoofdstukstrip" aria-label="Voorbeeld van de hoofdstukstrip">
					<ul>
						<li>
							<KortHoofdstuk boek={boek.id} hoofdstuk={goedgekeurd} aantalOpenVragen={0} huidig={false} />
						</li>
						<li>
							<KortHoofdstuk boek={boek.id} hoofdstuk={ander} aantalOpenVragen={3} huidig={false} />
						</li>
					</ul>
				</nav>
			</div>
		</div>
	);
}

function voorbeeldVan({ sleutel, naam, context }: Props): ComponentChildren {
	if (KNOPSLEUTELS.includes(sleutel)) {
		const knop = <button type="button">{naam}</button>;
		return sleutel === 'hoofdstuk-kopieren' ? <span class="hoofdstukacties-knoppen">{knop}</span> : knop;
	}
	if (sleutel.startsWith('plek-')) {
		const plek = context.plekken.find((kandidaat) => plekSleutel(kandidaat.plek) === sleutel);
		return plek === undefined ? null : (
			<span class="bovenbalk help-balk">
				<BoekTabbladen boekNaam={context.boek.naam} plekken={[plek]} huidig={null} />
			</span>
		);
	}
	switch (sleutel) {
		case 'hoofdstuk-status':
			return <Statussen />;
		case 'hoofdstukstrip':
			return <Hoofdstukken boek={context.boek} />;
		case 'grootte':
			return <GrootteKeuze grootte={0} onKies={() => undefined} />;
		case 'nog-n-regels':
			return (
				<button type="button" class="meerregels">
					nog 3 vertaalregels
				</button>
			);
		case 'naslag-verwijzing':
			return (
				<>
					<button type="button" class="verwijzing">
						§11
					</button>{' '}
					<button type="button" class="verwijzing">
						vertaalkeuze
					</button>
				</>
			);
		case 'vraagmarkering':
			return <span class="vraagmarkering">?</span>;
		case 'vers-gewijzigd':
			return <span class="versmarkering">gewijzigd</span>;
		default:
			return null;
	}
}

/** Het echte onderdeel naast de uitleg, onaanraakbaar (`inert`): het is een voorbeeld, geen bediening. Geen voorbeeld voor deze sleutel geeft niets. */
export function Voorbeeld(props: Props) {
	const inhoud = voorbeeldVan(props);
	return inhoud === null ? null : (
		<div class="help-voorbeeld" inert>
			{inhoud}
		</div>
	);
}
