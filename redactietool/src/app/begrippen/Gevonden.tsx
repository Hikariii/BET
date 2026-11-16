import { useMemo, useState } from 'preact/hooks';
import { verschillendVertaald, vindVertalingen } from '../../uitlijning/gevonden';
import { filterBronvormen, vertalingLabel } from './gevondenFilter';
import type { TabbladProps } from './tabbladProps';
import { VersLinks } from './VersLinks';
import './gevonden.css';

/** Meer rijen tegelijk maakt de pagina traag; de rest komt met een knop. */
const RIJEN_PER_KEER = 100;

/** Tabblad Gevonden: per bronwoord hoe het vertaald is, verschillend vertaalde woorden bovenaan. */
export function Gevonden({ boek, hoofdstukken }: TabbladProps) {
	const alle = useMemo(() => vindVertalingen(hoofdstukken), [hoofdstukken]);
	const verschillend = useMemo(() => verschillendVertaald(alle), [alle]);
	const [zoekterm, zetZoekterm] = useState('');
	const [alleenVerschillend, zetAlleenVerschillend] = useState(true);
	const [aantalRijen, zetAantalRijen] = useState(RIJEN_PER_KEER);

	const getoond = filterBronvormen(alle, verschillend, { zoekterm, alleenVerschillend });

	return (
		<div class="gevonden">
			<p class="uitleg">
				<strong>Automatisch afgeleid</strong> uit de vergelijking van bron en vereenvoudiging, woord voor woord. Bij vrij herschreven
				zinnen kan de koppeling niet kloppen; controleer het via de verzen.
			</p>
			<div class="filterbalk" data-help="gevonden-filters">
				<label>
					Zoeken{' '}
					<input
						type="search"
						value={zoekterm}
						onInput={(gebeurtenis) => {
							zetZoekterm(gebeurtenis.currentTarget.value);
							zetAantalRijen(RIJEN_PER_KEER);
						}}
					/>
				</label>
				<label>
					<input
						type="checkbox"
						checked={alleenVerschillend}
						onChange={(gebeurtenis) => {
							zetAlleenVerschillend(gebeurtenis.currentTarget.checked);
							zetAantalRijen(RIJEN_PER_KEER);
						}}
					/>{' '}
					Alleen woorden die verschillend vertaald zijn ({verschillend.length}; bij zoeken altijd alle)
				</label>
				<span class="aantal" aria-live="polite">
					{getoond.length} van {alle.length} bronwoorden
				</span>
			</div>
			<table data-help="gevonden-tabel">
				<thead>
					<tr>
						<th scope="col">Bron</th>
						<th scope="col">Aantal</th>
						<th scope="col">Vertaald als</th>
					</tr>
				</thead>
				<tbody>
					{getoond.slice(0, aantalRijen).map((vorm) => (
						<tr key={vorm.bronvorm}>
							<th scope="row">{vorm.voorbeeld}</th>
							<td class="getal">{vorm.aantal}</td>
							<td>
								<ul class="vertalingen">
									{vorm.vertalingen.map((vertaling) => (
										<li>
											<span class={vertaling.gelijk || vertaling.nieuw === '' ? 'vertaling bijzonder' : 'vertaling'}>
												{vertalingLabel(vertaling)}
											</span>{' '}
											<span class="getal">{vertaling.aantal}×</span> <VersLinks boek={boek.id} verzen={vertaling.verzen} zichtbaar={6} />
										</li>
									))}
								</ul>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{getoond.length > aantalRijen && (
				<button type="button" onClick={() => zetAantalRijen(aantalRijen + RIJEN_PER_KEER)}>
					Toon {Math.min(RIJEN_PER_KEER, getoond.length - aantalRijen)} meer
				</button>
			)}
		</div>
	);
}
