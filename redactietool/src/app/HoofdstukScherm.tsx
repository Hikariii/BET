import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { BoekData, HoofdstukData, HoofdstukInfo, LogVers, OpenVraag, Referentie } from '../data/types';
import { pasTussenstandToe } from '../bewerken/tussenstand';
import type { BewerktVers, Tussenstand } from '../bewerken/types';
import { versAdres } from './adres';
import { groepeerPerVers, type VersGroep } from './groepeerPerVers';
import { maakVersVraagAdres } from './begrippen/vraagAdres';
import { Naslagkaart } from './Naslagkaart';
import { wisselNaslag, type Naslag, type OpenNaslag } from './naslag';
import { knipVers } from '../bewerken/versknip';
import type { Richting } from '../editor/versEditorPlugins';
import { buurVers } from './navigatie/toetsenbord';
import { useSprongNaarVers } from './navigatie/useSprongNaarVers';
import { Regels } from './Regels';
import { vragenBijVers } from './vertaalvragen';
import { BewerkbaarVers } from './bewerken/BewerkbaarVers';
import { VersTekst } from './VersTekst';
import { VertaalregelsCel } from './verzen/VertaalregelsCel';

const LABEL_GOEDGEKEURD = 'Goedgekeurd, referentie voor de rest van het boek. Wijzigingen gaan opnieuw langs de redactie.';

const KOLOMMEN = 4;

type Props = {
	boek: BoekData;
	referentie: Referentie;
	hoofdstuk: HoofdstukData;
	info: HoofdstukInfo;
	gekozenVers: number | null;
	/** De tussenstand van dit hoofdstuk, door de pagina gelezen omdat de acties in de bovenbalk dezelfde stand nodig hebben. */
	tussenstand: Tussenstand;
	herlees: () => void;
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
	tussenstand,
	herlees,
}: Props) {
	const [bewerktAdres, zetBewerktAdres] = useState<string | null>(null);
	const [geopendMetPijl, zetGeopendMetPijl] = useState(false);
	const [openNaslag, zetOpenNaslag] = useState<OpenNaslag | null>(null);
	const verwijzing = useRef<HTMLElement | null>(null);
	const weergave = pasTussenstandToe(hoofdstuk.vereenvoudigd, tussenstand);
	const groepen = groepeerPerVers(hoofdstuk.bron, weergave);
	const vraagAdresBij = useMemo(() => maakVersVraagAdres(boek.id, referentie.openVragen, hoofdstuk), [boek.id, referentie, hoofdstuk]);
	const adresVan = (nummer: number | null) => (nummer === null ? null : versAdres(boek.id, hoofdstuk.nummer, nummer));

	const bewerkbareVerzen = () =>
		groepen.flatMap((groep) => (groep.nummer !== null && knipVers(hoofdstuk.vereenvoudigd, groep.nummer) !== null ? [groep.nummer] : []));
	const bewerkBuur = (vanaf: number, richting: Richting) => {
		const buur = buurVers(bewerkbareVerzen(), vanaf, richting);
		if (buur === null) return;
		zetGeopendMetPijl(true);
		zetBewerktAdres(adresVan(buur));
	};

	useSprongNaarVers(bewerkbareVerzen);

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
			{info.status === 'goedgekeurd' && (
				<header>
					<p class="goedgekeurd">{LABEL_GOEDGEKEURD}</p>
				</header>
			)}
			<table class="verzen verzen-dicht">
				<thead>
					<tr>
						<th scope="col">Vers</th>
						<th scope="col">Bron</th>
						<th scope="col">Vereenvoudigd</th>
						<th scope="col" data-help="vertaalregels-kolom">
							Vertaalregels
						</th>
					</tr>
				</thead>
				<tbody>
					{groepen.map((groep, index) => (
						<VersRij
							groep={groep}
							boek={boek}
							hoofdstuk={hoofdstuk}
							referentie={referentie}
							vraagAdres={groep.nummer === null ? null : vraagAdresBij(groep.nummer)}
							geselecteerd={groep.nummer !== null && groep.nummer === gekozenVers}
							openNaslag={openNaslag?.rij === index ? openNaslag.naslag : null}
							onOpenNaslag={(naslag, opener) => openNaslagBij(index, naslag, opener)}
							onSluitNaslag={sluitNaslag}
							bewerkt={groep.nummer === null ? null : (tussenstand.verzen[groep.nummer] ?? null)}
							bewerken={bewerktAdres !== null && bewerktAdres === adresVan(groep.nummer)}
							beginAanBegin={geopendMetPijl}
							onBewerk={() => {
								zetGeopendMetPijl(false);
								zetBewerktAdres(adresVan(groep.nummer));
							}}
							onSluit={() => zetBewerktAdres(null)}
							onNaarBuur={(richting) => groep.nummer !== null && bewerkBuur(groep.nummer, richting)}
							onOpslagGewijzigd={herlees}
						/>
					))}
				</tbody>
			</table>
		</article>
	);
}

