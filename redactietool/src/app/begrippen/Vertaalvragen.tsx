import { useMemo, useState } from 'preact/hooks';
import { filterVragen, GEEN_FILTER, groepeerLogVragen, splitsOpenVragen, vraagSleutels, type VragenFilter } from '../../begrippen/vragenOverzicht';
import { verzamelVragen } from '../../begrippen/verzamelVragen';
import type { Vertaalvraag, VraagStatus } from '../../begrippen/types';
import type { VersRef } from '../../data/types';
import type { TabbladProps } from './tabbladProps';
import { VersLinks } from './VersLinks';
import './vertaalvragen.css';

const STATUSSEN: readonly VraagStatus[] = ['open', 'onbeslist', 'voorlopig besloten', 'besloten'];
const KORT_AANTAL_VERZEN = 3;
const GEEN_VERS_IN_KOP = 'Geen vers in de kop';

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
								<RegisterVraag key={sleutel(vraag)} boek={boek.id} vraag={vraag} />
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
						{register.map((vraag) => (
							<RegisterVraag key={sleutel(vraag)} boek={boek.id} vraag={vraag} />
						))}
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

function RegisterVraag({ boek, vraag }: { boek: string; vraag: Vertaalvraag }) {
	return (
		<li class="registervraag">
			<h3>{vraag.kwestie}</h3>
			<Status vraag={vraag} />
			<dl>
				<dt>Gekozen in de tekst</dt>
				<dd>{vraag.gekozen}</dd>
				<dt>Alternatief</dt>
				<dd>{vraag.alternatief}</dd>
				{vraag.tekst !== '' && (
					<>
						<dt>Besluit</dt>
						<dd>{vraag.tekst}</dd>
					</>
				)}
				<dt>Verzen</dt>
				<dd>{vraag.verzen.length === 0 ? <span class="geen-verzen">het hele boek</span> : <VersLinks boek={boek} verzen={vraag.verzen} />}</dd>
			</dl>
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
