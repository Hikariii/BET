import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { leesTussenstand, pasTussenstandToe, type Opslag } from '../../bewerken/tussenstand';
import type { BoekData, HoofdstukData, Referentie, Status } from '../../data/types';
import { laadAlleHoofdstukken, laadBoek, laadReferentie } from '../gegevens';
import { Vervangen } from '../begrippen/Vervangen';
import { useLaden } from '../hooks';
import { Hoofdstukacties } from '../naarWord/Hoofdstukacties';
import { Zijbalk } from '../Zijbalk';
import { vervangBrowseropslag } from './geheugenopslag';
import { BEWERKEN, BIJBELTEKST, NASLAG, VERSRIJ, type VersOnderdeel } from './toestanden';
import { VersVoorbeeld } from './VersVoorbeeld';
import { GALERIJ_BOEK, HOOFDSTUK_MET_ACTIES, maakVoorbeeldopslag, VERZEN, ZOEKOPDRACHT } from './voorbeelden';
import './galerij.css';

type Gegevens = { boek: BoekData; referentie: Referentie; hoofdstukken: HoofdstukData[] };

async function laadGegevens(): Promise<Gegevens> {
	const boek = await laadBoek(GALERIJ_BOEK);
	const [referentie, hoofdstukken] = await Promise.all([laadReferentie(GALERIJ_BOEK), laadAlleHoofdstukken(boek)]);
	return { boek, referentie, hoofdstukken };
}

/**
 * De galerij: de componenten van de tool in hun lastige toestanden, met de echte gegevens van het boek.
 * Bewerkingen blijven in het geheugen van deze pagina; de opslag van de browser blijft ongemoeid.
 */
export function Galerij() {
	const gegevens = useLaden(laadGegevens, []);
	return (
		<div class="indeling galerij">
			<main>
				<h1>Galerij</h1>
				<p class="galerij-intro">
					De componenten van de tool in hun lastige toestanden, met de gegevens van {GALERIJ_BOEK}. Dit zijn de echte componenten: zie je hier
					iets veranderen, dan verandert het in de tool. Bewerkingen blijven in het geheugen van deze pagina.
				</p>
				{gegevens.soort === 'laden' && <p class="melding">De galerij wordt geladen.</p>}
				{gegevens.soort === 'fout' && (
					<p class="melding" role="alert">
						De galerij kon niet geladen worden: {gegevens.melding}
					</p>
				)}
				{gegevens.soort === 'klaar' && <GalerijMetOpslag {...gegevens.waarde} />}
			</main>
		</div>
	);
}

/** Zet de opslag in het geheugen op zijn plaats voordat de schermen hem lezen, en haalt hem weg bij verlaten. */
function GalerijMetOpslag(gegevens: Gegevens) {
	const [opslag] = useState(() => maakVoorbeeldopslag(gegevens.boek.id, gegevens.hoofdstukken));
	const [opslagKlaar, zetOpslagKlaar] = useState(false);
	useLayoutEffect(() => {
		const herstel = vervangBrowseropslag(opslag);
		zetOpslagKlaar(true);
		return herstel;
	}, [opslag]);

	// De editors nemen bij het laden de focus en scrollen naar zich toe, ook na de wijziging die `wijzigTekstInEditor` doet (in het eerste beeld);
	// de pagina begint bovenaan, zonder focus in een editor.
	useEffect(() => {
		if (!opslagKlaar) return;
		let beeld = requestAnimationFrame(() => {
			beeld = requestAnimationFrame(() => {
				if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
				window.scrollTo(0, 0);
			});
		});
		return () => cancelAnimationFrame(beeld);
	}, [opslagKlaar]);

	return opslagKlaar ? <Toestanden {...gegevens} opslag={opslag} /> : null;
}

