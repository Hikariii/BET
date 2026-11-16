import { useState } from 'preact/hooks';
import type { LogVers, OpenVraag, Verwijzing } from '../data/types';
import { kapRegels, ZICHTBARE_REGELS } from './kapRegels';
import { InlineMarkdown } from './Markdownweergave';
import { zelfdeNaslag, type Naslag } from './naslag';
import { isOpen } from './vertaalvragen';
import './regels.css';

export type RegelsProps = {
	/** De logblokken waar dit vers in valt. */
	logVerzen: readonly LogVers[];
	/** De vertaalvragen uit de referentie die aan dit vers hangen. */
	vragen: readonly OpenVraag[];
	/** In de smalle kolom: na zoveel regels staat de rest achter "nog N regels"; `null` toont alles. */
	kapNa: number | null;
	/** De naslagkaart die onder dit vers open staat; die verwijzing meldt `aria-expanded`. */
	openNaslag: Naslag | null;
	/** Het element van de naslagkaart onder dit vers, voor `aria-controls`. */
	kaartId: string;
	onOpenNaslag: (naslag: Naslag, verwijzing: HTMLElement) => void;
};

export function Regels({ logVerzen, vragen, kapNa, openNaslag, kaartId, onOpenNaslag }: RegelsProps) {
	const [uitgeklapt, zetUitgeklapt] = useState(false);
	const zichtbaar = kapNa ?? ZICHTBARE_REGELS;
	const aantalPerBlok = logVerzen.map((logVers) => logVers.wijzigingen.length);
	const { zichtbaarPerBlok } = kapRegels(aantalPerBlok, uitgeklapt || kapNa === null, zichtbaar);
	const inklapbaar = kapNa === null ? 0 : kapRegels(aantalPerBlok, false, kapNa).verborgen;
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
								{regel.verwijzingen.map((verwijzing) => {
									const naslag = naarNaslag(verwijzing, regel.tekst);
									return (
										<button
											type="button"
											class="verwijzing"
											aria-expanded={openNaslag !== null && zelfdeNaslag(openNaslag, naslag)}
											aria-controls={kaartId}
											onClick={(gebeurtenis) => onOpenNaslag(naslag, gebeurtenis.currentTarget)}
										>
											{verwijzingsLabel(verwijzing)}
										</button>
									);
								})}
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
			{!heeftRegels && <p class="geen-regels">Geen vertaalregels in het log.</p>}
			{(vragen.length > 0 || logVragen.length > 0) && <Vraag vragen={vragen} logVragen={logVragen} />}
		</>
	);
}

function verwijzingsLabel(verwijzing: Verwijzing): string {
	return verwijzing.soort === 'paragraaf' ? `§${verwijzing.paragraaf}` : 'precedent';
}

function bereik(verzen: readonly number[]): string {
	const eerste = verzen[0];
	const laatste = verzen.at(-1);
	return eerste === laatste ? String(eerste) : `${eerste}–${laatste}`;
}

function naarNaslag(verwijzing: Verwijzing, regel: string): Naslag {
	return verwijzing.soort === 'paragraaf'
		? { soort: 'richtlijn', paragraaf: verwijzing.paragraaf }
		: { soort: 'precedenten', regel };
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
