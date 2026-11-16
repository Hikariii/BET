import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import {
	controleerKeuze,
	EIGEN_ANTWOORD,
	leesAntwoorden,
	legAntwoordVast,
	levendeKeuzeIds,
	meldingHoudenBijBestaandAntwoord,
	pasToelichtingAan,
	trekAntwoordIn,
	verliestToelichtingBijIntrekken,
	type Antwoord,
	type Uitkomst,
} from '../../antwoorden/antwoorden';
import { leesKeuzes, type StructureleKeuze } from '../../vervangen/keuzes';
import { isHoudOptie, maakVoorstel, splitsOpties } from '../../begrippen/opties';
import { filterVragen, GEEN_FILTER, groepeerLogVragen, splitsOpenVragen, vraagSleutels, type VragenFilter } from '../../begrippen/vragenOverzicht';
import { verzamelVragen } from '../../begrippen/verzamelVragen';
import type { Vertaalvraag, VraagStatus } from '../../begrippen/types';
import type { HoofdstukVerzen } from '../../vervangen/types';
import { leesTussenstand } from '../../bewerken/tussenstand';
import type { VersRef } from '../../data/types';
import { bewaarVoorstel, sessieopslag } from '../../vervangen/voorstel';
import { domeinenOpZoekterm } from '../../vervangen/zoekopdracht';
import { maakAdres } from '../adres';
import { eigenAntwoordUitleg, eigenAntwoordVastgelegd } from './antwoordTeksten';
import { browseropslag } from '../bewerken/useTussenstand';
import { useOpslagTeller } from '../bewaren/useOpslagTeller';
import type { TabbladProps } from './tabbladProps';
import { VersLinks } from './VersLinks';
import { bouwHoofdstukVerzen, keuzeBeschrijving, kortUit, optieOmschrijving } from './vervangenVoorbeeld';
import './vertaalvragen.css';

const STATUSSEN: readonly VraagStatus[] = ['open', 'onbeslist', 'voorlopig besloten', 'besloten'];
const KORT_AANTAL_VERZEN = 3;
const GEEN_VERS_IN_KOP = 'Geen vers in de kop';

/** Wat een registervraag kan doen met een antwoord. `kies` geeft een melding voor de vertaler, of `null` als Zoeken en vervangen opent; de rest geeft een uitkomst met melding. */
type Antwoordacties = {
	kies: (vraag: Vertaalvraag, optie: string) => string | null;
	legVast: (vraag: Vertaalvraag, optie: string, toelichting: string) => Uitkomst;
	pasToelichtingAan: (vraag: Vertaalvraag, toelichting: string) => Uitkomst;
	trekIn: (vraag: Vertaalvraag, bestaandeKeuzes: ReadonlySet<string>) => Uitkomst;
};

/** De uitkomst van een actie als tekst voor de melding: bij succes de gegeven bevestiging. */
function meldingVan(uitkomst: Uitkomst, bevestiging: string): string {
	return uitkomst.gelukt ? bevestiging : uitkomst.melding;
}

