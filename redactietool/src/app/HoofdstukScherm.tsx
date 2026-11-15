import type { VNode } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { BoekData, HoofdstukData, HoofdstukInfo, LogVers, OpenVraag, Referentie } from '../data/types';
import { pasTussenstandToe } from '../bewerken/tussenstand';
import type { BewerktVers } from '../bewerken/types';
import { versAdres } from './adres';
import { groepeerPerVers, type VersGroep } from './groepeerPerVers';
import { naslagPlek, regelsWeergave, type LayoutProef, type RegelsWeergave } from './layoutProef';
import type { Naslag } from './naslag';
import { aantalRegels, Regels, RegelsSamenvatting } from './Regels';
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
	/** De lay-outproef uit het adres; `null` laat de tool zoals hij is. */
	layout: LayoutProef | null;
	/** Het geopende naslagpaneel, alleen voor de proeven waarin het in de tabel zelf staat (p2 en p3); anders `null`. */
	naslagPaneel: VNode | null;
	onWisselRegels: () => void;
	onOpenNaslag: (naslag: Naslag) => void;
};

/** Wat bij één vers hoort aan regels uit het log en vragen. */
type VersRegels = {
	logVerzen: readonly LogVers[];
	vragen: readonly OpenVraag[];
	aantal: number;
	heeftVraag: boolean;
};

export function versRegels(groep: VersGroep, hoofdstuk: HoofdstukData, referentie: Referentie): VersRegels {
	const nummer = groep.nummer;
	const logVerzen = nummer === null ? [] : hoofdstuk.log.verzen.filter((logVers) => logVers.verzen.includes(nummer));
	const vragen = nummer === null ? [] : vragenBijVers(referentie.openVragen, hoofdstuk.nummer, nummer);
	const heeftVraag = vragen.length > 0 || logVerzen.some((logVers) => logVers.vragen.length > 0);
	return { logVerzen, vragen, aantal: aantalRegels(logVerzen), heeftVraag };
}

function heeftInhoud(regels: VersRegels): boolean {
	return regels.aantal > 0 || regels.heeftVraag;
}

/** De vierde kolom bij p2: de naslag neemt in de eerste rij de plek van alle vertaalregels over. */
type NaslagKolom = { soort: 'geen' } | { soort: 'begin'; rijen: number; paneel: VNode } | { soort: 'verder' };

