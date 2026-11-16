import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RichtlijnSectie } from '../../data/types';
import {
	bewaarRichtlijnReactie,
	haalRichtlijnReactieWeg,
	leesRichtlijnReacties,
	paragraafReactieId,
	type RichtlijnReactie,
} from '../../reacties/richtlijnReacties';
import { maakAdres } from '../adres';
import { useOpslagTeller } from '../bewaren/useOpslagTeller';
import { browseropslag } from '../bewerken/useTussenstand';
import { laadRichtlijn } from '../gegevens';
import { useLaden } from '../hooks';
import { Markdownweergave } from '../Markdownweergave';
import { ReactieVak, type ReactieTeksten } from '../reageren/ReactieVak';
import { NieuweRegel } from './NieuweRegel';
import { markeringTekst, reactieLabel, sectieId, sectiekop } from './richtlijnTekst';
import './richtlijn.css';

const REACTIE_OP_PARAGRAAF: ReactieTeksten = {
	veld: 'Je reactie voor Claude',
	vinkje: 'Voorstel voor een nieuwe of andere regel',
	uitleg: 'Claude schrijft een voorstel voor de richtlijn; de eigenaar beslist.',
};

const NIEUWE_REGEL_ID = 'richtlijn-nieuwe-regel';

type Props = {
	boek: string;
	/** De paragraaf uit het adres (bv. "17B"): de pagina scrolt ernaartoe en geeft hem de focus. `null` voor de hele pagina. */
	paragraaf: string | null;
};

/**
 * De pagina `#/<boek>/richtlijn`: bovenaan over de hele breedte de titel en "Over deze versie",
 * daaronder links de inhoudsopgave en rechts de richtlijn in een eigen scrollpaneel.
 * Een link in de inhoudsopgave scrolt het paneel; de paragraaf die bovenaan het paneel staat, is in de inhoudsopgave gemarkeerd.
 */
export function Richtlijnpagina({ boek, paragraaf }: Props) {
	const richtlijn = useLaden(laadRichtlijn, []);
	const opslagTeller = useOpslagTeller();
	const reacties = useMemo(() => leesRichtlijnReacties(browseropslag()), [opslagTeller]);
	const kolommen = useRef<HTMLDivElement>(null);
	const paneel = useRef<HTMLDivElement>(null);
	const [huidig, zetHuidig] = useState<string | null>(null);
	const klaar = richtlijn.soort === 'klaar';

	const scrolNaar = (id: string) => {
		const doel = document.getElementById(id);
		if (doel === null || paneel.current === null) return;
		paneel.current.scrollTop += doel.getBoundingClientRect().top - paneel.current.getBoundingClientRect().top;
		doel.focus({ preventScroll: true });
		zetHuidig(id);
	};

	useEffect(() => {
		if (paragraaf === null || !klaar) return;
		kolommen.current?.scrollIntoView({ block: 'start' });
		scrolNaar(`richtlijn-${paragraaf}`);
	}, [paragraaf, klaar]);

	if (richtlijn.soort === 'laden') return <p class="melding">De richtlijn wordt geladen.</p>;
	if (richtlijn.soort === 'fout') {
		return (
			<p class="melding" role="alert">
				De richtlijn kon niet geladen worden: {richtlijn.melding}
			</p>
		);
	}

	const { titel, secties } = richtlijn.waarde;
	const [eerste, ...overige] = secties;
	const intro = eerste?.paragraaf === '' ? eerste : null;
	const inhoud = intro === null ? secties : overige;
	const reactiePerId = new Map(reacties.map((reactie) => [reactie.id, reactie]));
	const voorstellen = reacties.filter((reactie) => reactie.paragraaf === null);
	const onbekend = paragraaf !== null && !secties.some((sectie) => sectie.paragraaf === paragraaf);

	const bijScrollen = () => {
		const bovenkant = paneel.current?.getBoundingClientRect().top;
		if (bovenkant === undefined) return;
		const koppen = [...(paneel.current?.querySelectorAll<HTMLElement>('.richtlijn-sectie > :is(h2, h3), #' + NIEUWE_REGEL_ID) ?? [])];
		const boven = koppen.filter((kop) => kop.getBoundingClientRect().top <= bovenkant + KOP_MARGE);
		zetHuidig(boven.at(-1)?.id ?? koppen[0]?.id ?? null);
	};

	return (
		<section class="richtlijn" aria-labelledby="richtlijn-titel">
			<div class="richtlijn-kop">
				<h1 id="richtlijn-titel">{titel}</h1>
				{onbekend && <p class="richtlijn-onbekend" role="alert">§{paragraaf} staat niet in de richtlijn.</p>}
				{intro !== null && <Sectietekst sectie={intro} id="richtlijn-over-deze-versie" reactie={null} />}
			</div>
			<div class="richtlijn-kolommen" ref={kolommen}>
				<Inhoudsopgave boek={boek} secties={inhoud} reactiePerId={reactiePerId} aantalVoorstellen={voorstellen.length} huidig={huidig} scrolNaar={scrolNaar} />
				<div class="richtlijn-paneel" ref={paneel} onScroll={bijScrollen}>
					{inhoud.map((sectie, index) => (
						<Sectietekst
							key={sectieId(sectie, index)}
							sectie={sectie}
							id={sectieId(sectie, index)}
							reactie={reactiePerId.get(paragraafReactieId(sectie.paragraaf)) ?? null}
						/>
					))}
					<NieuweRegel voorstellen={voorstellen} />
				</div>
			</div>
		</section>
	);
}