/** Tabblad Vertaalvragen: het register en de vragen uit de logs, met status, herkomst en verzen. */
export function Vertaalvragen({ boek, referentie, hoofdstukken }: TabbladProps) {
	const vragen = useMemo(() => verzamelVragen(referentie.openVragen, hoofdstukken), [referentie, hoofdstukken]);
	const [filter, zetFilter] = useState<VragenFilter>(GEEN_FILTER);
	const sleutels = useMemo(() => vraagSleutels(vragen), [vragen]);
	const getoond = useMemo(() => filterVragen(vragen, filter), [vragen, filter]);
	const { open, overig } = splitsOpenVragen(getoond);
	const register = overig.filter((vraag) => vraag.herkomst.soort === 'register');
	const perHoofdstuk = groepeerLogVragen(overig);
	const sleutel = (vraag: Vertaalvraag): string => sleutels.get(vraag) ?? '';
	const opslagTeller = useOpslagTeller();
	const antwoorden = useMemo(() => new Map(leesAntwoorden(browseropslag(), boek.id).map((antwoord) => [antwoord.kwestie, antwoord])), [boek.id, opslagTeller]);
	const bestaandeKeuzes = useMemo(() => new Map(leesKeuzes(browseropslag(), boek.id).map((keuze) => [keuze.id, keuze])), [boek.id, opslagTeller]);
	const acties = maakAntwoordacties(boek.id, () => bouwHoofdstukVerzen(hoofdstukken, boek, (hoofdstuk) => leesTussenstand(browseropslag(), boek.id, hoofdstuk)));
	const registervraag = (vraag: Vertaalvraag) => (
		<RegisterVraag key={sleutel(vraag)} boek={boek.id} vraag={vraag} antwoord={antwoorden.get(vraag.kwestie) ?? null} bestaandeKeuzes={bestaandeKeuzes} acties={acties} />
	);

	return (
		<div class="vertaalvragen">
			<form class="filters" role="search" aria-label="Vertaalvragen filteren" onSubmit={(gebeurtenis) => gebeurtenis.preventDefault()}>
				<label>
					Status
					<select value={filter.status} onChange={(gebeurtenis) => zetFilter({ ...filter, status: leesStatus(gebeurtenis.currentTarget.value) })}>
						<option value="alle">alle</option>
						{STATUSSEN.map((status) => (
							<option value={status}>{status}</option>
						))}
					</select>
				</label>
				<label>
					Herkomst
					<select value={filter.herkomst} onChange={(gebeurtenis) => zetFilter({ ...filter, herkomst: leesHerkomst(gebeurtenis.currentTarget.value) })}>
						<option value="alle">alle</option>
						<option value="register">register</option>
						<option value="logs">logs</option>
					</select>
				</label>
				<label>
					Hoofdstuk
					<select value={String(filter.hoofdstuk)} onChange={(gebeurtenis) => zetFilter({ ...filter, hoofdstuk: leesHoofdstuk(gebeurtenis.currentTarget.value) })}>
						<option value="alle">alle</option>
						{hoofdstukken.map(({ nummer }) => (
							<option value={String(nummer)}>{nummer}</option>
						))}
					</select>
				</label>
				<label class="zoeken">
					Zoeken in de tekst
					<input type="search" value={filter.zoekterm} onInput={(gebeurtenis) => zetFilter({ ...filter, zoekterm: gebeurtenis.currentTarget.value })} />
				</label>
			</form>
			<p class="aantal" role="status">
				{getoond.length} van {vragen.length} vragen
			</p>

			{open.length > 0 && (
				<section aria-labelledby="open-titel">
					<h2 id="open-titel">Open vragen ({open.length})</h2>
					<ul class="vragenlijst">
						{open.map((vraag) =>
							vraag.herkomst.soort === 'register' ? (
								registervraag(vraag)
							) : (
								<LogVraag key={sleutel(vraag)} boek={boek.id} vraag={vraag} open />
							),
						)}
					</ul>
				</section>
			)}

			{register.length > 0 && (
				<section aria-labelledby="register-titel">
					<h2 id="register-titel">Register, niet open ({register.length})</h2>
					<ul class="vragenlijst">
						{register.map(registervraag)}
					</ul>
				</section>
			)}

			{perHoofdstuk.length > 0 && (
				<section aria-labelledby="logs-titel">
					<h2 id="logs-titel">Vragen uit de logs</h2>
					{perHoofdstuk.map(({ hoofdstuk, vragen: hoofdstukVragen }) => (
						<section key={hoofdstuk} aria-labelledby={`logs-hoofdstuk-${hoofdstuk}`}>
							<h3 id={`logs-hoofdstuk-${hoofdstuk}`}>
								Hoofdstuk {hoofdstuk} ({hoofdstukVragen.length})
							</h3>
							<ul class="vragenlijst">
								{hoofdstukVragen.map((vraag) => (
									<LogVraag key={sleutel(vraag)} boek={boek.id} vraag={vraag} open={false} />
								))}
							</ul>
						</section>
					))}
				</section>
			)}

			{getoond.length === 0 && <p class="melding">Geen vragen die bij deze filters passen.</p>}
		</div>
	);
}