function Toestanden({ opslag, ...gegevens }: Gegevens & { opslag: Opslag }) {
	return (
		<>
			<VersOnderdeelWeergave {...gegevens} onderdeel={BIJBELTEKST} />
			<VersOnderdeelWeergave {...gegevens} onderdeel={VERSRIJ} />
			<VersOnderdeelWeergave {...gegevens} onderdeel={NASLAG} />
			<VersOnderdeelWeergave {...gegevens} onderdeel={BEWERKEN} />
			<ZijbalkItems boek={gegevens.boek} referentie={gegevens.referentie} />
			<KnoppenEnMeldingen {...gegevens} opslag={opslag} />
			<VervangenTab {...gegevens} />
		</>
	);
}

function Onderdeel({ titel, children }: { titel: string; children: ComponentChildren }) {
	return (
		<section class="galerij-onderdeel">
			<h2>{titel}</h2>
			{children}
		</section>
	);
}

function Toestand({ titel, notitie, children }: { titel: string; notitie: string; children: ComponentChildren }) {
	return (
		<section class="galerij-toestand">
			<h3>{titel}</h3>
			<p class="galerij-notitie">{notitie}</p>
			{children}
		</section>
	);
}

function VersOnderdeelWeergave({ onderdeel, boek, referentie, hoofdstukken }: Gegevens & { onderdeel: VersOnderdeel }) {
	return (
		<Onderdeel titel={onderdeel.titel}>
			{onderdeel.toestanden.map(({ titel, verwijzing, notitie, weergave, naPlaatsen }) => {
				const hoofdstuk = hoofdstukken.find((kandidaat) => kandidaat.nummer === verwijzing.hoofdstuk);
				if (hoofdstuk === undefined) throw new Error(`Hoofdstuk ${verwijzing.hoofdstuk} staat niet in de gegevens.`);
				return (
					<Toestand key={titel} titel={titel} notitie={`${boek.naam} ${verwijzing.hoofdstuk}:${verwijzing.vers}. ${notitie}`}>
						<VersVoorbeeld
							boek={boek}
							referentie={referentie}
							hoofdstuk={hoofdstuk}
							vers={verwijzing.vers}
							bewerkenBijStart={weergave === 'bewerken'}
							gekozen={weergave === 'gekozen'}
							naPlaatsen={naPlaatsen}
						/>
					</Toestand>
				);
			})}
		</Onderdeel>
	);
}

type Hoofdstukinfo = BoekData['hoofdstukken'][number];

const AANTAL_HOOFDSTUKKEN_IN_ZIJBALK = 8;

/** Statussen die in het echte boek niet naast elkaar voorkomen; de gewone is review. */
const STATUSSEN_ZIJBALK: Status[] = ['goedgekeurd', 'review', 'review', 'review', 'bij editor', 'verwerkt', 'concept', 'nog niet begonnen'];

function metStatussen(hoofdstukken: Hoofdstukinfo[]): Hoofdstukinfo[] {
	return hoofdstukken.map((hoofdstuk, plek) => ({ ...hoofdstuk, status: STATUSSEN_ZIJBALK[plek] ?? hoofdstuk.status }));
}

function ZijbalkItems({ boek, referentie }: { boek: BoekData; referentie: Referentie }) {
	const eerste = boek.hoofdstukken.slice(0, AANTAL_HOOFDSTUKKEN_IN_ZIJBALK);
	const huidig = VERZEN.metOpenVraag.hoofdstuk;
	const echt: BoekData = { ...boek, hoofdstukken: eerste };
	const gemengd: BoekData = { ...boek, hoofdstukken: metStatussen(boek.hoofdstukken.slice(3, 3 + AANTAL_HOOFDSTUKKEN_IN_ZIJBALK)) };
	return (
		<Onderdeel titel="Zijbalk">
			<Toestand
				titel="Goedgekeurd, gewone status, actief en met vragen"
				notitie={`De eerste ${AANTAL_HOOFDSTUKKEN_IN_ZIJBALK} hoofdstukken zoals ze zijn. De gewone status staat niet bij elk hoofdstuk; hoofdstuk ${huidig} is open.`}
			>
				<div class="galerij-zijbalk">
					<Zijbalk boek={echt} referentie={referentie} huidigHoofdstuk={huidig} begrippenOpen={false} />
				</div>
			</Toestand>
			<Toestand
				titel="Elke status"
				notitie="Dezelfde zijbalk met een andere status per hoofdstuk, zodat elke status voorkomt. Het scherm Begrippen is actief."
			>
				<div class="galerij-zijbalk">
					<Zijbalk boek={gemengd} referentie={referentie} huidigHoofdstuk={null} begrippenOpen />
				</div>
			</Toestand>
		</Onderdeel>
	);
}

