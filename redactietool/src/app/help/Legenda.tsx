import type { BoekData } from '../../data/types';
import { ALINEASTIJLEN, DOMEINEN } from '../../formaat/types';
import { alineaOpmaakstijl, tekststukOpmaakstijl, type Opmaakstijl } from '../stijl';
import { alineastijlNaam, DIRECTE_OPMAAK, domeinNaam, type DirecteOpmaak } from '../opmaakNamen';

function Rij({ naam, stijl, soort }: { naam: string; stijl: Opmaakstijl; soort: string }) {
	return (
		<tr>
			<th scope="row">
				<span class="help-legenda-voorbeeld" style={stijl}>
					{naam}
				</span>
			</th>
			<td>{soort}</td>
		</tr>
	);
}

/** De opmaak van de Bijbeltekst zoals Word hem toont: namen en kleuren uit het Word-sjabloon van het boek (`boek.stijlen`). */
export function Legenda({ boek }: { boek: BoekData }) {
	return (
		<div class="tabelrand help-legenda">
			<table>
				<caption class="alleen-lezers">Kleuren en markeringen in de tekst</caption>
				<thead>
					<tr>
						<th scope="col">Zo ziet het eruit</th>
						<th scope="col">Soort</th>
					</tr>
				</thead>
				<tbody>
					{ALINEASTIJLEN.map((stijl) => (
						<Rij naam={alineastijlNaam(stijl, boek.stijlen)} stijl={alineaOpmaakstijl(stijl, boek.stijlen)} soort="Hele alinea" />
					))}
					{DOMEINEN.map((domein) => (
						<Rij
							naam={domeinNaam(domein, boek.stijlen)}
							stijl={tekststukOpmaakstijl({ soort: 'tekst', tekst: '', opmaak: [domein] }, boek.stijlen)}
							soort="Woorden in de tekst"
						/>
					))}
					{(Object.keys(DIRECTE_OPMAAK) as DirecteOpmaak[]).map((opmaak) => (
						<Rij
							naam={DIRECTE_OPMAAK[opmaak]}
							stijl={tekststukOpmaakstijl({ soort: 'tekst', tekst: '', opmaak: [opmaak] }, boek.stijlen)}
							soort="Directe opmaak"
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}
