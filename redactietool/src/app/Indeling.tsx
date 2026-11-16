import type { ComponentChildren } from 'preact';
import type { BoekData, Referentie } from '../data/types';
import { maakAdres, versAdres, type Tabblad } from './adres';
import { BewaarStatus } from './bewaren/BewaarStatus';
import { BoekTabbladen } from './bovenbalk/BoekTabbladen';
import { Bovenbalk } from './bovenbalk/Bovenbalk';
import { HeleBoekMenu } from './bovenbalk/HeleBoekMenu';
import { GrootteKeuze } from './GrootteKeuze';
import type { Plek } from './navigatie/boekplekken';
import { HoofdstukStrip } from './navigatie/HoofdstukStrip';
import { useBoekPlekken } from './navigatie/useBoekPlekken';
import type { Ontwerp, OntwerpConfig } from './ontwerpProef';
import type { Weergavebeheer } from './weergave/useWeergave';
import { Zijbalk } from './Zijbalk';

/** Welke pagina binnen het boek open staat, voor `aria-current` en de titel in de bovenbalk. */
export type Pagina = 'hoofdstuk' | 'begrippen' | 'bewaard';

type Props = {
	ontwerp: Ontwerp;
	weergavebeheer: Weergavebeheer;
	boek: BoekData;
	referentie: Referentie;
	pagina: Pagina;
	/** Het hoofdstuk dat open staat. */
	huidigHoofdstuk: number | null;
	/** Het tabblad van Keuzes en vragen dat open staat; `null` op een andere pagina. */
	tabblad: Tabblad | null;
	/** De titel in de bovenbalk: de hoofdstuktitel, of de naam van de pagina. */
	titel: ComponentChildren;
	/** Hoofdstukacties voor de bovenbalk; `null` buiten een hoofdstuk. */
	acties: ComponentChildren;
	children: ComponentChildren;
};

/**
 * De indeling van een boekpagina: zijbalk en inhoud, en bij een ontwerpvariant ook de bovenbalk.
 * Zonder variant is het de indeling zoals de tool was: zijbalk en inhoud, zonder bovenbalk.
 * De klassen van `.indeling` zeggen welke varianten gelden: `met-bovenbalk` (alleen bij een variant), `ontwerp-v1` tot `ontwerp-v6`, `breedte-tekens` of `breedte-vol`, `bovenbalk-een` of `bovenbalk-twee`,
 * `navigatie-zijbalk` of `navigatie-strip`, `boeknavigatie-knop`, `-tabbladen`, `-menu` of `-werkbalk`, en `zijbalk-ingeklapt`.
 */
export function Indeling({ ontwerp, weergavebeheer, boek, referentie, pagina, huidigHoofdstuk, tabblad, titel, acties, children }: Props) {
	const begrippenOpen = pagina === 'begrippen';
	if (ontwerp.variant === null) {
		return (
			<div class="indeling">
				<Zijbalk boek={boek} referentie={referentie} huidigHoofdstuk={huidigHoofdstuk} begrippenOpen={begrippenOpen} inklapbaar={false} />
				<main>{children}</main>
			</div>
		);
	}
	const { config } = ontwerp;
	const ingeklapt = config.navigatie === 'zijbalk' && weergavebeheer.weergave.zijbalkIngeklapt;
	const klassen = [
		'indeling',
		'met-bovenbalk',
		`ontwerp-${ontwerp.variant}`,
		`breedte-${config.breedte}`,
		`bovenbalk-${config.bovenbalk}`,
		`navigatie-${config.navigatie}`,
		`boeknavigatie-${config.boeknavigatie}`,
		ingeklapt ? 'zijbalk-ingeklapt' : '',
	].filter((klasse) => klasse !== '');

	// Met de plekken in de balk heeft alleen een hoofdstuk een titel en een strip; elders staat de naam van de plek al in de balk en als kop op de pagina.
	const plekkenInBalk = config.boeknavigatie !== 'knop';
	const opHoofdstukPagina = pagina === 'hoofdstuk';
	const metHoofdstukbalk = !plekkenInBalk || opHoofdstukPagina;
	const huidigPlek: Plek | null = opHoofdstukPagina ? 'hoofdstukken' : tabblad;
	return (
		<>
			<Bovenbalk
				uitvoering={config.bovenbalk}
				boek={
					<BoekSlot
						boek={boek}
						referentie={referentie}
						config={config}
						ingeklapt={ingeklapt}
						begrippenOpen={begrippenOpen}
						huidigHoofdstuk={huidigHoofdstuk}
						huidigPlek={huidigPlek}
					/>
				}
				titel={metHoofdstukbalk ? titel : null}
				acties={metHoofdstukbalk ? acties : null}
				bewaarstatus={<BewaarStatus boek={boek} vorm={config.status} overzichtOpen={pagina === 'bewaard'} />}
				grootte={<GrootteKeuze grootte={weergavebeheer.weergave.grootte} onKies={weergavebeheer.zetGrootte} />}
				navigatie={
					config.navigatie === 'strip' && metHoofdstukbalk ? <HoofdstukStrip boek={boek} referentie={referentie} huidigHoofdstuk={huidigHoofdstuk} /> : null
				}
			/>
			<div class={klassen.join(' ')}>
				{config.navigatie === 'zijbalk' && (
					<Zijbalk
						boek={boek}
						referentie={referentie}
						huidigHoofdstuk={huidigHoofdstuk}
						begrippenOpen={begrippenOpen}
						inklapbaar={{ ingeklapt, onWissel: weergavebeheer.wisselZijbalk }}
					/>
				)}
				<main>{children}</main>
			</div>
		</>
	);
}

type BoekSlotProps = {
	boek: BoekData;
	referentie: Referentie;
	config: OntwerpConfig;
	ingeklapt: boolean;
	begrippenOpen: boolean;
	huidigHoofdstuk: number | null;
	huidigPlek: Plek | null;
};

/** De naam van het boek en daarnaast de weg naar de rest van het boek, afhankelijk van `config.boeknavigatie`. */
function BoekSlot({ boek, referentie, config, ingeklapt, begrippenOpen, huidigHoofdstuk, huidigPlek }: BoekSlotProps) {
	const plekken = useBoekPlekken(boek, referentie, huidigHoofdstuk);
	const keuzesInBalk = config.navigatie === 'strip' || ingeklapt;
	const naam = (
		<a class="bovenbalk-boeknaam" href={versAdres(boek.id, 1)}>
			{boek.naam}
		</a>
	);
	if (config.boeknavigatie === 'tabbladen' || config.boeknavigatie === 'werkbalk') {
		return (
			<>
				{naam}
				<BoekTabbladen boekNaam={boek.naam} plekken={plekken} huidig={huidigPlek} vorm={config.boeknavigatie} />
			</>
		);
	}
	if (config.boeknavigatie === 'menu') {
		const [hoofdstukken, ...onderdelen] = plekken;
		return (
			<>
				{naam}
				{hoofdstukken !== undefined && <BoekTabbladen boekNaam={boek.naam} plekken={[hoofdstukken]} huidig={huidigPlek} vorm="tabbladen" />}
				<HeleBoekMenu plekken={onderdelen} huidig={huidigPlek} />
			</>
		);
	}
	return (
		<>
			{naam}
			{keuzesInBalk && (
				<a
					class="bovenbalk-keuzes"
					href={maakAdres({ soort: 'begrippen', boek: boek.id, tabblad: 'besloten' })}
					aria-current={begrippenOpen ? 'page' : undefined}
				>
					Keuzes en vragen
				</a>
			)}
		</>
	);
}
