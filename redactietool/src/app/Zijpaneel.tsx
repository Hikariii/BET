import { useEffect, useRef, useState } from 'preact/hooks';
import type { Precedent, Referentie, RichtlijnSectie } from '../data/types';
import { laadRichtlijn } from './gegevens';
import { useLaden } from './hooks';
import { InlineMarkdown, Markdownweergave } from './Markdownweergave';
import type { Naslag } from './naslag';
import { precedentenBijRegel } from './precedentenBijRegel';

type Props = {
	naslag: Naslag;
	referentie: Referentie;
	onSluit: () => void;
	sluitLabel: string;
	/** Bij precedenten: de bij de logregel horende rijen markeren en de rest inklappen (lay-outproef p3). */
	markeerRegel: boolean;
};

export function Zijpaneel({ naslag, referentie, onSluit, sluitLabel, markeerRegel }: Props) {
	const kopRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		const opener = document.activeElement;
		return () => {
			if (opener instanceof HTMLElement && opener.isConnected) {
				opener.focus();
			}
		};
	}, []);
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
					{sluitLabel}
				</button>
			</header>
			{naslag.soort === 'richtlijn' ? (
				<RichtlijnInhoud paragraaf={naslag.paragraaf} />
			) : (
				<PrecedentenInhoud precedenten={referentie.precedenten} regel={markeerRegel ? naslag.regel : null} />
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
	precedenten: readonly Precedent[];
	/** De logregel waar de verwijzing in stond; `null` laat de tabel zoals hij is. */
	regel: string | null;
};

function PrecedentenInhoud({ precedenten, regel }: PrecedentenProps) {
	const [zoekterm, zetZoekterm] = useState('');
	const [toonAlle, zetToonAlle] = useState(false);
	const gezocht = zoekterm.trim().toLowerCase();
	const herkend = regel === null ? [] : precedentenBijRegel(regel, precedenten);
	const ingeklapt = herkend.length > 0 && !toonAlle && gezocht === '';
	const zichtbaar = precedenten
		.map((precedent, index) => ({ precedent, index }))
		.filter(({ precedent, index }) =>
			ingeklapt
				? herkend.includes(index)
				: [precedent.bron, precedent.vereenvoudigd, precedent.plaats, precedent.opmerking].some((veld) => veld.toLowerCase().includes(gezocht)),
		);
	return (
		<>
			{regel !== null && (
				<p class="herkendmelding">
					{herkend.length === 0
						? 'Bij deze regel is geen precedent herkend; de hele tabel staat hieronder.'
						: `Gemarkeerd: wat bij deze regel hoort (${herkend.length} van ${precedenten.length}).`}
				</p>
			)}
			<label class="zoekveld">
				Zoeken in de precedenten
				<input type="search" value={zoekterm} onInput={(gebeurtenis) => zetZoekterm(gebeurtenis.currentTarget.value)} />
			</label>
			<p aria-live="polite">
				{zichtbaar.length} van {precedenten.length} precedenten
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
						{zichtbaar.map(({ precedent, index }) => (
							<tr class={herkend.includes(index) ? 'herkend' : undefined}>
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
			{herkend.length > 0 && gezocht === '' && (
				<button type="button" class="toonalle" aria-expanded={toonAlle} onClick={() => zetToonAlle(!toonAlle)}>
					{toonAlle ? 'Alleen de gemarkeerde tonen' : `Alle ${precedenten.length} precedenten tonen`}
				</button>
			)}
		</>
	);
}
