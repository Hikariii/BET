import { useMemo, useState } from 'preact/hooks';
import { telPrecedenten, type GetelPrecedent } from '../../begrippen/telPrecedenten';
import type { TabbladProps } from './tabbladProps';
import { VersLinks } from './VersLinks';
import './besloten.css';

const STATUSFILTERS = [
	{ waarde: 'alle', label: 'Alle statussen' },
	{ waarde: 'voorlopig', label: 'Voorlopig' },
	{ waarde: 'vast', label: 'Vast' },
] as const;

type Statusfilter = (typeof STATUSFILTERS)[number]['waarde'];

function isStatusfilter(waarde: string): waarde is Statusfilter {
	return STATUSFILTERS.some((filter) => filter.waarde === waarde);
}

/** Volgorde van de groepen: eerst wat zeker nog niet is toegepast, dan hetzelfde met een onzekere telling, dan de rest, en wat niet te tellen is onderaan. */
function groep(telling: GetelPrecedent): number {
	if (!telling.telbaar) return 3;
	if (telling.nietToegepast.length === 0) return 2;
	return telling.opmerkingen.length === 0 ? 0 : 1;
}

function metBronvormNogEerst(een: GetelPrecedent, ander: GetelPrecedent): number {
	return groep(een) - groep(ander) || ander.nietToegepast.length - een.nietToegepast.length || ander.toegepast.length - een.toegepast.length;
}

function pastBijZoekterm(telling: GetelPrecedent, zoekterm: string): boolean {
	const gezocht = zoekterm.trim().toLowerCase();
	if (gezocht === '') return true;
	const { bron, vereenvoudigd } = telling.precedent;
	return bron.toLowerCase().includes(gezocht) || vereenvoudigd.toLowerCase().includes(gezocht);
}

function pastBijStatus(telling: GetelPrecedent, filter: Statusfilter): boolean {
	return filter === 'alle' || telling.precedent.status === filter;
}

type TellingCellenProps = { boek: string; telling: GetelPrecedent };

function TellingCellen({ boek, telling }: TellingCellenProps) {
	if (!telling.telbaar) {
		return (
			<td colSpan={2} class="niet-telbaar">
				Niet automatisch te tellen: {telling.reden}
			</td>
		);
	}
	return (
		<>
			<td>
				<span class="aantal">{telling.toegepast.length}</span>
				{telling.blijft && <span class="uitleg"> blijft staan</span>}{' '}
				<VersLinks boek={boek} verzen={telling.toegepast} />
			</td>
			{telling.blijft ? (
				<td class="niet-van-toepassing">de vorm blijft</td>
			) : (
				<td class={telling.nietToegepast.length > 0 ? 'nog-oud' : undefined}>
					<span class="aantal">{telling.nietToegepast.length}</span> <VersLinks boek={boek} verzen={telling.nietToegepast} />
				</td>
			)}
		</>
	);
}

/** Tabblad Besloten: de precedenten met per precedent het aantal plekken en links naar de verzen. */
export function Besloten({ boek, referentie, hoofdstukken }: TabbladProps) {
	const [zoekterm, zetZoekterm] = useState('');
	const [statusfilter, zetStatusfilter] = useState<Statusfilter>('alle');
	const tellingen = useMemo(() => telPrecedenten(referentie.precedenten, hoofdstukken).sort(metBronvormNogEerst), [referentie, hoofdstukken]);
	const zichtbaar = tellingen.filter((telling) => pastBijStatus(telling, statusfilter) && pastBijZoekterm(telling, zoekterm));
	const metBronvormNog = zichtbaar.filter((telling) => telling.nietToegepast.length > 0).length;

	return (
		<div class="besloten">
			<div class="besloten-filters">
				<label>
					Zoeken in bron en vereenvoudigd
					<input type="search" value={zoekterm} onInput={(gebeurtenis) => zetZoekterm(gebeurtenis.currentTarget.value)} />
				</label>
				<label>
					Status
					<select
						value={statusfilter}
						onChange={(gebeurtenis) => {
							const gekozen = gebeurtenis.currentTarget.value;
							if (isStatusfilter(gekozen)) zetStatusfilter(gekozen);
						}}
					>
						{STATUSFILTERS.map(({ waarde, label }) => (
							<option value={waarde}>{label}</option>
						))}
					</select>
				</label>
			</div>
			<p class="besloten-samenvatting" role="status">
				{zichtbaar.length} van {tellingen.length} precedenten, waarvan {metBronvormNog} met een bronvorm die nog in de vereenvoudiging staat.
			</p>
			<div class="tabelrand">
				<table class="besloten-tabel">
					<caption class="alleen-lezers">Precedenten uit precedenten.md met het aantal plekken in het boek</caption>
					<thead>
						<tr>
							<th scope="col">Bron</th>
							<th scope="col">Vereenvoudigd</th>
							<th scope="col">Status</th>
							<th scope="col">Toegepast</th>
							<th scope="col">Bronvorm staat nog</th>
							<th scope="col">Plaats of aantal</th>
							<th scope="col">Opmerking</th>
						</tr>
					</thead>
					<tbody>
						{zichtbaar.map((telling) => (
							<tr>
								<th scope="row">{telling.precedent.bron}</th>
								<td>{telling.precedent.vereenvoudigd}</td>
								<td>{telling.precedent.status}</td>
								<TellingCellen boek={boek.id} telling={telling} />
								<td>{telling.precedent.plaats}</td>
								<td>
									{telling.precedent.opmerking}
									{telling.opmerkingen.length > 0 && <p class="onzeker">Telling onzeker: {telling.opmerkingen.join('; ')}.</p>}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{zichtbaar.length === 0 && <p class="melding">Geen precedenten gevonden.</p>}
		</div>
	);
}
