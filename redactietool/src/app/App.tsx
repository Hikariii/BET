import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { pasTussenstandToe } from '../bewerken/tussenstand';
import type { BoekData, BoekLijst, HoofdstukInfo, Referentie } from '../data/types';
import { versAdres, type BoekAdres } from './adres';
import { laadBoek, laadBoeken, laadHoofdstuk, laadReferentie } from './gegevens';
import { BegrippenScherm } from './begrippen/BegrippenScherm';
import { BewaardOverzicht } from './bewaren/BewaardOverzicht';
import { useTussenstand } from './bewerken/useTussenstand';
import { OntwerpKeuze } from './bovenbalk/OntwerpKeuze';
import { Galerij } from './galerij/Galerij';
import { HoofdstukScherm } from './HoofdstukScherm';
import { useAdres, useLaden } from './hooks';
import { Indeling, type Pagina } from './Indeling';
import { Hoofdstukacties } from './naarWord/Hoofdstukacties';
import { leesOntwerp, type Ontwerp } from './ontwerpProef';
import { useWeergave, type Weergavebeheer } from './weergave/useWeergave';
import { statusKlasse } from './Zijbalk';

type BoekMetReferentie = { boek: BoekData; referentie: Referentie };

function laadBoekMetReferentie(boekId: string): Promise<BoekMetReferentie> {
	return Promise.all([laadBoek(boekId), laadReferentie(boekId)]).then(([boek, referentie]) => ({ boek, referentie }));
}

/** Uit het adres bij het laden van de pagina; de keuzestrook wisselt van variant door de pagina opnieuw te laden. */
const ONTWERP = leesOntwerp(window.location.search);

export function App() {
	const boeken = useLaden(laadBoeken, []);
	const adres = useAdres();
	const weergavebeheer = useWeergave(
		ONTWERP.variant,
		ONTWERP.variant === null
			? { grootte: 0, zijbalkIngeklapt: false }
			: { grootte: ONTWERP.config.grootteStandaard, zijbalkIngeklapt: ONTWERP.config.zijbalkStandaardIngeklapt },
	);
	useEffect(() => {
		if (ONTWERP.variant === null) document.documentElement.removeAttribute('data-ontwerp');
		else document.documentElement.dataset['ontwerp'] = ONTWERP.variant;
	}, []);

	if (adres?.soort === 'galerij') {
		return <Galerij />;
	}
	if (boeken.soort === 'laden') {
		return <p class="melding">De boeken worden geladen.</p>;
	}
	if (boeken.soort === 'fout') {
		return (
			<p class="melding" role="alert">
				De boeken konden niet geladen worden: {boeken.melding}
			</p>
		);
	}
	const standaard = standaardAdres(boeken.waarde);
	const huidig = adres ?? standaard;
	if (huidig === null) {
		return <p class="melding">Er zijn geen boeken.</p>;
	}
	return (
		<>
			<BoekScherm adres={huidig} boeken={boeken.waarde} ontwerp={ONTWERP} weergavebeheer={weergavebeheer} />
			<OntwerpKeuze ontwerp={ONTWERP} />
		</>
	);
}

function standaardAdres(boeken: BoekLijst): BoekAdres | null {
	const eerste = boeken[0];
	return eerste === undefined ? null : { soort: 'hoofdstuk', boek: eerste.id, hoofdstuk: 1, vers: null };
}

type BoekSchermProps = { adres: BoekAdres; boeken: BoekLijst; ontwerp: Ontwerp; weergavebeheer: Weergavebeheer };

function BoekScherm({ adres, boeken, ontwerp, weergavebeheer }: BoekSchermProps) {
	const [regelsAltijdZichtbaar, zetRegelsAltijdZichtbaar] = useState(true);
	const boekGegevens = useLaden(() => laadBoekMetReferentie(adres.boek), [adres.boek]);

	if (!boeken.some((boek) => boek.id === adres.boek)) {
		return <OnbekendAdres boeken={boeken} reden={`Het boek "${adres.boek}" bestaat niet.`} />;
	}
	if (boekGegevens.soort === 'laden') {
		return <p class="melding">Het boek wordt geladen.</p>;
	}
	if (boekGegevens.soort === 'fout') {
		return (
			<p class="melding" role="alert">
				Het boek kon niet geladen worden: {boekGegevens.melding}
			</p>
		);
	}
	const { boek, referentie } = boekGegevens.waarde;
	const gedeeld = { ontwerp, weergavebeheer, boek, referentie };
	if (adres.soort === 'begrippen') {
		return (
			<Indeling {...gedeeld} pagina="begrippen" huidigHoofdstuk={null} tabblad={adres.tabblad} titel={<PaginaTitel pagina="begrippen" />} acties={null}>
				<BegrippenScherm boek={boek} referentie={referentie} tabblad={adres.tabblad} tabbladenInBalk={tabbladenInBalk(ontwerp)} />
			</Indeling>
		);
	}
	if (adres.soort === 'bewaard') {
		return (
			<Indeling {...gedeeld} pagina="bewaard" huidigHoofdstuk={null} tabblad={null} titel={<PaginaTitel pagina="bewaard" />} acties={null}>
				<BewaardOverzicht boek={boek} />
			</Indeling>
		);
	}
	const info = boek.hoofdstukken.find((hoofdstuk) => hoofdstuk.nummer === adres.hoofdstuk);
	if (info === undefined) {
		return (
			<Indeling {...gedeeld} pagina="hoofdstuk" huidigHoofdstuk={null} tabblad={null} titel={null} acties={null}>
				<OnbekendAdres boeken={boeken} reden={`${boek.naam} heeft geen hoofdstuk ${adres.hoofdstuk}.`} />
			</Indeling>
		);
	}
	return (
		<HoofdstukPagina
			{...gedeeld}
			info={info}
			gekozenVers={adres.vers}
			regelsAltijdZichtbaar={regelsAltijdZichtbaar}
			onWisselRegels={() => zetRegelsAltijdZichtbaar(!regelsAltijdZichtbaar)}
		/>
	);
}

