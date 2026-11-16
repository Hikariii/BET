import type { Antwoord } from '../../antwoorden/antwoorden';
import type { StructureleKeuze } from '../../vervangen/keuzes';
import { versAdres } from '../adres';
import { keuzeBeschrijving, kortUit, optieOmschrijving } from './vervangenVoorbeeld';

type Props = {
	boek: string;
	keuzes: readonly StructureleKeuze[];
	antwoorden: readonly Antwoord[];
	onTerugdraaien: (keuze: StructureleKeuze) => void;
	onVersTerugdraaien: (keuze: StructureleKeuze, hoofdstuk: number, vers: number) => void;
};

function aantalVerzen({ verzen }: StructureleKeuze): string {
	return verzen.length === 1 ? '1 vers' : `${verzen.length} verzen`;
}

function toegepastOp(keuze: StructureleKeuze): string {
	return new Date(keuze.toegepast).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' });
}

/** De toegepaste keuzes van het boek, elk uit te klappen tot de verzen, met terugdraaien per keuze en per vers. */
export function ToegepasteKeuzes({ boek, keuzes, antwoorden, onTerugdraaien, onVersTerugdraaien }: Props) {
	return (
		<section class="toegepaste-keuzes">
			<h2>Toegepaste keuzes</h2>
			{keuzes.length === 0 && <p class="melding">Nog geen keuzes toegepast.</p>}
			<ul>
				{keuzes.map((keuze) => {
					const beschrijving = keuzeBeschrijving(keuze);
					const antwoord = antwoorden.find(({ keuzeIds }) => keuzeIds.includes(keuze.id));
					return (
						<li key={keuze.id}>
							<details>
								<summary>
									{beschrijving}, {aantalVerzen(keuze)} aangepast op {toegepastOp(keuze)}
								</summary>
								{keuze.vraag !== null && (
									<p class="keuzevraag" title={keuze.vraag}>
										Hoort bij het antwoord op: {kortUit(keuze.vraag, 80)}
										{antwoord !== undefined && `, ${optieOmschrijving(kortUit(antwoord.optie, 80))}`}
									</p>
								)}
								{keuze.overgeslagen.length > 0 && (
									<p class="keuzeovergeslagen">{keuze.overgeslagen.length === 1 ? '1 plek' : `${keuze.overgeslagen.length} plekken`} bewust overgeslagen.</p>
								)}
								<ul class="keuzeverzen">
									{keuze.verzen.map(({ hoofdstuk, vers }) => (
										<li key={`${hoofdstuk}:${vers}`}>
											<a href={versAdres(boek, hoofdstuk, vers)}>
												{hoofdstuk}:{vers}
											</a>
											<button
												type="button"
												aria-label={`Vers ${hoofdstuk}:${vers} van keuze ${beschrijving} terugdraaien`}
												onClick={() => onVersTerugdraaien(keuze, hoofdstuk, vers)}
											>
												Terugdraaien
											</button>
										</li>
									))}
								</ul>
							</details>
							<button type="button" aria-label={`Keuze ${beschrijving} helemaal terugdraaien`} onClick={() => onTerugdraaien(keuze)}>
								Alles terugdraaien
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
