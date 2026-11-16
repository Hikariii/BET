import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { pasTussenstandToe } from '../bewerken/tussenstand';
import type { BoekData, BoekLijst, HoofdstukInfo, Referentie } from '../data/types';
import { versAdres, type BoekAdres } from './adres';
import { laadBoek, laadBoeken, laadHoofdstuk, laadReferentie } from './gegevens';
import { BegrippenScherm } from './begrippen/BegrippenScherm';
import { BewaardOverzicht } from './bewaren/BewaardOverzicht';
import { useTussenstand } from './bewerken/useTussenstand';
import { Galerij } from './galerij/Galerij';
import { HoofdstukScherm } from './HoofdstukScherm';
import { useAdres, useLaden } from './hooks';
import { Indeling } from './Indeling';
import { Hoofdstukacties } from './naarWord/Hoofdstukacties';
import { useWeergave, type Weergavebeheer } from './weergave/useWeergave';
import { Welkom } from './welkom/Welkom';
import { statusKlasse } from './Zijbalk';

type BoekMetReferentie = { boek: BoekData; referentie: Referentie };

function laadBoekMetReferentie(boekId: string): Promise<BoekMetReferentie> {
	return Promise.all([laadBoek(boekId), laadReferentie(boekId)]).then(([boek, referentie]) => ({ boek, referentie }));
}

export function App() {
	const boeken = useLaden(laadBoeken, []);
	const adres = useAdres();
	const weergavebeheer = useWeergave();

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
			<Welkom />
			<BoekScherm adres={huidig} boeken={boeken.waarde} weergavebeheer={weergavebeheer} />
		</>
	);
}

function standaardAdres(boeken: BoekLijst): BoekAdres | null {
	const eerste = boeken[0];
	return eerste === undefined ? null : { soort: 'hoofdstuk', boek: eerste.id, hoofdstuk: 1, vers: null };
}

type BoekSchermProps = { adres: BoekAdres; boeken: BoekLijst; weergavebeheer: Weergavebeheer };

function BoekScherm({ adres, boeken, weergavebeheer }: BoekSchermProps) {
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
	const gedeeld = { weergavebeheer, boek, referentie };
	if (adres.soort === 'begrippen') {
		return (
			<Indeling {...gedeeld} pagina="begrippen" huidigHoofdstuk={null} tabblad={adres.tabblad} titel={null} acties={null}>
				<BegrippenScherm boek={boek} referentie={referentie} tabblad={adres.tabblad} />
			</Indeling>
		);
	}
	if (adres.soort === 'bewaard') {
		return (
			<Indeling {...gedeeld} pagina="bewaard" huidigHoofdstuk={null} tabblad={null} titel={null} acties={null}>
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
		/>
	);
}

type HoofdstukPaginaProps = {
	weergavebeheer: Weergavebeheer;
	boek: BoekData;
	referentie: Referentie;
	info: HoofdstukInfo;
	gekozenVers: number | null;
};

/**
 * Laadt het hoofdstuk en bouwt de pagina. Titel en acties staan in de bovenbalk, daarom lezen we de tussenstand hier
 * en niet pas in het hoofdstuk: balk en tekst delen dezelfde stand.
 */
function HoofdstukPagina({ weergavebeheer, boek, referentie, info, gekozenVers }: HoofdstukPaginaProps) {
	const nummer = info.nummer;
	const hoofdstuk = useLaden(() => laadHoofdstuk(boek.id, nummer), [boek.id, nummer]);
	const { tussenstand, herlees } = useTussenstand(boek.id, nummer);
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
				tussenstand={tussenstand}
				herlees={herlees}
			/>
		);
	}
	return (
		<Indeling
			weergavebeheer={weergavebeheer}
			boek={boek}
			referentie={referentie}
			pagina="hoofdstuk"
			huidigHoofdstuk={nummer}
			tabblad={null}
			titel={<HoofdstukTitel boek={boek} info={info} />}
			acties={geladen !== null && weergave !== null ? <Hoofdstukacties boek={boek} repo={geladen} weergave={weergave} tussenstand={tussenstand} openVragen={referentie.openVragen} /> : null}
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
			<span data-help="hoofdstuk-status" class={`status status-${statusKlasse(info.status)}`} title={info.versie === '' ? info.status : `${info.status} ${info.versie}`}>
				{info.status}
			</span>
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
