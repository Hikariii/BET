import { useEffect, useMemo } from 'preact/hooks';
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

/** De pagina `#/<boek>/richtlijn`: de hele richtlijn als tekst, met per paragraaf een vak Reageren en onderaan een vak voor een nieuwe regel. */
export function Richtlijnpagina({ boek, paragraaf }: Props) {
	const richtlijn = useLaden(laadRichtlijn, []);
	const opslagTeller = useOpslagTeller();
	const reacties = useMemo(() => leesRichtlijnReacties(browseropslag()), [opslagTeller]);
	const klaar = richtlijn.soort === 'klaar';
	useEffect(() => {
		if (paragraaf !== null && klaar) naarSectie(`richtlijn-${paragraaf}`);
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

	return (
		<section class="richtlijn" aria-labelledby="richtlijn-titel">
			<h1 id="richtlijn-titel">{titel}</h1>
			{onbekend && <p class="richtlijn-onbekend" role="alert">§{paragraaf} staat niet in de richtlijn.</p>}
			{intro !== null && <Sectietekst sectie={intro} id="richtlijn-over-deze-versie" reactie={null} />}
			<Inhoudsopgave boek={boek} secties={inhoud} reactiePerId={reactiePerId} aantalVoorstellen={voorstellen.length} />
			{inhoud.map((sectie, index) => (
				<Sectietekst
					key={sectieId(sectie, index)}
					sectie={sectie}
					id={sectieId(sectie, index)}
					reactie={reactiePerId.get(paragraafReactieId(sectie.paragraaf)) ?? null}
				/>
			))}
			<NieuweRegel voorstellen={voorstellen} />
		</section>
	);
}

/** Scrolt naar het element en geeft het de focus; `scroll-padding-top` van de pagina houdt het onder de vaste balk uit. */
function naarSectie(id: string): void {
	const element = document.getElementById(id);
	if (element === null) return;
	element.scrollIntoView({ block: 'start' });
	element.focus({ preventScroll: true });
}

function Markeringslabel({ markering }: Pick<RichtlijnSectie, 'markering'>) {
	if (markering === null) return null;
	return <span class={`richtlijn-label richtlijn-label-${markering.soort}`}>{markeringTekst(markering)}</span>;
}

type InhoudsopgaveProps = {
	boek: string;
	secties: readonly RichtlijnSectie[];
	reactiePerId: ReadonlyMap<string, RichtlijnReactie>;
	aantalVoorstellen: number;
};

function Inhoudsopgave({ boek, secties, reactiePerId, aantalVoorstellen }: InhoudsopgaveProps) {
	const paginaAdres = maakAdres({ soort: 'richtlijn', boek, paragraaf: null });
	return (
		<nav class="richtlijn-inhoud" aria-labelledby="richtlijn-inhoud-titel" data-help="richtlijn-inhoud">
			<h2 id="richtlijn-inhoud-titel">Inhoud</h2>
			<ol>
				{secties.map((sectie, index) => {
					const reactie = sectie.paragraaf === '' ? undefined : reactiePerId.get(paragraafReactieId(sectie.paragraaf));
					const id = sectieId(sectie, index);
					// Een kop zonder nummer heeft geen adres: de link blijft op de pagina en scrolt zelf.
					const href = sectie.paragraaf === '' ? paginaAdres : maakAdres({ soort: 'richtlijn', boek, paragraaf: sectie.paragraaf });
					return (
						<li class={`richtlijn-inhoud-niveau-${sectie.niveau}`}>
							<a
								href={href}
								onClick={
									sectie.paragraaf === ''
										? (gebeurtenis) => {
												gebeurtenis.preventDefault();
												naarSectie(id);
											}
										: undefined
								}
							>
								{sectiekop(sectie)}
							</a>
							<Markeringslabel markering={sectie.markering} />
							{reactie !== undefined && <span class="richtlijn-label richtlijn-label-reactie">{reactieLabel(reactie)}</span>}
						</li>
					);
				})}
				<li class="richtlijn-inhoud-niveau-2">
					<a
						href={paginaAdres}
						onClick={(gebeurtenis) => {
							gebeurtenis.preventDefault();
							naarSectie(NIEUWE_REGEL_ID);
						}}
					>
						Nieuwe regel voorstellen
					</a>
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