function maakAntwoordacties(boek: string, bouwVerzen: () => HoofdstukVerzen[]): Antwoordacties {
	const legVast = (vraag: Vertaalvraag, optie: string, toelichting: string): Uitkomst =>
		legAntwoordVast(browseropslag(), boek, { kwestie: vraag.kwestie, optie, toelichting }, new Date());
	return {
		kies(vraag, optie) {
			const bestaand = leesAntwoorden(browseropslag(), boek).find((antwoord) => antwoord.kwestie === vraag.kwestie) ?? null;
			// "… houden": er verandert niets aan de tekst, dus alleen het antwoord vastleggen (anders zou de wissel de plaatselijke keuzes terugdraaien).
			if (isHoudOptie(optie)) {
				if (bestaand !== null) return meldingHoudenBijBestaandAntwoord(bestaand, optie);
				return meldingVan(legVast(vraag, optie, ''), `Antwoord vastgelegd: ${optieOmschrijving(optie)}, zonder wijziging in de tekst.`);
			}
			const keuze = controleerKeuze(bestaand, optie);
			if (!keuze.gelukt) return keuze.melding;
			const voorstel = maakVoorstel(vraag, optie, (zoekterm) => domeinenOpZoekterm(bouwVerzen(), zoekterm, { soort: 'verzen', verzen: vraag.verzen }));
			if (!bewaarVoorstel(sessieopslag(), boek, voorstel)) return 'De browser staat niet toe dat de keuze aan Zoeken en vervangen wordt doorgegeven.';
			window.location.hash = maakAdres({ soort: 'begrippen', boek, tabblad: 'vervangen' });
			return null;
		},
		legVast,
		pasToelichtingAan: (vraag, toelichting) => pasToelichtingAan(browseropslag(), boek, vraag.kwestie, toelichting, new Date()),
		trekIn: (vraag, bestaandeKeuzes) => trekAntwoordIn(browseropslag(), boek, vraag.kwestie, bestaandeKeuzes),
	};
}

type RegisterVraagProps = { boek: string; vraag: Vertaalvraag; antwoord: Antwoord | null; bestaandeKeuzes: ReadonlyMap<string, StructureleKeuze>; acties: Antwoordacties };

function RegisterVraag({ boek, vraag, antwoord, bestaandeKeuzes, acties }: RegisterVraagProps) {
	const opties = splitsOpties(vraag.alternatief);
	const [melding, zetMelding] = useState('');
	const meldingvak = useRef<HTMLParagraphElement>(null);
	useEffect(() => {
		if (melding !== '') meldingvak.current?.focus();
	}, [melding]);

	return (
		<li class="registervraag">
			<h3>{vraag.kwestie}</h3>
			<Status vraag={vraag} />
			<dl>
				<dt>Gekozen in de tekst</dt>
				<dd>{vraag.gekozen}</dd>
				<dt>Alternatief</dt>
				<dd>
					{opties.length === 0 ? (
						<span class="geen-verzen">geen opties</span>
					) : (
						<ul class="opties">
							{opties.map((optie) => (
								<li key={optie}>
									<span class="optietekst">{optie}</span>
									<button type="button" aria-label={`Kiezen: ${optie}`} onClick={() => zetMelding(acties.kies(vraag, optie) ?? '')}>
										Kiezen
									</button>
								</li>
							))}
						</ul>
					)}
				</dd>
				{vraag.tekst !== '' && (
					<>
						<dt>Besluit</dt>
						<dd>{vraag.tekst}</dd>
					</>
				)}
				<dt>Verzen</dt>
				<dd>{vraag.verzen.length === 0 ? <span class="geen-verzen">het hele boek</span> : <VersLinks boek={boek} verzen={vraag.verzen} />}</dd>
			</dl>
			{antwoord === null ? (
				<AntwoordFormulier vraag={vraag} opties={opties} acties={acties} zetMelding={zetMelding} />
			) : (
				<GegevenAntwoord boek={boek} vraag={vraag} antwoord={antwoord} bestaandeKeuzes={bestaandeKeuzes} acties={acties} zetMelding={zetMelding} />
			)}
			<p role="status" class="vraagmelding" tabIndex={-1} ref={meldingvak}>
				{melding}
			</p>
		</li>
	);
}

const GEEN_KEUZE = '';
const TOELICHTING_UITLEG =
	'Schrijf wanneer je wat kiest, zodat het een regel wordt. Claude gebruikt deze toelichting bij het terugvoeren om regels of precedenten voor te stellen; na akkoord van de eigenaar gelden ze voor de volgende vertaalkeuzes.';
const TOELICHTING_VOORBEELD = 'Bijvoorbeeld: in een zaligspreking kiezen we genade; waar iemand een persoon prijst, laten we eeuwigleven staan.';

type FormulierProps = { vraag: Vertaalvraag; opties: readonly string[]; acties: Antwoordacties; zetMelding: (melding: string) => void };