type VersRijProps = {
	groep: VersGroep;
	boek: BoekData;
	hoofdstuk: HoofdstukData;
	referentie: Referentie;
	/** Het adres van de eerste vertaalvraag bij dit vers op Vertaalvragen, of `null`. */
	vraagAdres: string | null;
	geselecteerd: boolean;
	/** De vertaalregels staan in een eigen kolom; anders onder het vers als het gekozen is. */
	/** De naslag die als kaart onder dit vers open staat, of `null`. */
	openNaslag: Naslag | null;
	onOpenNaslag: (naslag: Naslag, verwijzing: HTMLElement) => void;
	onSluitNaslag: () => void;
	/** De bewaarde bewerking van dit vers; `null` als het vers gelijk is aan de repo. */
	bewerkt: BewerktVers | null;
	bewerken: boolean;
	/** De editor is met Alt+pijl vanuit een ander vers geopend. */
	beginAanBegin: boolean;
	onBewerk: () => void;
	onSluit: () => void;
	onNaarBuur: (richting: Richting) => void;
	onOpslagGewijzigd: () => void;
};

export function VersRij({
	groep,
	boek,
	hoofdstuk,
	referentie,
	vraagAdres,
	geselecteerd,
	openNaslag,
	onOpenNaslag,
	onSluitNaslag,
	bewerkt,
	bewerken,
	beginAanBegin,
	onBewerk,
	onSluit,
	onNaarBuur,
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
		<Regels boekId={boek.id} vraagAdres={vraagAdres} logVerzen={logVerzen} vragen={vragen} gekapt={gekapt} openNaslag={openNaslag} kaartId={kaartId} onOpenNaslag={onOpenNaslag} />
	);

	return (
		<>
			<tr
				ref={rijRef}
				id={nummer === null ? undefined : `vers-${nummer}`}
				class={geselecteerd ? 'vers vers-gekozen' : 'vers'}
				aria-current={geselecteerd ? 'location' : undefined}
			>
				<th scope="row" class="versnummer">
					{adres === null ? null : <a href={adres}>{nummer}</a>}
					{heeftVraag &&
						(vraagAdres === null ? (
							<span class="vraagmarkering" data-help="vraagmarkering" role="img" aria-label="Dit vers hoort bij een vertaalvraag" title="Vertaalvraag">
								?
							</span>
						) : (
							<a class="vraagmarkering" data-help="vraagmarkering" href={vraagAdres} aria-label="Dit vers hoort bij een vertaalvraag. Naar de vraag" title="Naar de vertaalvraag bij dit vers">
								?
							</a>
						))}
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
							beginAanBegin={beginAanBegin}
							onBewerk={onBewerk}
							onSluit={onSluit}
							onNaarBuur={onNaarBuur}
							onOpslagGewijzigd={onOpslagGewijzigd}
						/>
					)}
				</td>
				<VertaalregelsCel nummer={nummer} naslagOpen={openNaslag !== null} regels={regels} />
			</tr>
			{openNaslag !== null && (
				<tr class="naslagrij">
					<td colSpan={KOLOMMEN}>
						<Naslagkaart naslag={openNaslag} boekId={boek.id} referentie={referentie} id={kaartId} onSluit={onSluitNaslag} />
					</td>
				</tr>
			)}
		</>
	);
}
