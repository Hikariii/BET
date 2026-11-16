import type { ComponentChildren, RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { leesAntwoorden, type Antwoord } from '../../antwoorden/antwoorden';
import { leesTussenstand } from '../../bewerken/tussenstand';
import type { VersRef, WordStijl } from '../../data/types';
import { DOMEINEN, type Domein } from '../../formaat/types';
import { draaiKeuzeTerug, draaiVersTerug, leesKeuzes, pasOpdrachtToe, type StructureleKeuze } from '../../vervangen/keuzes';
import { neemVoorstel, sessieopslag, type Voorstel } from '../../vervangen/voorstel';
import { zoekPlekken, type Bereik, type Plek, type Zoekopdracht } from '../../vervangen/zoekopdracht';
import type { HoofdstukVerzen } from '../../vervangen/types';
import { versAdres } from '../adres';
import { browseropslag } from '../bewerken/useTussenstand';
import { tekststukOpmaakstijl } from '../stijl';
import type { TabbladProps } from './tabbladProps';
import { ToegepasteKeuzes } from './ToegepasteKeuzes';
import {
	bouwHoofdstukVerzen,
	groepeerPlekken,
	kiesBereik,
	kortUit,
	optieOmschrijving,
	plekken as plekkenTekst,
	standaardAangevinkt,
	verdeelPlekken,
	vondstSleutel,
} from './vervangenVoorbeeld';
import './vervangen.css';

type Soort = Zoekopdracht['soort'];

/** De vraag waaraan de zoekopdracht gekoppeld is: wat het voorstel meegaf. */
type Vraagkoppeling = { kwestie: string; optie: string; verzen: VersRef[] };

/** Wat het voorbeeldvenster bij een plek toont: de nieuwe tekst (`null`: niets te vervangen) of de markering voor en na. */
type Wijziging = { soort: 'tekst'; nieuw: string | null } | { soort: 'markering'; van: Domein; naar: Domein };

function Markering({ domein, stijlen, children }: { domein: Domein; stijlen: readonly WordStijl[]; children: ComponentChildren }) {
	return (
		<span class="markering" style={tekststukOpmaakstijl({ soort: 'tekst', tekst: '', opmaak: [domein] }, stijlen)}>
			{children}
		</span>
	);
}

type ContextProps = { plek: Plek; wijziging: Wijziging | null; stijlen: readonly WordStijl[] };

function Context({ plek, wijziging, stijlen }: ContextProps) {
	return (
		<>
			{plek.ervoor}
			{wijziging === null || (wijziging.soort === 'tekst' && wijziging.nieuw === null) ? (
				<mark>{plek.gevonden}</mark>
			) : wijziging.soort === 'tekst' ? (
				<>
					<del>{plek.gevonden}</del>
					<ins>{wijziging.nieuw}</ins>
				</>
			) : (
				<>
					<Markering domein={wijziging.van} stijlen={stijlen}>
						{plek.gevonden}
					</Markering>
					<span class="markering-pijl" aria-hidden="true">
						{' '}
						&rarr;{' '}
					</span>
					<Markering domein={wijziging.naar} stijlen={stijlen}>
						{plek.gevonden}
					</Markering>
					<span class="alleen-lezers">
						{' '}
						(markering {wijziging.van} wordt {wijziging.naar})
					</span>
				</>
			)}
			{plek.erna}
		</>
	);
}

type PlekRegelProps = {
	boek: string;
	plek: Plek;
	wijziging: Wijziging;
	stijlen: readonly WordStijl[];
	aangevinkt: boolean;
	bijWissel: (plek: Plek, aan: boolean) => void;
};

function PlekRegel({ boek, plek, wijziging, stijlen, aangevinkt, bijWissel }: PlekRegelProps) {
	const sleutel = vondstSleutel(plek);
	const adres = versAdres(boek, plek.hoofdstuk, plek.vers);
	const verslabel = `${plek.hoofdstuk}:${plek.vers}`;
	if (!plek.vervangbaar) {
		return (
			<li class="vondst met-de-hand">
				<a href={adres}>{verslabel}</a>
				<span class="context">
					<Context plek={plek} wijziging={null} stijlen={stijlen} />
				</span>
			</li>
		);
	}
	return (
		<li class="vondst">
			<input id={`vondst-${sleutel}`} type="checkbox" checked={aangevinkt} onChange={(gebeurtenis) => bijWissel(plek, gebeurtenis.currentTarget.checked)} />
			<label for={`vondst-${sleutel}`} class="context">
				<span class="alleen-lezers">Vers {verslabel}: </span>
				<Context plek={plek} wijziging={wijziging} stijlen={stijlen} />
			</label>
			<a href={adres}>{verslabel}</a>
		</li>
	);
}

type PlekkenProps = Pick<PlekRegelProps, 'boek' | 'stijlen' | 'aangevinkt' | 'bijWissel'> & { wijziging: Wijziging };

type PlekkenLijstProps = Omit<PlekkenProps, 'aangevinkt'> & { plekken: readonly Plek[]; aangevinkt: ReadonlySet<string> };

function PlekkenLijst({ plekken, aangevinkt, ...rest }: PlekkenLijstProps) {
	return (
		<ul class="vondsten">
			{plekken.map((plek) => (
				<PlekRegel key={vondstSleutel(plek)} plek={plek} aangevinkt={aangevinkt.has(vondstSleutel(plek))} {...rest} />
			))}
		</ul>
	);
}

type HoofdstukGroepenProps = Omit<PlekkenLijstProps, 'plekken'> & { titel: string; hoofdstukken: { hoofdstuk: number; plekken: Plek[] }[] };

function HoofdstukGroepen({ boek, titel, hoofdstukken, ...rest }: HoofdstukGroepenProps) {
	if (hoofdstukken.length === 0) return null;
	return (
		<section class="vondstgroep">
			<h2>{titel}</h2>
			{hoofdstukken.map(({ hoofdstuk, plekken }) => (
				<div key={hoofdstuk}>
					<h3>
						<a href={versAdres(boek, hoofdstuk)}>Hoofdstuk {hoofdstuk}</a>
					</h3>
					<PlekkenLijst boek={boek} plekken={plekken} {...rest} />
				</div>
			))}
		</section>
	);
}

type DomeinKeuzeProps = {
	label: string;
	waarde: Domein | '';
	stijlen: readonly WordStijl[];
	bijWijziging: (domein: Domein | '') => void;
	veldRef: RefObject<HTMLSelectElement | null>;
};

function leesDomein(waarde: string): Domein | '' {
	return DOMEINEN.find((domein) => domein === waarde) ?? '';
}

function DomeinKeuze({ label, waarde, stijlen, bijWijziging, veldRef }: DomeinKeuzeProps) {
	return (
		<label>
			{label}
			<span class="domeinkeuze">
				<select ref={veldRef} value={waarde} onChange={(gebeurtenis) => bijWijziging(leesDomein(gebeurtenis.currentTarget.value))}>
					<option value="">Kies een markering</option>
					{DOMEINEN.map((domein) => (
						<option value={domein}>{domein}</option>
					))}
				</select>
				{waarde !== '' && (
					<Markering domein={waarde} stijlen={stijlen}>
						<span aria-hidden="true">{waarde}</span>
					</Markering>
				)}
			</span>
		</label>
	);
}

function Melding({ regels, veldRef }: { regels: readonly string[]; veldRef: { current: HTMLDivElement | null } }) {
	return (
		<div role="status" class="vervangen-meldingen" tabIndex={-1} ref={veldRef}>
			{regels.map((regel) => (
				<p key={regel}>{regel}</p>
			))}
		</div>
	);
}

function startVraag(voorstel: Voorstel | null): Vraagkoppeling | null {
	return voorstel === null ? null : { kwestie: voorstel.kwestie, optie: voorstel.optie, verzen: voorstel.verzen };
}

function wijzigingVan(opdracht: Zoekopdracht | null): Wijziging {
	if (opdracht?.soort === 'markering') return { soort: 'markering', van: opdracht.van, naar: opdracht.naar };
	return { soort: 'tekst', nieuw: opdracht?.soort === 'tekst' ? opdracht.nieuw : '' };
}

function nietLegeVervangingen(vervangingen: ReadonlyMap<string, string>): Map<string, string> {
	return new Map([...vervangingen].filter(([, nieuw]) => nieuw !== ''));
}

/** Tabblad Zoeken en vervangen: een verwoording of een markering in het boek (of de verzen van een vraag) wijzigen via een voorbeeldvenster. */
export function Vervangen({ boek, hoofdstukken }: TabbladProps) {
	const [voorstel] = useState(() => neemVoorstel(sessieopslag(), boek.id));
	const [soort, zetSoort] = useState<Soort>(voorstel?.opdracht ?? 'tekst');
	const [zoek, zetZoek] = useState(voorstel?.zoekterm ?? '');
	const [nieuw, zetNieuw] = useState(voorstel?.nieuw ?? '');
	const [van, zetVan] = useState<Domein | ''>(voorstel?.van ?? '');
	const [naar, zetNaar] = useState<Domein | ''>(voorstel?.naar ?? '');
	const [vraag, zetVraag] = useState<Vraagkoppeling | null>(() => startVraag(voorstel));
	const [heleBoek, zetHeleBoek] = useState(false);
	const [opdracht, zetOpdracht] = useState<Zoekopdracht | null>(null);
	const [gevonden, zetGevonden] = useState<Plek[]>([]);
	const [aangevinkt, zetAangevinkt] = useState<ReadonlySet<string>>(new Set());
	const [variantVervangingen, zetVariantVervangingen] = useState<ReadonlyMap<string, string>>(new Map());
	const [meldingen, zetMeldingen] = useState<string[]>([]);
	const [keuzes, zetKeuzes] = useState<StructureleKeuze[]>(() => leesKeuzes(browseropslag(), boek.id));
	const [antwoorden, zetAntwoorden] = useState<Antwoord[]>(() => leesAntwoorden(browseropslag(), boek.id));
	const zoekveld = useRef<HTMLInputElement>(null);
	const vanveld = useRef<HTMLSelectElement>(null);
	const naarveld = useRef<HTMLSelectElement>(null);
	const zoekknop = useRef<HTMLButtonElement>(null);
	const meldingenvak = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (voorstel === null) return;
		if (zoek === '') zoekveld.current?.focus();
		else if (soort === 'markering' && van === '') vanveld.current?.focus();
		else zoekknop.current?.focus();
	}, []);

	function bouwVerzen(): HoofdstukVerzen[] {
		return bouwHoofdstukVerzen(hoofdstukken, boek, (hoofdstuk) => leesTussenstand(browseropslag(), boek.id, hoofdstuk));
	}

	function herlees() {
		zetKeuzes(leesKeuzes(browseropslag(), boek.id));
		zetAntwoorden(leesAntwoorden(browseropslag(), boek.id));
	}

	function maakOpdracht(bereik: Bereik): Zoekopdracht | string {
		const zoekterm = zoek.trim();
		if (zoekterm === '') return 'Vul eerst in wat je zoekt.';
		if (soort === 'tekst') return { soort, zoekterm, nieuw, bereik };
		if (van === '' || naar === '') return 'Kies bij Van en Naar een markering.';
		if (van === naar) return 'Van en Naar zijn dezelfde markering; er valt niets te wisselen.';
		return { soort, zoekterm, van, naar, bereik };
	}

	function zoekMet(gekoppeld: Vraagkoppeling | null, heleBoekGekozen: boolean, bewaardeVervangingen: ReadonlyMap<string, string>) {
		const { bereik, melding } = kiesBereik(gekoppeld?.verzen ?? null, heleBoekGekozen);
		const nieuweOpdracht = bereik === null ? melding : maakOpdracht(bereik);
		if (typeof nieuweOpdracht === 'string') {
			zetMeldingen([nieuweOpdracht]);
			zetOpdracht(null);
			zetGevonden([]);
			return;
		}
		const plekken = zoekPlekken(bouwVerzen(), nieuweOpdracht);
		zetOpdracht(nieuweOpdracht);
		zetGevonden(plekken);
		zetAangevinkt(standaardAangevinkt(plekken));
		zetVariantVervangingen(bewaardeVervangingen);
	}

	function zoeken(gebeurtenis: Event) {
		gebeurtenis.preventDefault();
		zetMeldingen([]);
		zoekMet(vraag, heleBoek, new Map());
	}

	function wisselHeleBoek(aan: boolean) {
		zetHeleBoek(aan);
		zetMeldingen([]);
		if (opdracht !== null) zoekMet(vraag, aan, variantVervangingen);
	}

	function koppelLos() {
		zetVraag(null);
		zetHeleBoek(false);
		zetMeldingen(['De zoekopdracht is niet meer aan de vraag gekoppeld en zoekt in het hele boek.']);
		if (opdracht !== null) zoekMet(null, false, variantVervangingen);
	}

	function wissel(plek: Plek, aan: boolean) {
		const sleutel = vondstSleutel(plek);
		const volgende = new Set(aangevinkt);
		if (aan) volgende.add(sleutel);
		else volgende.delete(sleutel);
		zetAangevinkt(volgende);
	}

	function zetVariantVervanging(vorm: string, tekst: string) {
		zetVariantVervangingen(new Map(variantVervangingen).set(vorm, tekst));
	}

	const verdeling = verdeelPlekken(gevonden, aangevinkt, opdracht?.soort ?? soort, variantVervangingen);

	function toepassen() {
		if (opdracht === null) return;
		const nu = new Date();
		const uitkomst = pasOpdrachtToe(
			browseropslag(),
			boek.id,
			{
				hoofdstukken: bouwVerzen(),
				opdracht,
				aangevinkt: verdeling.toe,
				overgeslagen: verdeling.overgeslagen,
				variantVervangingen: opdracht.soort === 'tekst' ? nietLegeVervangingen(variantVervangingen) : new Map(),
				vraag: vraag === null ? null : { kwestie: vraag.kwestie, optie: vraag.optie },
			},
			nu,
		);
		const aangepast = verdeling.toe.filter((plek) => uitkomst.keuze.verzen.some(({ hoofdstuk, vers }) => hoofdstuk === plek.hoofdstuk && vers === plek.vers)).length;
		const regels = [...uitkomst.meldingen, `${plekkenTekst(aangepast)} aangepast.`];
		const beantwoord = vraag !== null && leesAntwoorden(browseropslag(), boek.id).some(({ keuzeIds }) => keuzeIds.includes(uitkomst.keuze.id));
		if (beantwoord) {
			regels.push(`De keuze staat nu onder het antwoord op "${kortUit(vraag.kwestie, 80)}". De zoekopdracht blijft aan dat antwoord gekoppeld: een volgende keuze komt er ook onder. Met Loslaten zoek je weer in het hele boek.`);
		}
		zetMeldingen(regels);
		zoekMet(vraag, heleBoek, variantVervangingen);
		herlees();
		meldingenvak.current?.focus();
	}

	function naTerugdraaien(regels: string[]) {
		zetMeldingen(regels);
		herlees();
		if (opdracht !== null) zoekMet(vraag, heleBoek, variantVervangingen);
	}

	function terugdraaien(keuze: StructureleKeuze) {
		const regels = draaiKeuzeTerug(browseropslag(), boek.id, keuze.id);
		naTerugdraaien([...regels, `Keuze "${keuze.zoekterm}" teruggedraaid.`]);
	}

	function versTerugdraaien(keuze: StructureleKeuze, hoofdstuk: number, vers: number) {
		const regels = draaiVersTerug(browseropslag(), boek.id, keuze.id, hoofdstuk, vers);
		naTerugdraaien([...regels, `Vers ${hoofdstuk}:${vers} van keuze "${keuze.zoekterm}" teruggedraaid.`]);
	}

	const groepen = groepeerPlekken(gevonden);
	const huidigeSoort = opdracht?.soort ?? soort;
	const wijziging = wijzigingVan(opdracht);
	const lijstprops = { boek: boek.id, stijlen: boek.stijlen, aangevinkt, bijWissel: wissel };
	const bestaandAntwoord = vraag === null ? undefined : antwoorden.find(({ kwestie }) => kwestie === vraag.kwestie);
	// Bestaat er al een antwoord, dan komt een nieuwe keuze eronder en blijven optie en toelichting zoals ze zijn.
	const koppelingOptie = optieOmschrijving(bestaandAntwoord?.optie ?? vraag?.optie ?? '');
	const vervangingLeeg = opdracht?.soort === 'tekst' && opdracht.nieuw === '';

	return (
		<div class="vervangen">
			<p class="uitleg">
				Zoek een verwoording in het hele boek, of wissel alleen de markering op dezelfde woorden. Bekijk in het voorbeeld elke plek en pas daarna de aangevinkte plekken toe. De bewerking komt in de tussenstand van de verzen; de rest van het vers blijft zoals het was.
			</p>

			{vraag !== null && (
				<div class="vraagkoppeling">
					<p title={`${vraag.kwestie}, ${koppelingOptie}`}>
						Hoort bij het antwoord op: {kortUit(vraag.kwestie, 80)} ({kortUit(koppelingOptie, 80)})
					</p>
					<button type="button" onClick={koppelLos}>
						Loslaten
					</button>
				</div>
			)}

			<form class="vervangen-formulier" onSubmit={zoeken}>
				<fieldset class="soortkeuze">
					<legend>Wat wil je doen</legend>
					<label>
						<input type="radio" name="soort" checked={soort === 'tekst'} onChange={() => zetSoort('tekst')} /> Tekst vervangen
					</label>
					<label>
						<input type="radio" name="soort" checked={soort === 'markering'} onChange={() => zetSoort('markering')} /> Markering wisselen
					</label>
				</fieldset>
				<label>
					Zoek
					<input ref={zoekveld} type="text" value={zoek} onInput={(gebeurtenis) => zetZoek(gebeurtenis.currentTarget.value)} />
				</label>
				{soort === 'tekst' ? (
					<label>
						Vervang door
						<input type="text" value={nieuw} onInput={(gebeurtenis) => zetNieuw(gebeurtenis.currentTarget.value)} />
					</label>
				) : (
					<>
						<DomeinKeuze label="Van" waarde={van} stijlen={boek.stijlen} bijWijziging={zetVan} veldRef={vanveld} />
						<DomeinKeuze label="Naar" waarde={naar} stijlen={boek.stijlen} bijWijziging={zetNaar} veldRef={naarveld} />
					</>
				)}
				<button ref={zoekknop} type="submit">
					Zoeken
				</button>
			</form>

			{vraag === null ? (
				<p class="bereik">Bereik: het hele boek.</p>
			) : (
				<div class="bereik">
					<label>
						<input type="checkbox" checked={heleBoek} onChange={(gebeurtenis) => wisselHeleBoek(gebeurtenis.currentTarget.checked)} /> Hele boek
					</label>
					<span>{heleBoek ? 'Bereik: het hele boek.' : `Bereik: de ${vraag.verzen.length === 1 ? '1 vers' : `${vraag.verzen.length} verzen`} van de vraag.`}</span>
				</div>
			)}

			<p role="status" class="vervangen-samenvatting">
				{opdracht !== null && `${plekkenTekst(gevonden.length)} gevonden voor "${opdracht.zoekterm}".`}
				{vervangingLeeg && gevonden.length > 0 && ' Bij Vervang door staat niets: de gevonden tekst wordt verwijderd.'}
			</p>

			{opdracht !== null && gevonden.length > 0 && (
				<div class="voorbeeld">
					<HoofdstukGroepen titel="Plekken" hoofdstukken={groepen.open} wijziging={wijziging} {...lijstprops} />
					<HoofdstukGroepen titel="Goedgekeurd (standaard uit)" hoofdstukken={groepen.goedgekeurd} wijziging={wijziging} {...lijstprops} />
					{groepen.varianten.length > 0 && (
						<section class="vondstgroep varianten">
							<h2>Varianten (standaard uit)</h2>
							<p class="uitleg">
								{huidigeSoort === 'tekst'
									? 'Andere vormen van de zoekterm, bijvoorbeeld met een ander lidwoord of in het meervoud. Vul per vorm in waardoor je hem vervangt; leeg laten betekent niet toepassen.'
									: 'Andere vormen van de zoekterm. Hier geldt dezelfde wissel van markering.'}
							</p>
							{groepen.varianten.map(({ vorm, plekken }) => {
								const vervanging = variantVervangingen.get(vorm) ?? '';
								return (
									<div key={vorm} class="variant">
										<h3>
											{vorm} ({plekkenTekst(plekken.length)})
										</h3>
										{huidigeSoort === 'tekst' && (
											<label class="variantinvoer">
												Vervang door
												<input type="text" value={vervanging} onInput={(gebeurtenis) => zetVariantVervanging(vorm, gebeurtenis.currentTarget.value)} />
											</label>
										)}
										<PlekkenLijst
											boek={boek.id}
											plekken={plekken}
											wijziging={wijziging.soort === 'tekst' ? { soort: 'tekst', nieuw: vervanging === '' ? null : vervanging } : wijziging}
											stijlen={boek.stijlen}
											aangevinkt={aangevinkt}
											bijWissel={wissel}
										/>
									</div>
								);
							})}
						</section>
					)}
					{groepen.metDeHand.length > 0 && (
						<section class="vondstgroep">
							<h2>Met de hand (opmaakgrens)</h2>
							<p class="uitleg">Deze plekken lopen over een opmaakgrens of vallen maar deels onder de markering en worden niet gewijzigd. Pas ze zelf aan in het vers.</p>
							<PlekkenLijst boek={boek.id} plekken={groepen.metDeHand} wijziging={wijziging} stijlen={boek.stijlen} aangevinkt={new Set()} bijWissel={wissel} />
						</section>
					)}
					<button type="button" class="toepassen" disabled={verdeling.toe.length === 0} onClick={toepassen}>
						{plekkenTekst(verdeling.toe.length)} toepassen
					</button>
				</div>
			)}

			<Melding regels={meldingen} veldRef={meldingenvak} />

			<ToegepasteKeuzes boek={boek.id} keuzes={keuzes} antwoorden={antwoorden} onTerugdraaien={terugdraaien} onVersTerugdraaien={versTerugdraaien} />
		</div>
	);
}