/** Legt een antwoord vast: een van de opties zonder wijziging in de tekst, of een eigen antwoord met toelichting. */
function AntwoordFormulier({ vraag, opties, acties, zetMelding }: FormulierProps) {
	const kanKiezen = opties.length > 0;
	const [gekozen, zetGekozen] = useState(kanKiezen ? GEEN_KEUZE : EIGEN_ANTWOORD);
	const [toelichting, zetToelichting] = useState('');
	const [fout, zetFout] = useState('');
	const keuzeveld = useRef<HTMLSelectElement>(null);
	const toelichtingveld = useRef<HTMLTextAreaElement>(null);
	const id = useId();
	const eigen = gekozen === EIGEN_ANTWOORD;
	const foutBijKeuze = fout !== '' && gekozen === GEEN_KEUZE;
	const foutBijToelichting = fout !== '' && !foutBijKeuze;
	const hulp = `${id}-uitleg${eigen ? ` ${id}-eigen` : ''}`;

	function vastleggen(gebeurtenis: Event) {
		gebeurtenis.preventDefault();
		if (gekozen === GEEN_KEUZE) {
			zetFout('Kies een optie of "Eigen antwoord (genuanceerd)".');
			keuzeveld.current?.focus();
			return;
		}
		const uitkomst = acties.legVast(vraag, gekozen, toelichting);
		if (!uitkomst.gelukt) {
			zetFout(uitkomst.melding);
			toelichtingveld.current?.focus();
			return;
		}
		zetFout('');
		zetToelichting('');
		const metToelichting = toelichting.trim() === '' ? ', zonder wijziging in de tekst' : ' met toelichting';
		zetMelding(eigen ? eigenAntwoordVastgelegd(kanKiezen) : `Antwoord vastgelegd: ${optieOmschrijving(gekozen)}${metToelichting}.`);
	}

	return (
		<form class="antwoordformulier" aria-label={`Antwoord vastleggen: ${vraag.kwestie}`} noValidate onSubmit={vastleggen}>
			<h4>Antwoord vastleggen</h4>
			<label>
				Antwoord
				<select
					ref={keuzeveld}
					value={gekozen}
					aria-invalid={foutBijKeuze}
					aria-describedby={foutBijKeuze ? `${id}-fout` : undefined}
					onChange={(gebeurtenis) => zetGekozen(gebeurtenis.currentTarget.value)}
				>
					<option value={GEEN_KEUZE}>Kies een antwoord</option>
					{opties.map((optie) => (
						<option value={optie}>{optie}</option>
					))}
					<option value={EIGEN_ANTWOORD}>Eigen antwoord (genuanceerd)</option>
				</select>
			</label>
			<label>
				Toelichting of regel{eigen ? ' (verplicht)' : ' (optioneel)'}
				<textarea
					ref={toelichtingveld}
					rows={3}
					value={toelichting}
					placeholder={TOELICHTING_VOORBEELD}
					aria-required={eigen}
					aria-invalid={foutBijToelichting}
					aria-describedby={foutBijToelichting ? `${hulp} ${id}-fout` : hulp}
					onInput={(gebeurtenis) => zetToelichting(gebeurtenis.currentTarget.value)}
				/>
			</label>
			<p class="veldhulp" id={`${id}-uitleg`}>
				{TOELICHTING_UITLEG}
			</p>
			{eigen && (
				<p class="veldhulp" id={`${id}-eigen`}>
					{eigenAntwoordUitleg(kanKiezen)}
				</p>
			)}
			{fout !== '' && (
				<p class="veldfout" id={`${id}-fout`} role="alert">
					{fout}
				</p>
			)}
			<div>
				<button type="submit">Antwoord vastleggen</button>
			</div>
		</form>
	);
}

type GegevenAntwoordProps = {
	boek: string;
	vraag: Vertaalvraag;
	antwoord: Antwoord;
	bestaandeKeuzes: ReadonlyMap<string, StructureleKeuze>;
	acties: Antwoordacties;
	zetMelding: (melding: string) => void;
};

function aantalVerzen({ verzen }: StructureleKeuze): string {
	return verzen.length === 1 ? '1 vers' : `${verzen.length} verzen`;
}