/** Staan de plekken van het boek al in de bovenbalk, dan toont het scherm Keuzes en vragen geen eigen tabbladen. */
function tabbladenInBalk(ontwerp: Ontwerp): boolean {
	return ontwerp.variant !== null && ontwerp.config.boeknavigatie !== 'knop';
}

const PAGINATITEL: Record<Exclude<Pagina, 'hoofdstuk'>, string> = {
	begrippen: 'Keuzes en vragen',
	bewaard: 'Bewaard in deze browser',
};

/** De titel in de bovenbalk van een pagina die geen hoofdstuk is; de pagina zelf heeft de kop (h1). */
function PaginaTitel({ pagina }: { pagina: Exclude<Pagina, 'hoofdstuk'> }) {
	return <span class="bovenbalk-paginatitel">{PAGINATITEL[pagina]}</span>;
}

type HoofdstukPaginaProps = {
	ontwerp: Ontwerp;
	weergavebeheer: Weergavebeheer;
	boek: BoekData;
	referentie: Referentie;
	info: HoofdstukInfo;
	gekozenVers: number | null;
	regelsAltijdZichtbaar: boolean;
	onWisselRegels: () => void;
};

/**
 * Laadt het hoofdstuk en bouwt de pagina. Bij een ontwerpvariant staan titel en acties in de bovenbalk, daarom lezen we de tussenstand hier
 * en niet pas in het hoofdstuk: balk en tekst delen dezelfde stand.
 */
function HoofdstukPagina({ ontwerp, weergavebeheer, boek, referentie, info, gekozenVers, regelsAltijdZichtbaar, onWisselRegels }: HoofdstukPaginaProps) {
	const nummer = info.nummer;
	const hoofdstuk = useLaden(() => laadHoofdstuk(boek.id, nummer), [boek.id, nummer]);
	const { tussenstand, herlees } = useTussenstand(boek.id, nummer);
	const metBalk = ontwerp.variant !== null;
	const geladen = hoofdstuk.soort === 'klaar' ? hoofdstuk.waarde : null;
	const weergave = useMemo(
		() => (geladen === null ? null : pasTussenstandToe(geladen.vereenvoudigd, tussenstand)),
		[geladen, tussenstand],
	);

	let inhoud: ComponentChildren;
	if (hoofdstuk.soort === 'laden') {
		inhoud = <p class="melding">Hoofdstuk {nummer} wordt geladen.</p>;
	} else if (hoofdstuk.soort === 'fout') {
		inhoud = (
			<p class="melding" role="alert">
				Hoofdstuk {nummer} kon niet geladen worden: {hoofdstuk.melding}
			</p>
		);
	} else {
		inhoud = (
			<HoofdstukScherm
				boek={boek}
				referentie={referentie}
				hoofdstuk={hoofdstuk.waarde}
				info={info}
				gekozenVers={gekozenVers}
				regelsAltijdZichtbaar={regelsAltijdZichtbaar}
				onWisselRegels={onWisselRegels}
				tussenstand={tussenstand}
				herlees={herlees}
				kop={metBalk ? 'in-balk' : 'volledig'}
			/>
		);
	}
	return (
		<Indeling
			ontwerp={ontwerp}
			weergavebeheer={weergavebeheer}
			boek={boek}
			referentie={referentie}
			pagina="hoofdstuk"
			huidigHoofdstuk={nummer}
			tabblad={null}
			titel={<HoofdstukTitel boek={boek} info={info} />}
			acties={metBalk && geladen !== null && weergave !== null ? <Hoofdstukacties boek={boek} repo={geladen} weergave={weergave} tussenstand={tussenstand} /> : null}
		>
			{inhoud}
		</Indeling>
	);
}

/** De hoofdstuktitel met status en versie, voor de bovenbalk. */
function HoofdstukTitel({ boek, info }: { boek: BoekData; info: HoofdstukInfo }) {
	return (
		<>
			<h1 class="bovenbalk-hoofdstuktitel">
				{boek.naam} {info.nummer}
			</h1>
			<span class={`status status-${statusKlasse(info.status)}`}>{info.status}</span>
			{info.versie !== '' && <span class="versie">{info.versie}</span>}
		</>
	);
}

function OnbekendAdres({ boeken, reden }: { boeken: BoekLijst; reden: string }) {
	const eerste = boeken[0];
	return (
		<p class="melding">
			{reden}{' '}
			{eerste !== undefined && <a href={versAdres(eerste.id, 1)}>Naar {eerste.naam} 1</a>}
		</p>
	);
}