export function HoofdstukScherm({
	boek,
	referentie,
	hoofdstuk,
	info,
	gekozenVers,
	regelsAltijdZichtbaar,
	layout,
	naslagPaneel,
	onWisselRegels,
	onOpenNaslag,
}: Props) {
	const { tussenstand, herlees } = useTussenstand(boek.id, hoofdstuk.nummer);
	const [bewerktAdres, zetBewerktAdres] = useState<string | null>(null);
	const [uitgeklapt, zetUitgeklapt] = useState<ReadonlySet<number>>(new Set());
	const [vastgezet, zetVastgezet] = useState<number | null>(null);
	const [naslagBij, zetNaslagBij] = useState(0);
	const weergave = pasTussenstandToe(hoofdstuk.vereenvoudigd, tussenstand);
	const groepen = groepeerPerVers(hoofdstuk.bron, weergave);
	const adresVan = (nummer: number | null) => (nummer === null ? null : versAdres(boek.id, hoofdstuk.nummer, nummer));
	const plek = regelsWeergave(layout, regelsAltijdZichtbaar);
	const naslagInKolom = naslagPaneel !== null && naslagPlek(layout) === 'kolom';
	const naslagKaartBij = naslagPaneel !== null && naslagPlek(layout) === 'kaart' ? Math.min(naslagBij, groepen.length - 1) : -1;

	useEffect(() => {
		if (vastgezet === null) return;
		const bijToets = (gebeurtenis: KeyboardEvent) => {
			if (gebeurtenis.key === 'Escape') zetVastgezet(null);
		};
		window.addEventListener('keydown', bijToets);
		return () => window.removeEventListener('keydown', bijToets);
	}, [vastgezet]);

	const metInhoud = groepen.flatMap((groep, index) => (heeftInhoud(versRegels(groep, hoofdstuk, referentie)) ? [index] : []));
	const allesUitgeklapt = metInhoud.length > 0 && metInhoud.every((index) => uitgeklapt.has(index));
	const wisselAlles = () => zetUitgeklapt(allesUitgeklapt ? new Set() : new Set(metInhoud));
	const wisselUitklappen = (index: number) => {
		const volgende = new Set(uitgeklapt);
		if (!volgende.delete(index)) volgende.add(index);
		zetUitgeklapt(volgende);
	};

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
						<th scope="col">
							{plek === 'uitklapbaar' ? (
								<div class="kopmetknop">
									<span>Vereenvoudigd</span>
									<button type="button" class="alleregels" aria-pressed={allesUitgeklapt} onClick={wisselAlles}>
										{allesUitgeklapt ? 'Alle vertaalregels inklappen' : 'Alle vertaalregels uitklappen'}
									</button>
								</div>
							) : (
								'Vereenvoudigd'
							)}
						</th>
						{plek === 'kolom' && (
							<th scope="col">{naslagInKolom ? 'Naslag' : 'Vertaalregels'}</th>
						)}
					</tr>
				</thead>
				<tbody>
					{groepen.map((groep, index) => {
						const geselecteerd = groep.nummer !== null && groep.nummer === gekozenVers;
						return (
							<VersRij
								groep={groep}
								boek={boek}
								hoofdstuk={hoofdstuk}
								regels={versRegels(groep, hoofdstuk, referentie)}
								geselecteerd={geselecteerd}
								plek={plek}
								uitgeklapt={uitgeklapt.has(index)}
								onWisselUitklappen={() => wisselUitklappen(index)}
								vastgezet={vastgezet === index}
								onWisselVastzetten={() => zetVastgezet(vastgezet === index ? null : index)}
								naslagKolom={naslagKolom(naslagInKolom, naslagPaneel, index, groepen.length)}
								naslagKaart={index === naslagKaartBij ? naslagPaneel : null}
								onOpenNaslag={(naslag) => {
									zetNaslagBij(index);
									onOpenNaslag(naslag);
								}}
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
				{(plek === 'kolom' || plek === 'onder-gekozen') && (
					<button type="button" aria-pressed={regelsAltijdZichtbaar} onClick={onWisselRegels}>
						Vertaalregels altijd tonen
					</button>
				)}
				<span> Klik in de vereenvoudigde tekst om een vers te bewerken.</span>
				{plek === 'onder-gekozen' && <span> Klik op een vers om de vertaalregels erbij te zien.</span>}
			</p>
		</article>
	);
}

function naslagKolom(inKolom: boolean, paneel: VNode | null, index: number, aantalRijen: number): NaslagKolom {
	if (!inKolom || paneel === null) return { soort: 'geen' };
	return index === 0 ? { soort: 'begin', rijen: aantalRijen, paneel } : { soort: 'verder' };
}

type VersRijProps = {
	groep: VersGroep;
	boek: BoekData;
	hoofdstuk: HoofdstukData;
	regels: VersRegels;
	geselecteerd: boolean;
	plek: RegelsWeergave;
	/** Alleen bij `uitklapbaar`. */
	uitgeklapt: boolean;
	onWisselUitklappen: () => void;
	/** Alleen bij `zwevend`: het vak blijft staan tot Escape of een tweede klik. */
	vastgezet: boolean;
	onWisselVastzetten: () => void;
	naslagKolom: NaslagKolom;
	/** Het naslagpaneel als kaart onder dit vers (p3); anders `null`. */
	naslagKaart: VNode | null;
	onOpenNaslag: (naslag: Naslag) => void;
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
	regels: versregels,
	geselecteerd,
	plek,
	uitgeklapt,
	onWisselUitklappen,
	vastgezet,
	onWisselVastzetten,
	naslagKolom: kolom,
	naslagKaart,
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
	const { logVerzen, vragen, aantal, heeftVraag } = versregels;
	const inhoud = heeftInhoud(versregels);
	const regels = (kapAf: boolean) => (
		<Regels logVerzen={logVerzen} vragen={vragen} kapAf={kapAf} onOpenNaslag={onOpenNaslag} />
	);
	const regelsId = `vers-${nummer}-regels`;
	const knoplabel = aantal === 0 ? 'vraag' : `${aantal} ${aantal === 1 ? 'vertaalregel' : 'vertaalregels'}`;

	const kiesVers = (gebeurtenis: MouseEvent) => {
		const opInteractiefElement = (gebeurtenis.target as Element).closest('a, button, summary, [contenteditable]') !== null;
		if (adres !== null && !opInteractiefElement) {
			window.location.hash = adres;
		}
	};

	const rijKlassen = ['vers', geselecteerd ? 'vers-gekozen' : '', vastgezet ? 'regels-vast' : '', plek === 'onder-altijd' && inhoud ? 'met-regels-eronder' : '']
		.filter((klasse) => klasse !== '')
		.join(' ');

	return (
		<>
			<tr
				ref={rijRef}
				id={nummer === null ? undefined : `vers-${nummer}`}
				class={rijKlassen}
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
					{plek === 'zwevend' && inhoud && (
						<>
							<button type="button" class="regelsvastzetter" aria-expanded={vastgezet} aria-controls={regelsId} onClick={onWisselVastzetten}>
								<span class="regelsknoplabel">{knoplabel}</span>
								<RegelsSamenvatting logVerzen={logVerzen} />
							</button>
							<div class="regelsvak" id={regelsId}>
								{regels(false)}
							</div>
						</>
					)}
				</td>
				{plek === 'kolom' && kolom.soort === 'geen' && <td class="regels">{regels(true)}</td>}
				{kolom.soort === 'begin' && (
					<td class="naslagkolom" rowSpan={kolom.rijen}>
						{kolom.paneel}
					</td>
				)}
			</tr>
			{plek === 'onder-gekozen' && geselecteerd && (
				<tr class="regels-onder">
					<td colSpan={KOLOMMEN_ZONDER_REGELS}>{regels(false)}</td>
				</tr>
			)}
			{plek === 'onder-altijd' && inhoud && (
				<tr class="regels-onder">
					<td colSpan={KOLOMMEN_ZONDER_REGELS}>
						<div class="regels-altijd">{regels(false)}</div>
					</td>
				</tr>
			)}
			{plek === 'uitklapbaar' && inhoud && (
				<tr class="regels-onder">
					<td colSpan={KOLOMMEN_ZONDER_REGELS}>
						<div class="regelsknoprij">
							<button type="button" class="regelsknop" aria-expanded={uitgeklapt} aria-controls={regelsId} onClick={onWisselUitklappen}>
								{knoplabel} <span aria-hidden="true">{uitgeklapt ? '▴' : '▾'}</span>
							</button>
							{!uitgeklapt && <RegelsSamenvatting logVerzen={logVerzen} />}
							{aantal > 0 && heeftVraag && <span class="vraagwoord">vraag</span>}
						</div>
						<div class="regels-uitgeklapt" id={regelsId} hidden={!uitgeklapt}>
							{uitgeklapt && regels(false)}
						</div>
					</td>
				</tr>
			)}
			{naslagKaart !== null && (
				<tr class="naslagkaart">
					<td colSpan={plek === 'kolom' ? KOLOMMEN_ZONDER_REGELS + 1 : KOLOMMEN_ZONDER_REGELS}>{naslagKaart}</td>
				</tr>
			)}
		</>
	);
}
