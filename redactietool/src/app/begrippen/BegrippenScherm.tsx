import type { BoekData, Referentie } from '../../data/types';
import { maakAdres, TABBLADEN, type Tabblad } from '../adres';
import { laadAlleHoofdstukken } from '../gegevens';
import { useLaden } from '../hooks';
import { useMemo } from 'preact/hooks';
import { leesTussenstand } from '../../bewerken/tussenstand';
import type { HoofdstukData } from '../../data/types';
import { browseropslag } from '../bewerken/useTussenstand';
import { Besloten } from './Besloten';
import { Gevonden } from './Gevonden';
import { Vertaalvragen } from './Vertaalvragen';
import { Vervangen } from './Vervangen';
import { zoekVersVoorproef } from './versVoorproef';
import { VoorproefContext, type Voorproefbron } from './VersVoorproefVak';
import './begrippen.css';

const TITEL: Record<Tabblad, string> = {
	besloten: 'Vertaalkeuzes',
	gevonden: 'Zo vertaald',
	vragen: 'Vertaalvragen',
	vervangen: 'Zoeken en vervangen',
};

type Props = {
	boek: BoekData;
	referentie: Referentie;
	tabblad: Tabblad;
};

export function BegrippenScherm({ boek, referentie, tabblad }: Props) {
	const hoofdstukken = useLaden(() => laadAlleHoofdstukken(boek), [boek.id]);
	const geladen: readonly HoofdstukData[] = hoofdstukken.soort === 'klaar' ? hoofdstukken.waarde : [];
	const voorproef = useMemo<Voorproefbron>(
		() => ({
			boekNaam: boek.naam,
			stijlen: boek.stijlen,
			zoek: (hoofdstuk, vers) => zoekVersVoorproef(geladen, (nummer) => leesTussenstand(browseropslag(), boek.id, nummer), hoofdstuk, vers),
		}),
		[boek, geladen],
	);
	return (
		<section class="begrippen" aria-labelledby="begrippen-titel">
			<h1 id="begrippen-titel">Keuzes en vragen</h1>
			<nav class="tabbladen" aria-label="Tabbladen">
				{TABBLADEN.map((naam) => (
					<a href={maakAdres({ soort: 'begrippen', boek: boek.id, tabblad: naam })} aria-current={naam === tabblad ? 'page' : undefined}>
						{TITEL[naam]}
					</a>
				))}
			</nav>
			{hoofdstukken.soort === 'laden' && <p class="melding">De hoofdstukken worden geladen.</p>}
			{hoofdstukken.soort === 'fout' && (
				<p class="melding" role="alert">
					De hoofdstukken konden niet geladen worden: {hoofdstukken.melding}
				</p>
			)}
			{hoofdstukken.soort === 'klaar' && (
				<VoorproefContext.Provider value={voorproef}>
					{tabblad === 'besloten' && <Besloten boek={boek} referentie={referentie} hoofdstukken={hoofdstukken.waarde} />}
					{tabblad === 'gevonden' && <Gevonden boek={boek} referentie={referentie} hoofdstukken={hoofdstukken.waarde} />}
					{tabblad === 'vragen' && <Vertaalvragen boek={boek} referentie={referentie} hoofdstukken={hoofdstukken.waarde} />}
					{tabblad === 'vervangen' && <Vervangen boek={boek} referentie={referentie} hoofdstukken={hoofdstukken.waarde} />}
				</VoorproefContext.Provider>
			)}
		</section>
	);
}
