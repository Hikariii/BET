import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { LogVers, OpenVraag, Verwijzing } from '../data/types';
import { registerVraagSleutel, vraagAdres as maakVraagAdres } from './begrippen/vraagAdres';
import { kapRegels } from './kapRegels';
import { splitsOpVerwijzingen } from '../log/leesLog';
import { InlineMarkdown } from './Markdownweergave';
import { parseerInline, type Inline } from './markdown';
import { zelfdeNaslag, type Naslag } from './naslag';
import { isOpen } from './vertaalvragen';
import './regels.css';

export type RegelsProps = {
	boekId: string;
	/** Het adres van de eerste vertaalvraag bij dit vers op Vertaalvragen, of `null` als er geen is. */
	vraagAdres: string | null;
	/** De logblokken waar dit vers in valt. */
	logVerzen: readonly LogVers[];
	/** De vertaalvragen uit de referentie die aan dit vers hangen. */
	vragen: readonly OpenVraag[];
	/** In de smalle kolom: na enkele regels staat de rest achter "nog N regels"; anders staan alle regels er. */
	gekapt: boolean;
	/** De naslagkaart die onder dit vers open staat; die verwijzing meldt `aria-expanded`. */
	openNaslag: Naslag | null;
	/** Het element van de naslagkaart onder dit vers, voor `aria-controls`. */
	kaartId: string;
	onOpenNaslag: (naslag: Naslag, verwijzing: HTMLElement) => void;
};

export function Regels({ boekId, vraagAdres, logVerzen, vragen, gekapt, openNaslag, kaartId, onOpenNaslag }: RegelsProps) {
	const [uitgeklapt, zetUitgeklapt] = useState(false);
	const aantalPerBlok = logVerzen.map((logVers) => logVers.wijzigingen.length);
	const { zichtbaarPerBlok } = kapRegels(aantalPerBlok, uitgeklapt || !gekapt);
	const inklapbaar = gekapt ? kapRegels(aantalPerBlok, false).verborgen : 0;
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
								<RegelTekst
									tekst={regel.tekst}
									openNaslag={openNaslag}
									kaartId={kaartId}
									onOpenNaslag={onOpenNaslag}
								/>
							</li>
						))}
					</ul>
				</div>
				),
			)}
			{inklapbaar > 0 && (
				<button type="button" class="meerregels" data-help="nog-n-regels" aria-expanded={uitgeklapt} onClick={() => zetUitgeklapt(!uitgeklapt)}>
					{uitgeklapt ? 'minder vertaalregels' : `nog ${inklapbaar} vertaalregels`}
				</button>
			)}
			{!heeftRegels && <p class="geen-regels">Claude heeft bij dit vers niets aangepast.</p>}
			{(vragen.length > 0 || logVragen.length > 0) && <Vraag boekId={boekId} vraagAdres={vraagAdres} vragen={vragen} logVragen={logVragen} />}
		</>
	);
}

type RegelTekstProps = Pick<RegelsProps, 'openNaslag' | 'kaartId' | 'onOpenNaslag'> & { tekst: string };

/** Een vertaalregel met de verwijzingen (`§11`, `precedent`) als knop op hun eigen plek in de tekst, zodat elke verwijzing er één keer staat. */
function RegelTekst({ tekst, openNaslag, kaartId, onOpenNaslag }: RegelTekstProps) {
	const metKnoppen = (stuk: string) =>
		splitsOpVerwijzingen(stuk).map((deel) => {
			if (deel.soort === 'tekst') return deel.tekst;
			const naslag = naarNaslag(deel.verwijzing, tekst);
			return (
				<button
					type="button"
					class="verwijzing"
					data-help="naslag-verwijzing"
					aria-expanded={openNaslag !== null && zelfdeNaslag(openNaslag, naslag)}
					aria-controls={kaartId}
					onClick={(gebeurtenis) => onOpenNaslag(naslag, gebeurtenis.currentTarget)}
				>
					{deel.tekst}
				</button>
			);
		});
	return <>{parseerInline(tekst).map((deel: Inline) => opmaak(deel.soort, metKnoppen(deel.tekst)))}</>;
}

function opmaak(soort: Inline['soort'], inhoud: ComponentChildren) {
	switch (soort) {
		case 'vet':
			return <strong>{inhoud}</strong>;
		case 'cursief':
			return <em>{inhoud}</em>;
		case 'code':
			return <code>{inhoud}</code>;
		case 'tekst':
			return inhoud;
	}
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

type VraagProps = { boekId: string; vraagAdres: string | null; vragen: readonly OpenVraag[]; logVragen: readonly string[] };

function Vraag({ boekId, vraagAdres, vragen, logVragen }: VraagProps) {
	return (
		<details class={vragen.some(isOpen) ? 'vraag vraag-open' : 'vraag'}>
			<summary>vraag</summary>
			{vragen.map((vraag) => (
				<>
				<dl>
					<dt>Vraag</dt>
					<dd>
						<InlineMarkdown tekst={vraag.kwestie} /> <span class="vraagstatus">({vraag.status})</span>
					</dd>
					<dt>Nu in de tekst</dt>
					<dd>
						<InlineMarkdown tekst={vraag.gekozen} />
					</dd>
					<dt>Andere opties</dt>
					<dd>
						<InlineMarkdown tekst={vraag.alternatief} />
					</dd>
					{vraag.besluit !== '' && (
						<>
							<dt>Besluit van de redactie</dt>
							<dd>
								<InlineMarkdown tekst={vraag.besluit} />
							</dd>
						</>
					)}
				</dl>
				<p class="vraagkoppeling-link">
					<a href={maakVraagAdres(boekId, registerVraagSleutel(vraag.kwestie))}>Beantwoorden bij Vertaalvragen</a>
				</p>
				</>
			))}
			{logVragen.map((tekst) => (
				<p>
					<InlineMarkdown tekst={tekst} />
				</p>
			))}
			{vragen.length === 0 && vraagAdres !== null && (
				<p class="vraagkoppeling-link">
					<a href={vraagAdres}>Naar de vraag bij Vertaalvragen</a>
				</p>
			)}
		</details>
	);
}
