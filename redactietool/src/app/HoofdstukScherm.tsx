import { useEffect, useRef, useState } from 'preact/hooks';
import type { BoekData, HoofdstukData, HoofdstukInfo, Referentie } from '../data/types';
import { pasTussenstandToe } from '../bewerken/tussenstand';
import type { BewerktVers } from '../bewerken/types';
import { versAdres } from './adres';
import { groepeerPerVers, type VersGroep } from './groepeerPerVers';
import type { Naslag } from './naslag';
import { Regels } from './Regels';
import { statusKlasse } from './Zijbalk';
import { vragenBijVers } from './vertaalvragen';
import { BewerkbaarVers } from './bewerken/BewerkbaarVers';
import { useTussenstand } from './bewerken/useTussenstand';
import { Hoofdstukacties } from './naarWord/Hoofdstukacties';
import { VersTekst } from './VersTekst';

const LABEL_GOEDGEKEURD = 'Goedgekeurd, referentie voor de rest van het boek. Wijzigingen gaan opnieuw langs de redactie.';

const KOLOMMEN_ZONDER_REGELS = 3;

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
	const { tussenstand, herlees } = useTussenstand(boek.id, hoofdstuk.nummer);
	const [bewerktAdres, zetBewerktAdres] = useState<string | null>(null);
	const weergave = pasTussenstandToe(hoofdstuk.vereenvoudigd, tussenstand);
	const groepen = groepeerPerVers(hoofdstuk.bron, weergave);
	const adresVan = (nummer: number | null) => (nummer === null ? null : versAdres(boek.id, hoofdstuk.nummer, nummer));

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
				<Hoofdstukacties boek={boek} repo={hoofdstuk} weergave={weergave} tussenstand={tussenstand} />
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
								regelsAlsKolom={regelsAltijdZichtbaar}
								onOpenNaslag={onOpenNaslag}
								bewerkt={groep.nummer === null ? null : (tussenstand.verzen[groep.nummer] ?? null)}
								bewerken={bewerktAdres !== null && bewerktAdres === adresVan(groep.nummer)}
								onBewerk={() => zetBewerktAdres(adresVan(groep.nummer))}
								onSluit={() => zetBewerktAdres(null)}
								onOpslagGewijzigd={herlees}
							/>
						);
					})}
				</tbody>
			</table>
			<p class="regelsschakelaar">
				<button type="button" aria-pressed={regelsAltijdZichtbaar} onClick={onWisselRegels}>
					Regels altijd tonen
				</button>
				<span> Klik in de vereenvoudigde tekst om een vers te bewerken.</span>
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
	/** Regels in een eigen kolom; anders in een rij eronder, alleen voor het gekozen vers. */
	regelsAlsKolom: boolean;
	onOpenNaslag: (naslag: Naslag) => void;
	/** De bewaarde bewerking van dit vers; `null` als het vers gelijk is aan de repo. */
	bewerkt: BewerktVers | null;
	bewerken: boolean;
	onBewerk: () => void;
	onSluit: () => void;
	onOpslagGewijzigd: () => void;
};

function VersRij({
	groep,
	boek,
	referentie,
	hoofdstuk,
	geselecteerd,
	regelsAlsKolom,
	onOpenNaslag,
	bewerkt,
	bewerken,
	onBewerk,
	onSluit,
	onOpslagGewijzigd,
}: VersRijProps) {
	const rijRef = useRef<HTMLTableRowElement>(null);
	useEffect(() => {
		if (geselecteerd) {
			rijRef.current?.scrollIntoView({ block: 'nearest' });
		}
	}, [geselecteerd]);

	const nummer = groep.nummer;
	const adres = nummer === null ? null : versAdres(boek.id, hoofdstuk.nummer, nummer);
	const logVerzen = nummer === null ? [] : hoofdstuk.log.verzen.filter((logVers) => logVers.verzen.includes(nummer));
	const vragen = nummer === null ? [] : vragenBijVers(referentie.openVragen, hoofdstuk.nummer, nummer);
	const heeftVraag = vragen.length > 0 || logVerzen.some((logVers) => logVers.vragen.length > 0);
	const regels = (kapAf: boolean) => <Regels logVerzen={logVerzen} vragen={vragen} kapAf={kapAf} onOpenNaslag={onOpenNaslag} />;

	const kiesVers = (gebeurtenis: MouseEvent) => {
		const opInteractiefElement = (gebeurtenis.target as Element).closest('a, button, summary, [contenteditable]') !== null;
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
					{nummer === null ? (
						<VersTekst delen={groep.vereenvoudigd} stijlen={boek.stijlen} />
					) : (
						<BewerkbaarVers
							boek={boek}
							hoofdstuk={hoofdstuk}
							nummer={nummer}
							delen={groep.vereenvoudigd}
							bewerkt={bewerkt}
							bewerken={bewerken}
							onBewerk={onBewerk}
							onSluit={onSluit}
							onOpslagGewijzigd={onOpslagGewijzigd}
						/>
					)}
				</td>
				{regelsAlsKolom && <td class="regels">{regels(true)}</td>}
			</tr>
			{geselecteerd && !regelsAlsKolom && (
				<tr class="regels-onder">
					<td colSpan={KOLOMMEN_ZONDER_REGELS}>{regels(false)}</td>
				</tr>
			)}
		</>
	);
}
