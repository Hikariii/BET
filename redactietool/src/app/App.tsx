import { useState } from 'preact/hooks';
import type { BoekData, BoekLijst, Referentie } from '../data/types';
import { versAdres, type BoekAdres } from './adres';
import { laadBoek, laadBoeken, laadHoofdstuk, laadReferentie } from './gegevens';
import { BegrippenScherm } from './begrippen/BegrippenScherm';
import { Galerij } from './galerij/Galerij';
import { HoofdstukScherm } from './HoofdstukScherm';
import { useAdres, useLaden } from './hooks';
import { Zijbalk } from './Zijbalk';

type BoekMetReferentie = { boek: BoekData; referentie: Referentie };

function laadBoekMetReferentie(boekId: string): Promise<BoekMetReferentie> {
	return Promise.all([laadBoek(boekId), laadReferentie(boekId)]).then(([boek, referentie]) => ({ boek, referentie }));
}

export function App() {
	const boeken = useLaden(laadBoeken, []);
	const adres = useAdres();

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
	return <BoekScherm adres={huidig} boeken={boeken.waarde} />;
}

function standaardAdres(boeken: BoekLijst): BoekAdres | null {
	const eerste = boeken[0];
	return eerste === undefined ? null : { soort: 'hoofdstuk', boek: eerste.id, hoofdstuk: 1, vers: null };
}

function BoekScherm({ adres, boeken }: { adres: BoekAdres; boeken: BoekLijst }) {
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
	if (adres.soort === 'begrippen') {
		return (
			<div class="indeling">
				<Zijbalk boek={boek} referentie={referentie} huidigHoofdstuk={null} begrippenOpen />
				<main>
					<BegrippenScherm boek={boek} referentie={referentie} tabblad={adres.tabblad} />
				</main>
			</div>
		);
	}
	const info = boek.hoofdstukken.find((hoofdstuk) => hoofdstuk.nummer === adres.hoofdstuk);

	return (
		<div class="indeling">
			<Zijbalk boek={boek} referentie={referentie} huidigHoofdstuk={info === undefined ? null : adres.hoofdstuk} begrippenOpen={false} />
			<main>
				{info === undefined ? (
					<OnbekendAdres boeken={boeken} reden={`${boek.naam} heeft geen hoofdstuk ${adres.hoofdstuk}.`} />
				) : (
					<HoofdstukLader
						boek={boek}
						referentie={referentie}
						info={info}
						gekozenVers={adres.vers}
						regelsAltijdZichtbaar={regelsAltijdZichtbaar}
						onWisselRegels={() => zetRegelsAltijdZichtbaar(!regelsAltijdZichtbaar)}
					/>
				)}
			</main>
		</div>
	);
}

type HoofdstukLaderProps = Omit<Parameters<typeof HoofdstukScherm>[0], 'hoofdstuk'>;

function HoofdstukLader(props: HoofdstukLaderProps) {
	const nummer = props.info.nummer;
	const hoofdstuk = useLaden(() => laadHoofdstuk(props.boek.id, nummer), [props.boek.id, nummer]);
	if (hoofdstuk.soort === 'laden') {
		return <p class="melding">Hoofdstuk {nummer} wordt geladen.</p>;
	}
	if (hoofdstuk.soort === 'fout') {
		return (
			<p class="melding" role="alert">
				Hoofdstuk {nummer} kon niet geladen worden: {hoofdstuk.melding}
			</p>
		);
	}
	return <HoofdstukScherm {...props} hoofdstuk={hoofdstuk.waarde} />;
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
