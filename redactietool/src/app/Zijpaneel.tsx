import { useEffect, useRef, useState } from 'preact/hooks';
import type { Precedent, Referentie, RichtlijnSectie } from '../data/types';
import { laadRichtlijn } from './gegevens';
import { useLaden } from './hooks';
import { InlineMarkdown, Markdownweergave } from './Markdownweergave';
import type { Naslag } from './naslag';

type Props = {
	naslag: Naslag;
	referentie: Referentie;
	onSluit: () => void;
};

export function Zijpaneel({ naslag, referentie, onSluit }: Props) {
	const kopRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		kopRef.current?.focus();
		const bijToets = (gebeurtenis: KeyboardEvent) => {
			if (gebeurtenis.key === 'Escape') {
				onSluit();
			}
		};
		window.addEventListener('keydown', bijToets);
		return () => window.removeEventListener('keydown', bijToets);
	}, [naslag, onSluit]);

	const titel = naslag.soort === 'richtlijn' ? `Richtlijn §${naslag.paragraaf}` : 'Precedenten';
	return (
		<aside class="zijpaneel" aria-labelledby="zijpaneel-titel">
			<header>
				<h2 id="zijpaneel-titel" tabIndex={-1} ref={kopRef}>
					{titel}
				</h2>
				<button type="button" onClick={onSluit}>
					Sluiten
				</button>
			</header>
			{naslag.soort === 'richtlijn' ? (
				<RichtlijnInhoud paragraaf={naslag.paragraaf} />
			) : (
				<PrecedentenInhoud precedenten={referentie.precedenten} />
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
	if (sectie === undefined) {
		return <p>§{paragraaf} staat niet in de richtlijn.</p>;
	}
	return (
		<>
			<p class="sectietitel">{sectie.titel}</p>
			<Markdownweergave markdown={sectie.markdown} />
		</>
	);
}

function zoekSectie(secties: readonly RichtlijnSectie[], paragraaf: string): RichtlijnSectie | undefined {
	return secties.find((sectie) => sectie.paragraaf.toLowerCase() === paragraaf.toLowerCase());
}

function PrecedentenInhoud({ precedenten }: { precedenten: readonly Precedent[] }) {
	const [zoekterm, zetZoekterm] = useState('');
	const gezocht = zoekterm.trim().toLowerCase();
	const gevonden = precedenten.filter((precedent) =>
		[precedent.bron, precedent.vereenvoudigd, precedent.plaats, precedent.opmerking].some((veld) =>
			veld.toLowerCase().includes(gezocht),
		),
	);
	return (
		<>
			<label class="zoekveld">
				Zoeken in de precedenten
				<input type="search" value={zoekterm} onInput={(gebeurtenis) => zetZoekterm(gebeurtenis.currentTarget.value)} />
			</label>
			<p aria-live="polite">
				{gevonden.length} van {precedenten.length} precedenten
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
						{gevonden.map((precedent) => (
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
