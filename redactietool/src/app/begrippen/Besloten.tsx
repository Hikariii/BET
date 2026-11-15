import { useMemo, useState } from 'preact/hooks';
import { telPrecedenten, type GetelPrecedent } from '../../begrippen/telPrecedenten';
import {
	beslotenSamenvatting,
	isStatusfilter,
	metBronvormNogEerst,
	pastBijStatus,
	pastBijZoekterm,
	precedentSleutel,
	STATUSFILTERS,
	staatZekerNogOud,
	type Statusfilter,
} from './beslotenOverzicht';
import type { TabbladProps } from './tabbladProps';
import { VersLinks } from './VersLinks';
import './besloten.css';

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
				{telling.onbepaald.length > 0 && (
					<p class="onbepaald">
						vorm niet herkend: <VersLinks boek={boek} verzen={telling.onbepaald} />
					</p>
				)}
			</td>
			{telling.blijft ? (
				<td class="niet-van-toepassing">de vorm blijft</td>
			) : (
				<td class={staatZekerNogOud(telling) ? 'nog-oud' : undefined}>
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
				{beslotenSamenvatting(zichtbaar, tellingen.length)}
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
							<tr key={precedentSleutel(telling)}>
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
