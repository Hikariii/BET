import type { BoekData } from '../../data/types';
import { ALINEASTIJL_NAAR_WORD, DOMEIN_NAAR_WORD } from '../../data/stijlkoppeling';
import { ALINEASTIJLEN, DOMEINEN, type Domein, type Opmaak } from '../../formaat/types';
import { alineaOpmaakstijl, tekststukOpmaakstijl, type Opmaakstijl } from '../stijl';

/** Opmaak zonder eigen Word-stijl: directe opmaak in Word. De naam staat hier, want het sjabloon kent hem niet. */
type DirecteOpmaak = Exclude<Opmaak, Domein>;

const DIRECTE_OPMAAK: Record<DirecteOpmaak, string> = {
	onderwijs: 'Onderwijs (rode letters)',
	highlight: 'Gele markering',
	onderstreept: 'Onderstreept',
	vet: 'Vet',
	cursief: 'Cursief',
};

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
	const naamVan = (id: string) => boek.stijlen.find((stijl) => stijl.id === id)?.naam ?? id;
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
						<Rij naam={naamVan(ALINEASTIJL_NAAR_WORD[stijl])} stijl={alineaOpmaakstijl(stijl, boek.stijlen)} soort="Hele alinea" />
					))}
					{DOMEINEN.map((domein) => (
						<Rij
							naam={naamVan(DOMEIN_NAAR_WORD[domein])}
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
