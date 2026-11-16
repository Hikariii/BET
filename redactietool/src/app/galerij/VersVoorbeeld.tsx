import { useEffect, useRef, useState } from 'preact/hooks';
import { pasTussenstandToe } from '../../bewerken/tussenstand';
import type { BoekData, HoofdstukData, Referentie } from '../../data/types';
import { useTussenstand } from '../bewerken/useTussenstand';
import { groepeerPerVers } from '../groepeerPerVers';
import { maakVersVraagAdres } from '../begrippen/vraagAdres';
import { VersRij } from '../HoofdstukScherm';
import { wisselNaslag, type OpenNaslag, type Naslag } from '../naslag';

/** Wat de galerij na het plaatsen met de rij doet om hem in een bepaalde toestand te krijgen. */
export type NaPlaatsen = (tabel: HTMLTableElement) => void;

type Props = {
	boek: BoekData;
	referentie: Referentie;
	hoofdstuk: HoofdstukData;
	vers: number;
	/** De editor staat open bij het laden. */
	bewerkenBijStart: boolean;
	/** De rij heeft de markering van het gekozen vers. */
	gekozen: boolean;
	naPlaatsen: NaPlaatsen | null;
};

/** Eén vers van een hoofdstuk in de werktabel, zoals `HoofdstukScherm` het toont. */
export function VersVoorbeeld({ boek, referentie, hoofdstuk, vers, bewerkenBijStart, gekozen, naPlaatsen }: Props) {
	const { tussenstand, herlees } = useTussenstand(boek.id, hoofdstuk.nummer);
	const [bewerken, zetBewerken] = useState(bewerkenBijStart);
	const [openNaslag, zetOpenNaslag] = useState<OpenNaslag | null>(null);
	const tabel = useRef<HTMLTableElement>(null);

	useEffect(() => {
		const doel = tabel.current;
		if (doel === null) return;
		// De rij springt bij een klik naar het hoofdstuk (kiesVers in HoofdstukScherm); in de galerij moet de pagina blijven staan.
		for (const cel of doel.querySelectorAll('tr.vers > *')) {
			cel.addEventListener('click', (gebeurtenis) => gebeurtenis.stopPropagation());
		}
		naPlaatsen?.(doel);
	}, []);

	const weergave = pasTussenstandToe(hoofdstuk.vereenvoudigd, tussenstand);
	const groep = groepeerPerVers(hoofdstuk.bron, weergave).find((kandidaat) => kandidaat.nummer === vers);
	if (groep === undefined) throw new Error(`Vers ${hoofdstuk.nummer}:${vers} staat niet in de gegevens.`);

	return (
		<table class="verzen verzen-dicht" ref={tabel}>
			<thead>
				<tr>
					<th scope="col">Vers</th>
					<th scope="col">Bron</th>
					<th scope="col">Vereenvoudigd</th>
					<th scope="col">Vertaalregels</th>
				</tr>
			</thead>
			<tbody>
				<VersRij
					groep={groep}
					boek={boek}
					hoofdstuk={hoofdstuk}
					referentie={referentie}
					vraagAdres={maakVersVraagAdres(boek.id, referentie.openVragen, hoofdstuk)(vers)}
					geselecteerd={gekozen}
					openNaslag={openNaslag?.naslag ?? null}
					onOpenNaslag={(naslag: Naslag) => zetOpenNaslag(wisselNaslag(openNaslag, 0, naslag))}
					onSluitNaslag={() => zetOpenNaslag(null)}
					bewerkt={tussenstand.verzen[vers] ?? null}
					bewerken={bewerken}
					beginAanBegin={false}
					onNaarBuur={() => {}}
					onBewerk={() => zetBewerken(true)}
					onSluit={() => zetBewerken(false)}
					onOpslagGewijzigd={herlees}
				/>
			</tbody>
		</table>
	);
}
