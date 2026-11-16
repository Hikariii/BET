import { useEffect, useRef } from 'preact/hooks';
import type { Precedent, Referentie, RichtlijnSectie } from '../data/types';
import { maakAdres } from './adres';
import { laadRichtlijn } from './gegevens';
import { dialoogOpen } from './help/dialoogOpen';
import { useLaden } from './hooks';
import { InlineMarkdown, Markdownweergave } from './Markdownweergave';
import type { Naslag } from './naslag';
import { precedentenBijRegel } from './precedentenBijRegel';

type Props = {
	naslag: Naslag;
	boekId: string;
	referentie: Referentie;
	/** Het element dat de verwijzing met `aria-controls` aanwijst. */
	id: string;
	onSluit: () => void;
};

/** De richtlijnparagraaf of de bij een logregel horende precedenten, onder het vers waar de verwijzing stond. */
export function Naslagkaart({ naslag, boekId, referentie, id, onSluit }: Props) {
	const kopRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		kopRef.current?.focus();
		const bijToets = (gebeurtenis: KeyboardEvent) => {
			if (gebeurtenis.key === 'Escape' && !dialoogOpen()) {
				onSluit();
			}
		};
		window.addEventListener('keydown', bijToets);
		return () => window.removeEventListener('keydown', bijToets);
	}, [naslag, onSluit]);

	const titel = naslag.soort === 'richtlijn' ? `Richtlijn §${naslag.paragraaf}` : 'Precedenten';
	return (
		<aside class="naslagkaart" data-help="naslagkaart" id={id} aria-labelledby={`${id}-titel`}>
			<header>
				<h2 id={`${id}-titel`} tabIndex={-1} ref={kopRef}>
					{titel}
				</h2>
				<button type="button" onClick={onSluit}>
					Sluiten
				</button>
			</header>
			{naslag.soort === 'richtlijn' ? (
				<RichtlijnInhoud paragraaf={naslag.paragraaf} />
			) : (
				<PrecedentenInhoud precedenten={precedentenBijRegel(naslag.regel, referentie.precedenten)} aantalInTabel={referentie.precedenten.length} boekId={boekId} />
			)}
		</aside>
	);
}

function RichtlijnInhoud({ paragraaf }: { paragraaf: string }) {
	const richtlijn = useLaden(laadRichtlijn, []);
	if (richtlijn.soort === 'laden') {
		return <p>De richtlijn wordt geladen.</p>;
	}
	if (richtlijn.soort === 'fout') {
		return <p role="alert">De richtlijn kon niet geladen worden: {richtlijn.melding}</p>;
	}
	const sectie = zoekSectie(richtlijn.waarde, paragraaf);
	if (sectie === null) {
		return <p>§{paragraaf} staat niet in de richtlijn.</p>;
	}
	return (
		<>
			<p class="sectietitel">{sectie.titel}</p>
			<Markdownweergave markdown={sectie.markdown} />
		</>
	);
}

function zoekSectie(secties: readonly RichtlijnSectie[], paragraaf: string): RichtlijnSectie | null {
	return secties.find((sectie) => sectie.paragraaf.toLowerCase() === paragraaf.toLowerCase()) ?? null;
}

type PrecedentenProps = {
	/** De precedenten die bij de logregel horen. */
	precedenten: readonly Precedent[];
	aantalInTabel: number;
	boekId: string;
};

function PrecedentenInhoud({ precedenten, aantalInTabel, boekId }: PrecedentenProps) {
	const alleKeuzes = <a href={maakAdres({ soort: 'begrippen', boek: boekId, tabblad: 'besloten' })}>tabblad Vertaalkeuzes</a>;
	if (precedenten.length === 0) {
		return <p class="naslagmelding">
				Het log wijst niet aan welke vertaalkeuze bedoeld is, en op de woorden van deze regel is er geen gevonden. Bekijk alle vertaalkeuzes op het {alleKeuzes}.
			</p>;
	}
	return (
		<>
			<p class="naslagmelding">
				Mogelijk horen {precedenten.length} van de {aantalInTabel} vertaalkeuzes bij deze regel: gevonden op de woorden van de regel, want het log wijst niet aan welke bedoeld is. De rest staat op het {alleKeuzes}.
			</p>
			<div class="tabelrand">
				<table>
					<thead>
						<tr>
							<th scope="col">Bron</th>
							<th scope="col">Vereenvoudigd</th>
							<th scope="col">Plaats</th>
							<th scope="col">Status</th>
							<th scope="col">Opmerking</th>
						</tr>
					</thead>
					<tbody>
						{precedenten.map((precedent) => (
							<tr>
								<td>
									<InlineMarkdown tekst={precedent.bron} />
								</td>
								<td>
									<InlineMarkdown tekst={precedent.vereenvoudigd} />
								</td>
								<td>{precedent.plaats}</td>
								<td>{precedent.status}</td>
								<td>
									<InlineMarkdown tekst={precedent.opmerking} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
}
