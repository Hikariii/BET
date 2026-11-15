import { useEffect, useRef } from 'preact/hooks';
import type { BoekData, HoofdstukData, HoofdstukInfo, Referentie } from '../data/types';
import { maakAdres } from './adres';
import { groepeerPerVers, type VersGroep } from './groepeerPerVers';
import type { Naslag } from './naslag';
import { Regels } from './Regels';
import { statusKlasse } from './Zijbalk';
import { vragenBijVers } from './vertaalvragen';
import { VersTekst } from './VersTekst';

/** Uit docs/PLAN.md, onderdeel Bewerken. */
const LABEL_GOEDGEKEURD = 'Goedgekeurd, referentie voor de rest van het boek. Wijzigingen gaan opnieuw langs de redactie.';

type Props = {
	boek: BoekData;
	referentie: Referentie;
	hoofdstuk: HoofdstukData;
	info: HoofdstukInfo;
	gekozenVers: number | null;
	regelsAltijdZichtbaar: boolean;
	onWisselRegels: () => void;
	onOpenNaslag: (naslag: Naslag) => void;
};

export function HoofdstukScherm({
	boek,
	referentie,
	hoofdstuk,
	info,
	gekozenVers,
	regelsAltijdZichtbaar,
	onWisselRegels,
	onOpenNaslag,
}: Props) {
	const groepen = groepeerPerVers(hoofdstuk.bron, hoofdstuk.vereenvoudigd);
	const kolommen = regelsAltijdZichtbaar ? 4 : 3;

	return (
		<article class="hoofdstuk">
			<header>
				<h1>
					{boek.naam} {hoofdstuk.nummer}
				</h1>
				<p class="hoofdstukstatus">
					<span class={`status status-${statusKlasse(info.status)}`}>{info.status}</span>
					{info.versie !== '' && <span class="versie">{info.versie}</span>}
				</p>
				{info.status === 'goedgekeurd' && <p class="goedgekeurd">{LABEL_GOEDGEKEURD}</p>}
			</header>
			<table class="verzen">
				<thead>
					<tr>
						<th scope="col">Vers</th>
						<th scope="col">Bron</th>
						<th scope="col">Vereenvoudigd</th>
						{regelsAltijdZichtbaar && <th scope="col">Regels</th>}
					</tr>
				</thead>
				<tbody>
					{groepen.map((groep) => {
						const geselecteerd = groep.nummer !== null && groep.nummer === gekozenVers;
						return (
							<VersRij
								groep={groep}
								boek={boek}
								referentie={referentie}
								hoofdstuk={hoofdstuk}
								geselecteerd={geselecteerd}
								regelsZichtbaar={regelsAltijdZichtbaar || geselecteerd}
								regelsAlsKolom={regelsAltijdZichtbaar}
								kolommen={kolommen}
								onOpenNaslag={onOpenNaslag}
							/>
						);
					})}
				</tbody>
			</table>
			<p class="regelsschakelaar">
				<button type="button" aria-pressed={regelsAltijdZichtbaar} onClick={onWisselRegels}>
					{regelsAltijdZichtbaar ? 'Regels inklappen' : 'Regels altijd tonen'}
				</button>
				{!regelsAltijdZichtbaar && <span> Klik op een vers om de regels erbij te zien.</span>}
			</p>
		</article>
	);
}

type VersRijProps = {
	groep: VersGroep;
	boek: BoekData;
	referentie: Referentie;
	hoofdstuk: HoofdstukData;
	geselecteerd: boolean;
	regelsZichtbaar: boolean;
	/** Regels in een eigen kolom; anders in een rij eronder, alleen voor het gekozen vers. */
	regelsAlsKolom: boolean;
	kolommen: number;
	onOpenNaslag: (naslag: Naslag) => void;
};

function VersRij({
	groep,
	boek,
	referentie,
	hoofdstuk,
	geselecteerd,
	regelsZichtbaar,
	regelsAlsKolom,
	kolommen,
	onOpenNaslag,
}: VersRijProps) {
	const rijRef = useRef<HTMLTableRowElement>(null);
	useEffect(() => {
		if (geselecteerd) {
			rijRef.current?.scrollIntoView({ block: 'nearest' });
		}
	}, [geselecteerd]);

	const nummer = groep.nummer;
	const adres = nummer === null ? null : maakAdres({ boek: boek.id, hoofdstuk: hoofdstuk.nummer, vers: nummer });
	const logVerzen = nummer === null ? [] : hoofdstuk.log.verzen.filter((logVers) => logVers.verzen.includes(nummer));
	const vragen = nummer === null ? [] : vragenBijVers(referentie.openVragen, hoofdstuk.nummer, nummer);
	const heeftVraag = vragen.length > 0 || logVerzen.some((logVers) => logVers.vragen.length > 0);
	const regels = <Regels logVerzen={logVerzen} vragen={vragen} onOpenNaslag={onOpenNaslag} />;

	const kiesVers = (gebeurtenis: MouseEvent) => {
		const opInteractiefElement = (gebeurtenis.target as Element).closest('a, button, summary') !== null;
		if (adres !== null && !opInteractiefElement) {
			window.location.hash = adres;
		}
	};

	return (
		<>
			<tr
				ref={rijRef}
				id={nummer === null ? undefined : `vers-${nummer}`}
				class={geselecteerd ? 'vers vers-gekozen' : 'vers'}
				aria-current={geselecteerd ? 'location' : undefined}
				onClick={kiesVers}
			>
				<th scope="row" class="versnummer">
					{adres === null ? null : <a href={adres}>{nummer}</a>}
					{heeftVraag && (
						<span class="vraagmarkering" role="img" aria-label="Dit vers hoort bij een vertaalvraag" title="Vertaalvraag">
							?
						</span>
					)}
				</th>
				<td>
					<VersTekst delen={groep.bron} stijlen={boek.stijlen} />
				</td>
				<td>
					<VersTekst delen={groep.vereenvoudigd} stijlen={boek.stijlen} />
				</td>
				{regelsAlsKolom && <td class="regels">{regels}</td>}
			</tr>
			{regelsZichtbaar && !regelsAlsKolom && (
				<tr class="regels-onder">
					<td colSpan={kolommen}>{regels}</td>
				</tr>
			)}
		</>
	);
}