/** Een beantwoorde vraag: de optie, de toelichting (aan te passen), de keuzes eronder en intrekken zolang er geen keuzes meer zijn. */
function GegevenAntwoord({ boek, vraag, antwoord, bestaandeKeuzes, acties, zetMelding }: GegevenAntwoordProps) {
	const [aanpassen, zetAanpassen] = useState(false);
	const [concept, zetConcept] = useState(antwoord.toelichting);
	const [fout, zetFout] = useState('');
	const [bevestigIntrekken, zetBevestigIntrekken] = useState(false);
	const aanpasknop = useRef<HTMLButtonElement>(null);
	const intrekknop = useRef<HTMLButtonElement>(null);
	const intrekvraag = useRef<HTMLParagraphElement>(null);
	const veld = useRef<HTMLTextAreaElement>(null);
	const id = useId();
	const bestaandeIds = new Set(bestaandeKeuzes.keys());
	const keuzes = levendeKeuzeIds(antwoord, bestaandeIds).flatMap((keuzeId) => bestaandeKeuzes.get(keuzeId) ?? []);
	const eigen = antwoord.optie === EIGEN_ANTWOORD;
	const vervangenAdres = maakAdres({ soort: 'begrippen', boek, tabblad: 'vervangen' });

	function begin() {
		zetConcept(antwoord.toelichting);
		zetFout('');
		zetAanpassen(true);
		// Het veld bestaat pas na de volgende render.
		setTimeout(() => veld.current?.focus());
	}

	function annuleer() {
		zetAanpassen(false);
		aanpasknop.current?.focus();
	}

	function trekIn() {
		zetMelding(meldingVan(acties.trekIn(vraag, bestaandeIds), 'Antwoord ingetrokken.'));
	}

	function beginIntrekken() {
		if (!verliestToelichtingBijIntrekken(antwoord)) {
			trekIn();
			return;
		}
		zetBevestigIntrekken(true);
		setTimeout(() => intrekvraag.current?.focus());
	}

	function annuleerIntrekken() {
		zetBevestigIntrekken(false);
		setTimeout(() => intrekknop.current?.focus());
	}

	function bewaar(gebeurtenis: Event) {
		gebeurtenis.preventDefault();
		const uitkomst = acties.pasToelichtingAan(vraag, concept);
		if (!uitkomst.gelukt) {
			zetFout(uitkomst.melding);
			veld.current?.focus();
			return;
		}
		zetAanpassen(false);
		zetMelding('Toelichting bewaard.');
	}

	return (
		<section class="antwoord" aria-labelledby={`${id}-kop`}>
			<h4 id={`${id}-kop`}>Beantwoord in deze browser</h4>
			<dl>
				<dt>Antwoord</dt>
				<dd>{eigen ? 'Eigen antwoord' : antwoord.optie}</dd>
				<dt>Toelichting</dt>
				<dd>
					{antwoord.toelichting === '' ? <span class="geen-verzen">geen toelichting</span> : <span class="toelichting">{antwoord.toelichting}</span>}{' '}
					<button type="button" ref={aanpasknop} aria-expanded={aanpassen} aria-controls={`${id}-aanpassen`} onClick={aanpassen ? annuleer : begin}>
						Toelichting aanpassen
					</button>
					{aanpassen && (
						<form class="toelichtingaanpassen" id={`${id}-aanpassen`} noValidate onSubmit={bewaar}>
							<label>
								Toelichting of regel{eigen ? ' (verplicht)' : ' (optioneel)'}
								<textarea
									ref={veld}
									rows={3}
									value={concept}
									placeholder={TOELICHTING_VOORBEELD}
									aria-required={eigen}
									aria-invalid={fout !== ''}
									aria-describedby={fout === '' ? `${id}-uitleg` : `${id}-uitleg ${id}-fout`}
									onInput={(gebeurtenis) => zetConcept(gebeurtenis.currentTarget.value)}
								/>
							</label>
							<p class="veldhulp" id={`${id}-uitleg`}>
								{TOELICHTING_UITLEG}
							</p>
							{fout !== '' && (
								<p class="veldfout" id={`${id}-fout`} role="alert">
									{fout}
								</p>
							)}
							<div class="knoppen">
								<button type="submit">Toelichting bewaren</button>
								<button type="button" onClick={annuleer}>
									Annuleren
								</button>
							</div>
						</form>
					)}
				</dd>
				<dt>Keuzes</dt>
				<dd>
					{keuzes.length === 0 ? (
						<span class="geen-verzen">nog geen keuzes toegepast</span>
					) : (
						<>
							{keuzes.length === 1 ? '1 keuze toegepast' : `${keuzes.length} keuzes toegepast`}
							<ul class="antwoordkeuzes">
								{keuzes.map((keuze) => (
									<li key={keuze.id}>
										{kortUit(keuzeBeschrijving(keuze), 100)}, {aantalVerzen(keuze)}{' '}
										<a href={vervangenAdres} aria-label={`Keuze ${keuzeBeschrijving(keuze)} bekijken bij Zoeken en vervangen`}>
											Zoeken en vervangen
										</a>
									</li>
								))}
							</ul>
						</>
					)}
				</dd>
			</dl>
			{keuzes.length === 0 ? (
				bevestigIntrekken ? (
					<div class="intrekbevestiging" role="group" aria-labelledby={`${id}-intrekvraag`}>
						<p id={`${id}-intrekvraag`} tabIndex={-1} ref={intrekvraag}>
							De toelichting gaat verloren. Zeker intrekken?
						</p>
						<div class="knoppen">
							<button type="button" onClick={trekIn}>
								Ja, intrekken
							</button>
							<button type="button" onClick={annuleerIntrekken}>
								Annuleren
							</button>
						</div>
					</div>
				) : (
					<button type="button" ref={intrekknop} onClick={beginIntrekken}>
						Antwoord intrekken
					</button>
				)
			) : (
				<p class="veldhulp">
					Intrekken kan pas als er geen keuzes meer onder dit antwoord hangen. Draai ze eerst terug onder <a href={vervangenAdres}>Zoeken en vervangen</a>
					{antwoord.toelichting === '' ? '; dan vervalt het antwoord vanzelf.' : '; het antwoord met de toelichting blijft dan staan.'}
				</p>
			)}
		</section>
	);
}

