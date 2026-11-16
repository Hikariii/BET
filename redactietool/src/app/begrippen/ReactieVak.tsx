import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { bewaarReactie, haalReactieWeg, type Reactie } from '../../reacties/reacties';
import { browseropslag } from '../bewerken/useTussenstand';

type Props = {
	boek: string;
	/** Het O-nummer, het hoofdstuk van het log en de kwestie van de opmerking waarop gereageerd wordt. */
	opmerking: Pick<Reactie, 'nr' | 'hoofdstuk' | 'kwestie'>;
	/** De bewaarde reactie op deze opmerking, of `null`. */
	reactie: Reactie | null;
};

const UITLEG_VINKJE = 'Claude zet de vraag in de lijst met open vragen als je de export teruggeeft.';
const NIETS_INGEVULD = 'Schrijf een reactie of zet het vinkje aan.';

/** Het vak Reageren bij een opmerking van Claude: ingeklapt alleen de knop Reageren, daarna het formulier. Escape en Annuleren klappen het weer in. */
export function ReactieVak({ boek, opmerking, reactie }: Props) {
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
		<div class="antwoordvak reactievak" data-help="reactie-vak">
			{open ? (
				<ReactieFormulier boek={boek} opmerking={opmerking} reactie={reactie} sluit={sluit} />
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
						aria-label={`Reageren op ${opmerking.nr}: ${opmerking.kwestie}`}
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

type FormulierProps = Pick<Props, 'boek' | 'opmerking' | 'reactie'> & { sluit: (melding: string) => void };

function ReactieFormulier({ boek, opmerking, reactie, sluit }: FormulierProps) {
	const [tekst, zetTekst] = useState(reactie?.tekst ?? '');
	const [wordtVraag, zetWordtVraag] = useState(reactie?.wordtVraag ?? false);
	const [fout, zetFout] = useState('');
	const veld = useRef<HTMLTextAreaElement>(null);
	const id = useId();

	useEffect(() => {
		veld.current?.focus();
	}, []);

	function opslaan(gebeurtenis: Event) {
		gebeurtenis.preventDefault();
		if (tekst.trim() === '' && !wordtVraag && reactie === null) {
			zetFout(NIETS_INGEVULD);
			veld.current?.focus();
			return;
		}
		const uitkomst = bewaarReactie(browseropslag(), boek, { ...opmerking, tekst, wordtVraag, gegeven: new Date().toISOString() });
		if (!uitkomst.gelukt) {
			zetFout(uitkomst.melding);
			veld.current?.focus();
			return;
		}
		sluit(tekst.trim() === '' && !wordtVraag ? 'Reactie weggehaald.' : 'Reactie opgeslagen.');
	}

	function haalWeg() {
		const uitkomst = haalReactieWeg(browseropslag(), boek, opmerking.nr);
		if (!uitkomst.gelukt) {
			zetFout(uitkomst.melding);
			return;
		}
		sluit('Reactie weggehaald.');
	}

	return (
		<form
			class="antwoordformulier"
			aria-label={`Reageren op ${opmerking.nr}: ${opmerking.kwestie}`}
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
					Je reactie voor Claude
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
					<input type="checkbox" checked={wordtVraag} aria-describedby={`${id}-uitleg`} onChange={(gebeurtenis) => zetWordtVraag(gebeurtenis.currentTarget.checked)} /> Maak hier een vertaalvraag van
				</label>
				<p class="veldhulp" id={`${id}-uitleg`}>
					{UITLEG_VINKJE}
				</p>
				<div class="knoppen">
					<button type="submit">Opslaan</button>
					{reactie !== null && (
						<button type="button" onClick={haalWeg}>
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
