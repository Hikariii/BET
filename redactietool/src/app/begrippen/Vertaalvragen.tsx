import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { antwoordToestand, bewaarAntwoord, leesAntwoorden, verwijderAntwoord, type Antwoord } from '../../antwoorden/antwoorden';
import { leesKeuzes } from '../../vervangen/keuzes';
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
import { browseropslag } from '../bewerken/useTussenstand';
import { useOpslagTeller } from '../bewaren/useOpslagTeller';
import type { TabbladProps } from './tabbladProps';
import { VersLinks } from './VersLinks';
import { bouwHoofdstukVerzen } from './vervangenVoorbeeld';
import './vertaalvragen.css';

const STATUSSEN: readonly VraagStatus[] = ['open', 'onbeslist', 'voorlopig besloten', 'besloten'];
const KORT_AANTAL_VERZEN = 3;
const GEEN_VERS_IN_KOP = 'Geen vers in de kop';

/** Wat een registervraag kan doen met een optie; elke actie geeft een melding voor de vertaler, of `null` als er niets te melden is. */
type Antwoordacties = {
	kies: (vraag: Vertaalvraag, optie: string) => string | null;
	legVast: (vraag: Vertaalvraag, optie: string) => string;
	trekIn: (vraag: Vertaalvraag) => string;
};

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
	const bestaandeKeuzes = useMemo(() => new Set(leesKeuzes(browseropslag(), boek.id).map((keuze) => keuze.id)), [boek.id, opslagTeller]);
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
	const legVast = (vraag: Vertaalvraag, optie: string): string => {
		const bewaard = bewaarAntwoord(browseropslag(), boek, { kwestie: vraag.kwestie, optie, keuzeId: null, gegeven: new Date().toISOString() });
		return bewaard ? `Antwoord vastgelegd: optie ${optie}, zonder wijziging in de tekst.` : 'Het antwoord kon niet worden bewaard, waarschijnlijk is de opslag vol.';
	};
	return {
		kies(vraag, optie) {
			// "… houden": er verandert niets aan de tekst, dus alleen het antwoord vastleggen (anders zou de wissel de plaatselijke keuzes terugdraaien).
			if (isHoudOptie(optie)) return legVast(vraag, optie);
			const voorstel = maakVoorstel(vraag, optie, (zoekterm) => domeinenOpZoekterm(bouwVerzen(), zoekterm, { soort: 'verzen', verzen: vraag.verzen }));
			if (!bewaarVoorstel(sessieopslag(), boek, voorstel)) return 'De browser staat niet toe dat de keuze aan Zoeken en vervangen wordt doorgegeven.';
			window.location.hash = maakAdres({ soort: 'begrippen', boek, tabblad: 'vervangen' });
			return null;
		},
		legVast,
		trekIn(vraag) {
			verwijderAntwoord(browseropslag(), boek, vraag.kwestie);
			return 'Antwoord ingetrokken.';
		},
	};
}

type RegisterVraagProps = { boek: string; vraag: Vertaalvraag; antwoord: Antwoord | null; bestaandeKeuzes: ReadonlySet<string>; acties: Antwoordacties };

function RegisterVraag({ boek, vraag, antwoord, bestaandeKeuzes, acties }: RegisterVraagProps) {
	const opties = splitsOpties(vraag.alternatief);
	const [melding, zetMelding] = useState('');
	const meldingvak = useRef<HTMLParagraphElement>(null);
	const uitlegId = useId();
	// Een tweede antwoord zou de toegepaste keuze verweesd laten: eerst de keuze terugdraaien onder Zoeken en vervangen.
	const vergrendeld = antwoordToestand(antwoord, bestaandeKeuzes) === 'met keuze';
	const uitleg = vergrendeld ? uitlegId : undefined;
	useEffect(() => {
		if (melding !== '') meldingvak.current?.focus();
	}, [melding]);

	function vastleggen(gebeurtenis: Event) {
		gebeurtenis.preventDefault();
		const gekozen = new FormData(gebeurtenis.currentTarget as HTMLFormElement).get('optie');
		if (typeof gekozen === 'string' && gekozen !== '') zetMelding(acties.legVast(vraag, gekozen));
	}

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
									<button type="button" aria-label={`Kiezen: ${optie}`} disabled={vergrendeld} aria-describedby={uitleg} onClick={() => zetMelding(acties.kies(vraag, optie) ?? '')}>
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
			{antwoord !== null && (
				<p class="antwoord" id={uitlegId}>
					Beantwoord in deze browser: optie {antwoord.optie}.{' '}
					{!vergrendeld ? (
						<button type="button" onClick={() => zetMelding(acties.trekIn(vraag))}>
							Antwoord intrekken
						</button>
					) : (
						<>
							Dit antwoord hoort bij een toegepaste keuze. Kiezen kan pas weer als je die keuze eerst terugdraait onder <a href={maakAdres({ soort: 'begrippen', boek, tabblad: 'vervangen' })}>Zoeken en vervangen</a>; dan vervalt het antwoord.
						</>
					)}
				</p>
			)}
			{opties.length > 0 && (
				<form class="zonderwijziging" onSubmit={vastleggen}>
					<label>
						Optie zonder wijziging
						<select name="optie" disabled={vergrendeld}>
							{opties.map((optie) => (
								<option value={optie}>{optie}</option>
							))}
						</select>
					</label>
					<button type="submit" disabled={vergrendeld} aria-describedby={uitleg}>
						Antwoord vastleggen zonder wijziging
					</button>
				</form>
			)}
			<p role="status" class="vraagmelding" tabIndex={-1} ref={meldingvak}>
				{melding}
			</p>
		</li>
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