/** `open` bepaalt alleen de beginstand; daarna beslist de lezer. */
function LogVraag({ boek, vraag, open }: { boek: string; vraag: Vertaalvraag; open: boolean }) {
	return (
		<li>
			<details open={open}>
				<summary>
					{open && vraag.herkomst.soort !== 'register' && <span class="hoofdstuklabel">Hoofdstuk {vraag.herkomst.hoofdstuk}: </span>}
					<span class="kwestie">{vraag.kwestie}</span>
					<Status vraag={vraag} />
					<span class="versjes">{kortVersoverzicht(vraag.verzen)}</span>
				</summary>
				<div class="vraagtekst">
					<p>
						<Opmaak tekst={vraag.tekst} />
					</p>
					<p>
						{vraag.verzen.length === 0 ? <span class="geen-verzen">{GEEN_VERS_IN_KOP}</span> : <VersLinks boek={boek} verzen={vraag.verzen} />}
					</p>
				</div>
			</details>
		</li>
	);
}

function Status({ vraag }: { vraag: Vertaalvraag }) {
	return (
		<span class="statuslabel">
			<span class={`status status-${vraag.status.replace(' ', '-')}`}>{vraag.status}</span>
			{vraag.statusAfgeleid && <span class="volgens-tekst">volgens tekst</span>}
		</span>
	);
}

/** Toont `**vet**` uit de logtekst als vet; de rest blijft staan. */
function Opmaak({ tekst }: { tekst: string }) {
	return (
		<>
			{tekst.split('**').map((deel, index) => (index % 2 === 1 ? <strong>{deel}</strong> : deel))}
		</>
	);
}

function kortVersoverzicht(verzen: readonly VersRef[]): string {
	if (verzen.length === 0) return GEEN_VERS_IN_KOP;
	const eerste = verzen.slice(0, KORT_AANTAL_VERZEN).map(({ hoofdstuk, vers }) => `${hoofdstuk}:${vers}`);
	return verzen.length > KORT_AANTAL_VERZEN ? `${eerste.join(', ')} en ${verzen.length - KORT_AANTAL_VERZEN} meer` : eerste.join(', ');
}

function leesStatus(waarde: string): VragenFilter['status'] {
	return STATUSSEN.find((status) => status === waarde) ?? 'alle';
}

function leesHerkomst(waarde: string): VragenFilter['herkomst'] {
	return waarde === 'register' || waarde === 'logs' ? waarde : 'alle';
}

function leesHoofdstuk(waarde: string): VragenFilter['hoofdstuk'] {
	return waarde === 'alle' ? 'alle' : Number(waarde);
}