function KnoppenEnMeldingen({ boek, referentie, hoofdstukken, opslag }: Gegevens & { opslag: Opslag }) {
	const hoofdstuk = hoofdstukken.find((kandidaat) => kandidaat.nummer === HOOFDSTUK_MET_ACTIES);
	if (hoofdstuk === undefined) throw new Error(`Hoofdstuk ${HOOFDSTUK_MET_ACTIES} staat niet in de gegevens.`);
	const tussenstand = leesTussenstand(opslag, boek.id, hoofdstuk.nummer);
	const weergave = pasTussenstandToe(hoofdstuk.vereenvoudigd, tussenstand);
	return (
		<Onderdeel titel="Knoppen en meldingen">
			<Toestand
				titel="Hoofdactie en gewone knop"
				notitie="De acties van een hoofdstuk: de hoofdactie is rood, de andere knop gewoon. De melding eronder (role=status) komt van de bewerkingen in dit hoofdstuk."
			>
				<Hoofdstukacties boek={boek} repo={hoofdstuk} weergave={weergave} tussenstand={tussenstand} openVragen={referentie.openVragen} />
			</Toestand>
			<Toestand titel="Gewone knop en uitgeschakelde knop" notitie="Een knop zonder bijzondere rol, en dezelfde knop als hij niets kan doen.">
				<p class="galerij-knoppen">
					<button type="button">Gewone knop</button>
					<button type="button" disabled>
						Uitgeschakelde knop
					</button>
				</p>
			</Toestand>
			<Toestand titel="Melding bij laden en fout" notitie="De meldingen van het scherm: een gewone melding en een fout (role=alert).">
				<p class="melding">Het boek wordt geladen.</p>
				<p class="melding" role="alert">
					Het boek kon niet geladen worden: lukas/boek.json: 404 Not Found
				</p>
			</Toestand>
		</Onderdeel>
	);
}

/** Vult het formulier van Vervangen in en zoekt, zoals de redacteur zou doen. */
function VervangenTab({ boek, referentie, hoofdstukken }: Gegevens) {
	const houder = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const formulier = houder.current?.querySelector('form');
		if (formulier === null || formulier === undefined) return;
		const [zoek, nieuw] = formulier.querySelectorAll<HTMLInputElement>('input[type="text"]');
		if (zoek === undefined || nieuw === undefined) return;
		zoek.value = ZOEKOPDRACHT.zoek;
		zoek.dispatchEvent(new Event('input', { bubbles: true }));
		nieuw.value = ZOEKOPDRACHT.nieuw;
		nieuw.dispatchEvent(new Event('input', { bubbles: true }));
		// Eerst laten de invoervelden hun waarde in de toestand van het scherm zetten, dan zoeken.
		const beeld = requestAnimationFrame(() => formulier.requestSubmit());
		return () => cancelAnimationFrame(beeld);
	}, []);
	return (
		<Onderdeel titel="Vervangen">
			<Toestand
				titel="Vondsten, goedgekeurd en met de hand"
				notitie={`Zoeken naar "${ZOEKOPDRACHT.zoek}": plekken in open hoofdstukken, in goedgekeurde hoofdstukken (standaard uit) en plekken over een opmaakgrens (met de hand).`}
			>
				<div ref={houder}>
					<Vervangen boek={boek} referentie={referentie} hoofdstukken={hoofdstukken} />
				</div>
			</Toestand>
		</Onderdeel>
	);
}
