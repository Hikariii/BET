import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { Uitkomst } from '../../antwoorden/antwoorden';
import {
	bewaarRichtlijnReactie,
	haalRichtlijnReactieWeg,
	leesRichtlijnReacties,
	nieuweRegelId,
	type RichtlijnReactie,
} from '../../reacties/richtlijnReacties';
import { tijdVan } from '../bewaren/bewaarTekst';
import { browseropslag } from '../bewerken/useTussenstand';

const UITLEG = 'Mis je een regel, of moet een regel anders? Schrijf het hier op. Claude schrijft een voorstel voor de richtlijn; de eigenaar beslist.';
const NIETS_INGEVULD = 'Schrijf je voorstel.';
const NIETS_INGEVULD_BIJ_AANPASSEN = 'Schrijf je voorstel, of kies Weghalen.';

type FormulierProps = {
	/** De naam van het formulier voor de knoppen en schermlezers. */
	naam: string;
	veldLabel: string;
	beginTekst: string;
	opslaanKnop: string;
	nietsIngevuld: string;
	bewaar: (tekst: string) => Uitkomst;
	/** Alleen bij een bestaand voorstel. */
	haalWeg: (() => Uitkomst) | null;
	/** Alleen bij een bestaand voorstel: sluit het formulier zonder te bewaren. */
	annuleer: (() => void) | null;
	/** Na een geslaagde actie, met de melding die de lezer ziet. */
	klaar: (melding: string) => void;
};

function VoorstelFormulier({ naam, veldLabel, beginTekst, opslaanKnop, nietsIngevuld, bewaar, haalWeg, annuleer, klaar }: FormulierProps) {
	const [tekst, zetTekst] = useState(beginTekst);
	const [fout, zetFout] = useState('');
	const veld = useRef<HTMLTextAreaElement>(null);
	const id = useId();

	useEffect(() => {
		if (annuleer !== null) veld.current?.focus();
	}, []);

	function meld(melding: string) {
		zetFout(melding);
		veld.current?.focus();
	}

	function opslaan(gebeurtenis: Event) {
		gebeurtenis.preventDefault();
		if (tekst.trim() === '') return meld(nietsIngevuld);
		const uitkomst = bewaar(tekst);
		if (!uitkomst.gelukt) return meld(uitkomst.melding);
		zetFout('');
		if (annuleer === null) zetTekst('');
		klaar('Voorstel opgeslagen.');
	}

	function verwijder() {
		if (haalWeg === null) return;
		const uitkomst = haalWeg();
		if (!uitkomst.gelukt) return meld(uitkomst.melding);
		klaar('Voorstel weggehaald.');
	}

	return (
		<form
			class="antwoordformulier"
			aria-label={naam}
			noValidate
			onSubmit={opslaan}
			onKeyDown={(gebeurtenis) => {
				if (annuleer === null || gebeurtenis.key !== 'Escape') return;
				gebeurtenis.preventDefault();
				annuleer();
			}}
		>
			<div class="antwoordtoelichting">
				<label>
					{veldLabel}
					<textarea
						ref={veld}
						rows={4}
						value={tekst}
						aria-invalid={fout !== ''}
						aria-describedby={fout !== '' ? `${id}-fout` : undefined}
						onInput={(gebeurtenis) => zetTekst(gebeurtenis.currentTarget.value)}
					/>
				</label>
				<div class="knoppen">
					<button type="submit">{opslaanKnop}</button>
					{haalWeg !== null && (
						<button type="button" onClick={verwijder}>
							Weghalen
						</button>
					)}
					{annuleer !== null && (
						<button type="button" onClick={annuleer}>
							Annuleren
						</button>
					)}
				</div>
			</div>
			{fout !== '' && (
				<p class="veldfout" id={`${id}-fout`} role="alert">
					{fout}
				</p>
			)}
		</form>
	);
}

type NieuweRegelProps = {
	/** Alle bewaarde voorstellen voor een nieuwe regel (reacties zonder paragraaf), in volgorde van bewaren. */
	voorstellen: readonly RichtlijnReactie[];
};

