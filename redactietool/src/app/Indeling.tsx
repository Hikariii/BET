import type { ComponentChildren } from 'preact';
import type { BoekData, Referentie } from '../data/types';
import { versAdres, type Tabblad } from './adres';
import { BewaarStatus } from './bewaren/BewaarStatus';
import { BoekTabbladen } from './bovenbalk/BoekTabbladen';
import { Help } from './help/Help';
import { helpPlekBijPagina, type Pagina } from './help/onderdelen';
import { Bovenbalk } from './bovenbalk/Bovenbalk';
import { GrootteKeuze } from './GrootteKeuze';
import type { Plek } from './navigatie/boekplekken';
import { HoofdstukStrip } from './navigatie/HoofdstukStrip';
import { useBoekPlekken } from './navigatie/useBoekPlekken';
import type { Weergavebeheer } from './weergave/useWeergave';

type Props = {
	weergavebeheer: Weergavebeheer;
	boek: BoekData;
	referentie: Referentie;
	pagina: Pagina;
	/** Het hoofdstuk dat open staat. */
	huidigHoofdstuk: number | null;
	/** Het tabblad van Keuzes en vragen dat open staat; `null` op een andere pagina. */
	tabblad: Tabblad | null;
	/** De hoofdstuktitel voor de bovenbalk; `null` buiten een hoofdstuk. */
	titel: ComponentChildren;
	/** Hoofdstukacties voor de bovenbalk; `null` buiten een hoofdstuk. */
	acties: ComponentChildren;
	children: ComponentChildren;
};

/**
 * De indeling van een boekpagina: de bovenbalk (boekbalk met de plekken van het boek, hoofdstukbalk met titel, hoofdstukstrip en acties) en de inhoud.
 * Alleen een hoofdstuk heeft een hoofdstukbalk; elders staat de naam van de plek al in de balk en als kop op de pagina.
 */
export function Indeling({ weergavebeheer, boek, referentie, pagina, huidigHoofdstuk, tabblad, titel, acties, children }: Props) {
	const plekken = useBoekPlekken(boek, referentie, huidigHoofdstuk);
	const opHoofdstukPagina = pagina === 'hoofdstuk';
	const huidigPlek: Plek | null = opHoofdstukPagina ? 'hoofdstukken' : tabblad;
	return (
		<>
			<Bovenbalk
				boek={
					<>
						<a class="bovenbalk-boeknaam" href={versAdres(boek.id, 1)}>
							{boek.naam}
						</a>
						<BoekTabbladen boekNaam={boek.naam} plekken={plekken} huidig={huidigPlek} />
					</>
				}
				titel={titel}
				acties={acties}
				bewaarstatus={<BewaarStatus boek={boek} overzichtOpen={pagina === 'bewaard'} />}
				help={<Help boek={boek} plek={helpPlekBijPagina(pagina, tabblad)} plekken={plekken} />}
				grootte={<GrootteKeuze grootte={weergavebeheer.weergave.grootte} onKies={weergavebeheer.zetGrootte} />}
				strip={opHoofdstukPagina ? <HoofdstukStrip boek={boek} referentie={referentie} huidigHoofdstuk={huidigHoofdstuk} /> : null}
			/>
			<div class="indeling">
				<main>{children}</main>
			</div>
		</>
	);
}