/** Een kop telt als "hier ben je" zodra hij binnen deze afstand (in pixels) van de bovenkant van het paneel staat. */
const KOP_MARGE = 24;

function Markeringslabel({ markering }: Pick<RichtlijnSectie, 'markering'>) {
	if (markering === null) return null;
	return <span class={`richtlijn-label richtlijn-label-${markering.soort}`}>{markeringTekst(markering)}</span>;
}

type InhoudsopgaveProps = {
	boek: string;
	secties: readonly RichtlijnSectie[];
	reactiePerId: ReadonlyMap<string, RichtlijnReactie>;
	aantalVoorstellen: number;
	/** De id van de kop die bovenaan het paneel staat. */
	huidig: string | null;
	scrolNaar: (id: string) => void;
};

function Inhoudsopgave({ boek, secties, reactiePerId, aantalVoorstellen, huidig, scrolNaar }: InhoudsopgaveProps) {
	const lijst = useRef<HTMLElement>(null);
	const paginaAdres = maakAdres({ soort: 'richtlijn', boek, paragraaf: null });

	// De gemarkeerde link blijft in beeld als de inhoudsopgave zelf langer is dan het scherm.
	useEffect(() => {
		const link = lijst.current?.querySelector<HTMLElement>('[aria-current="location"]');
		const houder = lijst.current;
		if (link === null || link === undefined || houder === null) return;
		const marge = link.getBoundingClientRect();
		const rand = houder.getBoundingClientRect();
		if (marge.top < rand.top) houder.scrollTop -= rand.top - marge.top;
		else if (marge.bottom > rand.bottom) houder.scrollTop += marge.bottom - rand.bottom;
	}, [huidig]);

	/** Scrolt het paneel en zet het adres zonder een nieuwe navigatie, zodat terug en delen blijven werken. */
	const kies = (gebeurtenis: MouseEvent, id: string, href: string) => {
		gebeurtenis.preventDefault();
		if (href !== paginaAdres) history.replaceState(null, '', href);
		scrolNaar(id);
	};

	const link = (id: string, href: string, tekst: string) => (
		<a href={href} aria-current={id === huidig ? 'location' : undefined} onClick={(gebeurtenis) => kies(gebeurtenis, id, href)}>
			{tekst}
		</a>
	);

	return (
		<nav class="richtlijn-inhoud" ref={lijst} aria-labelledby="richtlijn-inhoud-titel" data-help="richtlijn-inhoud">
			<h2 id="richtlijn-inhoud-titel">Inhoud</h2>
			<ol>
				{secties.map((sectie, index) => {
					const reactie = sectie.paragraaf === '' ? undefined : reactiePerId.get(paragraafReactieId(sectie.paragraaf));
					// Een kop zonder nummer heeft geen eigen adres.
					const href = sectie.paragraaf === '' ? paginaAdres : maakAdres({ soort: 'richtlijn', boek, paragraaf: sectie.paragraaf });
					return (
						<li class={`richtlijn-inhoud-niveau-${sectie.niveau}`}>
							{link(sectieId(sectie, index), href, sectiekop(sectie))}
							<Markeringslabel markering={sectie.markering} />
							{reactie !== undefined && <span class="richtlijn-label richtlijn-label-reactie">{reactieLabel(reactie)}</span>}
						</li>
					);
				})}
				<li class="richtlijn-inhoud-niveau-2">
					{link(NIEUWE_REGEL_ID, paginaAdres, 'Nieuwe regel voorstellen')}
					{aantalVoorstellen > 0 && <span class="richtlijn-label richtlijn-label-reactie">{aantalVoorstellen === 1 ? '1 voorstel' : `${aantalVoorstellen} voorstellen`}</span>}
				</li>
			</ol>
		</nav>
	);
}

type SectietekstProps = {
	sectie: RichtlijnSectie;
	id: string;
	reactie: RichtlijnReactie | null;
};

function Sectietekst({ sectie, id, reactie }: SectietekstProps) {
	const Kop = sectie.niveau === 2 ? 'h2' : 'h3';
	return (
		<section class={`richtlijn-sectie richtlijn-sectie-niveau-${sectie.niveau}`} aria-labelledby={id}>
			<Kop id={id} tabIndex={-1}>
				{sectiekop(sectie)}
				<Markeringslabel markering={sectie.markering} />
			</Kop>
			{sectie.eigenMarkdown !== '' && <Markdownweergave markdown={sectie.eigenMarkdown} />}
			{sectie.paragraaf !== '' && <ReactieOpParagraaf sectie={sectie} reactie={reactie} />}
		</section>
	);
}

function ReactieOpParagraaf({ sectie, reactie }: { sectie: RichtlijnSectie; reactie: RichtlijnReactie | null }) {
	const id = paragraafReactieId(sectie.paragraaf);
	return (
		<div data-help="richtlijn-reageren">
			<ReactieVak
				naam={`Reageren op ${sectiekop(sectie)}`}
				teksten={REACTIE_OP_PARAGRAAF}
				reactie={reactie === null ? null : { tekst: reactie.tekst, vinkje: reactie.voorstel }}
				bewaar={(tekst, voorstel) =>
					bewaarRichtlijnReactie(browseropslag(), { id, paragraaf: sectie.paragraaf, titel: sectie.titel, tekst, voorstel, gegeven: new Date().toISOString() })
				}
				haalWeg={() => haalRichtlijnReactieWeg(browseropslag(), id)}
			/>
		</div>
	);
}