/** Onderaan de pagina: een voorstel voor een nieuwe regel schrijven, met daaronder de eerder ingediende voorstellen. */
export function NieuweRegel({ voorstellen }: NieuweRegelProps) {
	const [melding, zetMelding] = useState('');
	const koppen = useId();

	function bewaarNieuw(tekst: string): Uitkomst {
		const opslag = browseropslag();
		const nu = new Date();
		return bewaarRichtlijnReactie(opslag, {
			id: nieuweRegelId(nu, leesRichtlijnReacties(opslag)),
			paragraaf: null,
			titel: '',
			tekst,
			voorstel: true,
			gegeven: nu.toISOString(),
		});
	}

	return (
		<section class="richtlijn-nieuwe-regel" id="richtlijn-nieuwe-regel" aria-labelledby={`${koppen}-titel`} data-help="richtlijn-nieuwe-regel">
			<h2 id={`${koppen}-titel`} tabIndex={-1}>
				Nieuwe regel voorstellen
			</h2>
			<p class="richtlijn-hulp">{UITLEG}</p>
			<div class="reactievak">
				<VoorstelFormulier
					naam="Nieuwe regel voorstellen"
					veldLabel="Je voorstel voor een nieuwe regel"
					beginTekst=""
					opslaanKnop="Voorstel opslaan"
					nietsIngevuld={NIETS_INGEVULD}
					bewaar={bewaarNieuw}
					haalWeg={null}
					annuleer={null}
					klaar={zetMelding}
				/>
			</div>
			<p class="veldhulp richtlijn-melding" role="status">
				{melding}
			</p>
			{voorstellen.length > 0 && (
				<>
					<h3>Eerder ingediende voorstellen</h3>
					<ul class="richtlijn-voorstellen">
						{voorstellen.map((voorstel) => (
							<Voorstel key={voorstel.id} voorstel={voorstel} meld={zetMelding} />
						))}
					</ul>
				</>
			)}
		</section>
	);
}

function Voorstel({ voorstel, meld }: { voorstel: RichtlijnReactie; meld: (melding: string) => void }) {
	const [aanpassen, zetAanpassen] = useState(false);
	const knop = useRef<HTMLButtonElement>(null);
	const naam = `Voorstel van ${tijdVan(voorstel.gegeven)}`;

	function sluit(melding: string) {
		zetAanpassen(false);
		meld(melding);
		// De knop bestaat pas na de volgende render.
		setTimeout(() => knop.current?.focus());
	}

	if (aanpassen) {
		return (
			<li>
				<div class="reactievak">
					<VoorstelFormulier
						naam={`${naam} aanpassen`}
						veldLabel="Je voorstel"
						beginTekst={voorstel.tekst}
						opslaanKnop="Opslaan"
						nietsIngevuld={NIETS_INGEVULD_BIJ_AANPASSEN}
						bewaar={(tekst) => bewaarRichtlijnReactie(browseropslag(), { ...voorstel, tekst, gegeven: new Date().toISOString() })}
						haalWeg={() => haalRichtlijnReactieWeg(browseropslag(), voorstel.id)}
						annuleer={() => sluit('')}
						klaar={sluit}
					/>
				</div>
			</li>
		);
	}
	return (
		<li>
			<p class="richtlijn-voorstel-tekst">{voorstel.tekst}</p>
			<p class="richtlijn-voorstel-regel">
				<span class="veldhulp">opgeslagen {tijdVan(voorstel.gegeven)}</span>
				<button
					type="button"
					ref={knop}
					aria-label={`${naam} aanpassen`}
					onClick={() => {
						meld('');
						zetAanpassen(true);
					}}
				>
					Aanpassen
				</button>
				<button
					type="button"
					aria-label={`${naam} weghalen`}
					onClick={() => {
						const uitkomst = haalRichtlijnReactieWeg(browseropslag(), voorstel.id);
						meld(uitkomst.gelukt ? 'Voorstel weggehaald.' : uitkomst.melding);
					}}
				>
					Weghalen
				</button>
			</p>
		</li>
	);
}
