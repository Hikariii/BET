import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { BoekData, HoofdstukData, HoofdstukInfo, LogVers, OpenVraag, Referentie } from '../data/types';
import { pasTussenstandToe } from '../bewerken/tussenstand';
import type { BewerktVers, Tussenstand } from '../bewerken/types';
import { versAdres } from './adres';
import { groepeerPerVers, type VersGroep } from './groepeerPerVers';
import { Naslagkaart } from './Naslagkaart';
import { wisselNaslag, type Naslag, type OpenNaslag } from './naslag';
import { Regels } from './Regels';
import { statusKlasse } from './Zijbalk';
import { vragenBijVers } from './vertaalvragen';
import { BewerkbaarVers } from './bewerken/BewerkbaarVers';
import { Hoofdstukacties } from './naarWord/Hoofdstukacties';
import { VersTekst } from './VersTekst';
import { VertaalregelsCel } from './verzen/VertaalregelsCel';

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
	/** De tussenstand van dit hoofdstuk, door de pagina gelezen omdat de acties in de bovenbalk dezelfde stand nodig hebben. */
	tussenstand: Tussenstand;
	herlees: () => void;
	/** `volledig`: titel, status en acties staan in het hoofdstuk. `in-balk`: die staan in de bovenbalk en het hoofdstuk toont alleen de melding bij een goedgekeurd hoofdstuk. */
	kop: 'volledig' | 'in-balk';
};

/** Wat bij één vers hoort aan regels uit het log en vragen. */
type VersRegels = {
	logVerzen: readonly LogVers[];
	vragen: readonly OpenVraag[];
	heeftVraag: boolean;
};

function versRegels(groep: VersGroep, hoofdstuk: HoofdstukData, referentie: Referentie): VersRegels {
	const nummer = groep.nummer;
	const logVerzen = nummer === null ? [] : hoofdstuk.log.verzen.filter((logVers) => logVers.verzen.includes(nummer));
	const vragen = nummer === null ? [] : vragenBijVers(referentie.openVragen, hoofdstuk.nummer, nummer);
	const heeftVraag = vragen.length > 0 || logVerzen.some((logVers) => logVers.vragen.length > 0);
	return { logVerzen, vragen, heeftVraag };
}

export function HoofdstukScherm({
	boek,
	referentie,
	hoofdstuk,
	info,
	gekozenVers,
	regelsAltijdZichtbaar,
	onWisselRegels,
	tussenstand,
	herlees,
	kop,
}: Props) {
	const [bewerktAdres, zetBewerktAdres] = useState<string | null>(null);
	const [openNaslag, zetOpenNaslag] = useState<OpenNaslag | null>(null);
	const verwijzing = useRef<HTMLElement | null>(null);
	const weergave = pasTussenstandToe(hoofdstuk.vereenvoudigd, tussenstand);
	const groepen = groepeerPerVers(hoofdstuk.bron, weergave);
	const adresVan = (nummer: number | null) => (nummer === null ? null : versAdres(boek.id, hoofdstuk.nummer, nummer));

	const sluitNaslag = useCallback(() => {
		zetOpenNaslag(null);
		if (verwijzing.current?.isConnected) verwijzing.current.focus();
	}, []);
	const openNaslagBij = (rij: number, naslag: Naslag, opener: HTMLElement) => {
		verwijzing.current = opener;
		zetOpenNaslag(wisselNaslag(openNaslag, rij, naslag));
	};

	return (
		<article class="hoofdstuk">
			{kop === 'volledig' ? (
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
			) : (
				info.status === 'goedgekeurd' && (
					<header>
						<p class="goedgekeurd">{LABEL_GOEDGEKEURD}</p>
					</header>
				)
			)}
			<table class="verzen verzen-dicht">
				<thead>
					<tr>
						<th scope="col">Vers</th>
						<th scope="col">Bron</th>
						<th scope="col">Vereenvoudigd</th>
						{regelsAltijdZichtbaar && <th scope="col">Vertaalregels</th>}
					</tr>
				</thead>
				<tbody>
					{groepen.map((groep, index) => (
						<VersRij
							groep={groep}
							boek={boek}
							hoofdstuk={hoofdstuk}
							referentie={referentie}
							geselecteerd={groep.nummer !== null && groep.nummer === gekozenVers}
							regelsInKolom={regelsAltijdZichtbaar}
							openNaslag={openNaslag?.rij === index ? openNaslag.naslag : null}
							onOpenNaslag={(naslag, opener) => openNaslagBij(index, naslag, opener)}
							onSluitNaslag={sluitNaslag}
							bewerkt={groep.nummer === null ? null : (tussenstand.verzen[groep.nummer] ?? null)}
							bewerken={bewerktAdres !== null && bewerktAdres === adresVan(groep.nummer)}
							onBewerk={() => zetBewerktAdres(adresVan(groep.nummer))}
							onSluit={() => zetBewerktAdres(null)}
							onOpslagGewijzigd={herlees}
						/>
					))}
				</tbody>
			</table>
			<p class="regelsschakelaar">
				<button type="button" aria-pressed={regelsAltijdZichtbaar} onClick={onWisselRegels}>
					Vertaalregels altijd tonen
				</button>
				<span> Klik in de vereenvoudigde tekst om een vers te bewerken.</span>
				{!regelsAltijdZichtbaar && <span> Klik op een vers om de vertaalregels erbij te zien.</span>}
			</p>
		</article>
	);
}

type VersRijProps = {
	groep: VersGroep;
	boek: BoekData;
	hoofdstuk: HoofdstukData;
	referentie: Referentie;
	geselecteerd: boolean;
	/** De vertaalregels staan in een eigen kolom; anders onder het vers als het gekozen is. */
	regelsInKolom: boolean;
	/** De naslag die als kaart onder dit vers open staat, of `null`. */
	openNaslag: Naslag | null;
	onOpenNaslag: (naslag: Naslag, verwijzing: HTMLElement) => void;
	onSluitNaslag: () => void;
	/** De bewaarde bewerking van dit vers; `null` als het vers gelijk is aan de repo. */
	bewerkt: BewerktVers | null;
	bewerken: boolean;
	onBewerk: () => void;
	onSluit: () => void;
	onOpslagGewijzigd: () => void;
};

export function VersRij({
	groep,
	boek,
	hoofdstuk,
	referentie,
	geselecteerd,
	regelsInKolom,
	openNaslag,
	onOpenNaslag,
	onSluitNaslag,
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
	const { logVerzen, vragen, heeftVraag } = versRegels(groep, hoofdstuk, referentie);
	const kaartId = `vers-${nummer}-naslag`;
	const regels = (gekapt: boolean) => (
		<Regels logVerzen={logVerzen} vragen={vragen} gekapt={gekapt} openNaslag={openNaslag} kaartId={kaartId} onOpenNaslag={onOpenNaslag} />
	);

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
				{regelsInKolom && <VertaalregelsCel nummer={nummer} naslagOpen={openNaslag !== null} regels={regels} />}
			</tr>
			{!regelsInKolom && geselecteerd && (
				<tr class="regels-onder">
					<td colSpan={KOLOMMEN_ZONDER_REGELS}>{regels(false)}</td>
				</tr>
			)}
			{openNaslag !== null && (
				<tr class="naslagrij">
					<td colSpan={regelsInKolom ? KOLOMMEN_ZONDER_REGELS + 1 : KOLOMMEN_ZONDER_REGELS}>
						<Naslagkaart naslag={openNaslag} boekId={boek.id} referentie={referentie} id={kaartId} onSluit={onSluitNaslag} />
					</td>
				</tr>
			)}
		</>
	);
}
