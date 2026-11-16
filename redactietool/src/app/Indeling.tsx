import type { ComponentChildren } from 'preact';
import type { BoekData, Referentie } from '../data/types';
import { maakAdres, versAdres } from './adres';
import { BewaarStatus } from './bewaren/BewaarStatus';
import { Bovenbalk } from './bovenbalk/Bovenbalk';
import { GrootteKeuze } from './GrootteKeuze';
import { HoofdstukStrip } from './navigatie/HoofdstukStrip';
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
 * `navigatie-zijbalk` of `navigatie-strip` en `zijbalk-ingeklapt`.
 */
export function Indeling({ ontwerp, weergavebeheer, boek, referentie, pagina, huidigHoofdstuk, titel, acties, children }: Props) {
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
		ingeklapt ? 'zijbalk-ingeklapt' : '',
	].filter((klasse) => klasse !== '');

	return (
		<>
			<Bovenbalk
				uitvoering={config.bovenbalk}
				boek={<BoekSlot boek={boek} config={config} ingeklapt={ingeklapt} begrippenOpen={begrippenOpen} />}
				titel={titel}
				acties={acties}
				bewaarstatus={<BewaarStatus boek={boek} vorm={config.status} overzichtOpen={pagina === 'bewaard'} />}
				grootte={<GrootteKeuze grootte={weergavebeheer.weergave.grootte} onKies={weergavebeheer.zetGrootte} />}
				navigatie={
					config.navigatie === 'strip' ? <HoofdstukStrip boek={boek} referentie={referentie} huidigHoofdstuk={huidigHoofdstuk} /> : null
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

type BoekSlotProps = { boek: BoekData; config: OntwerpConfig; ingeklapt: boolean; begrippenOpen: boolean };

/** De naam van het boek, en de knop Keuzes en vragen zodra de zijbalk die niet meer toont (ingeklapt of geen zijbalk). */
function BoekSlot({ boek, config, ingeklapt, begrippenOpen }: BoekSlotProps) {
	const keuzesInBalk = config.navigatie === 'strip' || ingeklapt;
	return (
		<>
			<a class="bovenbalk-boeknaam" href={versAdres(boek.id, 1)}>
				{boek.naam}
			</a>
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
