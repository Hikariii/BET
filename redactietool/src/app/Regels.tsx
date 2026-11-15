import { useState } from 'preact/hooks';
import type { LogVers, OpenVraag, Verwijzing } from '../data/types';
import { kapRegels } from './kapRegels';
import { InlineMarkdown } from './Markdownweergave';
import type { Naslag } from './naslag';
import { isOpen } from './vertaalvragen';
import './regels.css';

type Props = {
	/** De logblokken waar dit vers in valt. */
	logVerzen: readonly LogVers[];
	/** De vertaalvragen uit de referentie die aan dit vers hangen. */
	vragen: readonly OpenVraag[];
	/** In de smalle kolom: na de eerste regels staat de rest achter "nog N regels". */
	kapAf: boolean;
	onOpenNaslag: (naslag: Naslag) => void;
};

export function Regels({ logVerzen, vragen, kapAf, onOpenNaslag }: Props) {
	const [uitgeklapt, zetUitgeklapt] = useState(false);
	const aantalPerBlok = logVerzen.map((logVers) => logVers.wijzigingen.length);
	const { zichtbaarPerBlok } = kapRegels(aantalPerBlok, uitgeklapt || !kapAf);
	const inklapbaar = kapAf ? kapRegels(aantalPerBlok, false).verborgen : 0;
	const logVragen = logVerzen.flatMap((logVers) => logVers.vragen);
	const heeftRegels = logVerzen.some((logVers) => logVers.wijzigingen.length > 0);
	return (
		<>
			{logVerzen.map((logVers, blok) =>
				zichtbaarPerBlok[blok] === 0 && logVers.wijzigingen.length > 0 ? null : (
				<div class="logblok">
					{logVers.verzen.length > 1 && <p class="logbereik">Vers {bereik(logVers.verzen)}</p>}
					<ul>
						{logVers.wijzigingen.slice(0, zichtbaarPerBlok[blok]).map((regel) => (
							<li>
								<InlineMarkdown tekst={regel.tekst} />
								{regel.verwijzingen.map((verwijzing) => (
									<button type="button" class="verwijzing" onClick={() => onOpenNaslag(naarNaslag(verwijzing))}>
										{verwijzing.soort === 'paragraaf' ? `§${verwijzing.paragraaf}` : 'precedent'}
									</button>
								))}
							</li>
						))}
					</ul>
				</div>
				),
			)}
			{inklapbaar > 0 && (
				<button type="button" class="meerregels" aria-expanded={uitgeklapt} onClick={() => zetUitgeklapt(!uitgeklapt)}>
					{uitgeklapt ? 'minder regels' : `nog ${inklapbaar} regels`}
				</button>
			)}
			{!heeftRegels && <p class="geen-regels">Geen regels in het log.</p>}
			{(vragen.length > 0 || logVragen.length > 0) && <Vraag vragen={vragen} logVragen={logVragen} />}
		</>
	);
}

function bereik(verzen: readonly number[]): string {
	const eerste = verzen[0];
	const laatste = verzen.at(-1);
	return eerste === laatste ? String(eerste) : `${eerste}–${laatste}`;
}

function naarNaslag(verwijzing: Verwijzing): Naslag {
	return verwijzing.soort === 'paragraaf'
		? { soort: 'richtlijn', paragraaf: verwijzing.paragraaf }
		: { soort: 'precedenten' };
}

function Vraag({ vragen, logVragen }: { vragen: readonly OpenVraag[]; logVragen: readonly string[] }) {
	return (
		<details class={vragen.some(isOpen) ? 'vraag vraag-open' : 'vraag'}>
			<summary>vraag</summary>
			{vragen.map((vraag) => (
				<dl>
					<dt>Kwestie</dt>
					<dd>
						<InlineMarkdown tekst={vraag.kwestie} /> <span class="vraagstatus">({vraag.status})</span>
					</dd>
					<dt>Gekozen</dt>
					<dd>
						<InlineMarkdown tekst={vraag.gekozen} />
					</dd>
					<dt>Alternatief</dt>
					<dd>
						<InlineMarkdown tekst={vraag.alternatief} />
					</dd>
					{vraag.besluit !== '' && (
						<>
							<dt>Besluit</dt>
							<dd>
								<InlineMarkdown tekst={vraag.besluit} />
							</dd>
						</>
					)}
				</dl>
			))}
			{logVragen.map((tekst) => (
				<p>
					<InlineMarkdown tekst={tekst} />
				</p>
			))}
		</details>
	);
}
