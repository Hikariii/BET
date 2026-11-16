import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { Uitkomst } from '../../antwoorden/antwoorden';
import './reageren.css';

/** De teksten van het vak: wat het veld en het vinkje heten en wat het vinkje betekent. */
export type ReactieTeksten = {
	veld: string;
	vinkje: string;
	uitleg: string;
};

/** Wat de vertaler bewaard heeft: de tekst en of het vinkje aanstaat. */
export type GegevenReactie = {
	tekst: string;
	vinkje: boolean;
};

type Props = {
	/** Waar de reactie over gaat, bv. "Reageren op O4.1: kwestie"; de knop en het formulier dragen deze naam. */
	naam: string;
	teksten: ReactieTeksten;
	/** De bewaarde reactie, of `null`. */
	reactie: GegevenReactie | null;
	/** Bewaart tekst en vinkje; een lege tekst zonder vinkje haalt de reactie weg. */
	bewaar: (tekst: string, vinkje: boolean) => Uitkomst;
	haalWeg: () => Uitkomst;
};

const NIETS_INGEVULD = 'Schrijf een reactie of zet het vinkje aan.';

/** Het vak Reageren: ingeklapt alleen de knop Reageren, daarna het formulier. Escape en Annuleren klappen het weer in. */
export function ReactieVak({ naam, teksten, reactie, bewaar, haalWeg }: Props) {
	const [open, zetOpen] = useState(false);
	const [melding, zetMelding] = useState('');
	const knop = useRef<HTMLButtonElement>(null);

	function sluit(nieuweMelding: string) {
		zetOpen(false);
		zetMelding(nieuweMelding);
		// De knop bestaat pas na de volgende render.
		setTimeout(() => knop.current?.focus());
	}

	return (
		<div class="antwoordvak reactievak">
			{open ? (
				<ReactieFormulier naam={naam} teksten={teksten} reactie={reactie} bewaar={bewaar} haalWeg={haalWeg} sluit={sluit} />
			) : (
				<>
					{reactie !== null && reactie.tekst !== '' && (
						<p class="toelichting">
							<span class="veldhulp">Jouw reactie voor Claude</span>
							<br />
							{reactie.tekst}
						</p>
					)}
					<button
						type="button"
						ref={knop}
						aria-label={naam}
						onClick={() => {
							zetMelding('');
							zetOpen(true);
						}}
					>
						Reageren
					</button>
					<p class="veldhulp reactiemelding" role="status">
						{melding}
					</p>
				</>
			)}
		</div>
	);
}

type FormulierProps = Pick<Props, 'naam' | 'teksten' | 'reactie' | 'bewaar' | 'haalWeg'> & { sluit: (melding: string) => void };

function ReactieFormulier({ naam, teksten, reactie, bewaar, haalWeg, sluit }: FormulierProps) {
	const [tekst, zetTekst] = useState(reactie?.tekst ?? '');
	const [vinkje, zetVinkje] = useState(reactie?.vinkje ?? false);
	const [fout, zetFout] = useState('');
	const veld = useRef<HTMLTextAreaElement>(null);
	const id = useId();

	useEffect(() => {
		veld.current?.focus();
	}, []);

	function opslaan(gebeurtenis: Event) {
		gebeurtenis.preventDefault();
		if (tekst.trim() === '' && !vinkje && reactie === null) {
			zetFout(NIETS_INGEVULD);
			veld.current?.focus();
			return;
		}
		const uitkomst = bewaar(tekst, vinkje);
		if (!uitkomst.gelukt) {
			zetFout(uitkomst.melding);
			veld.current?.focus();
			return;
		}
		sluit(tekst.trim() === '' && !vinkje ? 'Reactie weggehaald.' : 'Reactie opgeslagen.');
	}

	function verwijder() {
		const uitkomst = haalWeg();
		if (!uitkomst.gelukt) {
			zetFout(uitkomst.melding);
			return;
		}
		sluit('Reactie weggehaald.');
	}

	return (
		<form
			class="antwoordformulier"
			aria-label={naam}
			noValidate
			onSubmit={opslaan}
			onKeyDown={(gebeurtenis) => {
				if (gebeurtenis.key !== 'Escape') return;
				gebeurtenis.preventDefault();
				sluit('');
			}}
		>
			<div class="antwoordtoelichting">
				<label>
					{teksten.veld}
					<textarea
						ref={veld}
						rows={3}
						value={tekst}
						aria-invalid={fout !== ''}
						aria-describedby={fout !== '' ? `${id}-fout` : undefined}
						onInput={(gebeurtenis) => zetTekst(gebeurtenis.currentTarget.value)}
					/>
				</label>
				<label class="reactievinkje">
					<input type="checkbox" checked={vinkje} aria-describedby={`${id}-uitleg`} onChange={(gebeurtenis) => zetVinkje(gebeurtenis.currentTarget.checked)} /> {teksten.vinkje}
				</label>
				<p class="veldhulp" id={`${id}-uitleg`}>
					{teksten.uitleg}
				</p>
				<div class="knoppen">
					<button type="submit">Opslaan</button>
					{reactie !== null && (
						<button type="button" onClick={verwijder}>
							Weghalen
						</button>
					)}
					<button type="button" onClick={() => sluit('')}>
						Annuleren
					</button>
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
