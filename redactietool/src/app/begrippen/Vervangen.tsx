import { useState } from 'preact/hooks';
import { leesTussenstand } from '../../bewerken/tussenstand';
import { draaiKeuzeTerug, leesKeuzes, pasKeuzeToe, type StructureleKeuze } from '../../vervangen/keuzes';
import type { HoofdstukVerzen, Vondst } from '../../vervangen/types';
import { zoekVondsten } from '../../vervangen/zoekEnVervang';
import { versAdres } from '../adres';
import { browseropslag } from '../bewerken/useTussenstand';
import type { TabbladProps } from './tabbladProps';
import { bouwHoofdstukVerzen, groepeerVondsten, plekken, standaardAangevinkt, vondstSleutel } from './vervangenVoorbeeld';
import './vervangen.css';

type Zoekopdracht = { zoek: string; nieuw: string };

type VondstRegelProps = {
	boek: string;
	vondst: Vondst;
	nieuw: string;
	aangevinkt: boolean;
	bijWissel: (vondst: Vondst, aan: boolean) => void;
};

function Context({ vondst, nieuw }: { vondst: Vondst; nieuw: string | null }) {
	return (
		<>
			{vondst.ervoor}
			{nieuw === null ? (
				<mark>{vondst.gevonden}</mark>
			) : (
				<>
					<del>{vondst.gevonden}</del>
					<ins>{nieuw}</ins>
				</>
			)}
			{vondst.erna}
		</>
	);
}

function VondstRegel({ boek, vondst, nieuw, aangevinkt, bijWissel }: VondstRegelProps) {
	const sleutel = vondstSleutel(vondst);
	const adres = versAdres(boek, vondst.hoofdstuk, vondst.vers);
	const verslabel = `${vondst.hoofdstuk}:${vondst.vers}`;
	if (!vondst.vervangbaar) {
		return (
			<li class="vondst met-de-hand">
				<a href={adres}>{verslabel}</a>
				<span class="context">
					<Context vondst={vondst} nieuw={null} />
				</span>
			</li>
		);
	}
	return (
		<li class="vondst">
			<input id={`vondst-${sleutel}`} type="checkbox" checked={aangevinkt} onChange={(gebeurtenis) => bijWissel(vondst, gebeurtenis.currentTarget.checked)} />
			<label for={`vondst-${sleutel}`} class="context">
				<span class="alleen-lezers">Vers {verslabel}: </span>
				<Context vondst={vondst} nieuw={nieuw} />
			</label>
			<a href={adres}>{verslabel}</a>
		</li>
	);
}

type GroepProps = {
	boek: string;
	titel: string;
	hoofdstukken: { hoofdstuk: number; vondsten: Vondst[] }[];
	nieuw: string;
	aangevinkt: ReadonlySet<string>;
	bijWissel: (vondst: Vondst, aan: boolean) => void;
};

function HoofdstukGroepen({ boek, titel, hoofdstukken, nieuw, aangevinkt, bijWissel }: GroepProps) {
	if (hoofdstukken.length === 0) return null;
	return (
		<section class="vondstgroep">
			<h2>{titel}</h2>
			{hoofdstukken.map(({ hoofdstuk, vondsten }) => (
				<div key={hoofdstuk}>
					<h3>
						<a href={versAdres(boek, hoofdstuk)}>Hoofdstuk {hoofdstuk}</a>
					</h3>
					<ul class="vondsten">
						{vondsten.map((vondst) => (
							<VondstRegel key={vondstSleutel(vondst)} boek={boek} vondst={vondst} nieuw={nieuw} aangevinkt={aangevinkt.has(vondstSleutel(vondst))} bijWissel={bijWissel} />
						))}
					</ul>
				</div>
			))}
		</section>
	);
}

function Melding({ regels }: { regels: readonly string[] }) {
	return (
		<div role="status" class="vervangen-meldingen">
			{regels.map((regel) => (
				<p key={regel}>{regel}</p>
			))}
		</div>
	);
}

function aantalVerzen({ verzen }: StructureleKeuze): string {
	return verzen.length === 1 ? '1 vers' : `${verzen.length} verzen`;
}

function toegepastOp(keuze: StructureleKeuze): string {
	return new Date(keuze.toegepast).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' });
}

/** Tabblad Vervangen: een verwoording in het hele boek vervangen via een voorbeeldvenster. */
export function Vervangen({ boek, hoofdstukken }: TabbladProps) {
	const [zoek, zetZoek] = useState('');
	const [nieuw, zetNieuw] = useState('');
	const [opdracht, zetOpdracht] = useState<Zoekopdracht | null>(null);
	const [vondsten, zetVondsten] = useState<Vondst[]>([]);
	const [aangevinkt, zetAangevinkt] = useState<ReadonlySet<string>>(new Set());
	const [meldingen, zetMeldingen] = useState<string[]>([]);
	const [keuzes, zetKeuzes] = useState<StructureleKeuze[]>(() => leesKeuzes(browseropslag(), boek.id));

	function bouwVerzen(): HoofdstukVerzen[] {
		return bouwHoofdstukVerzen(hoofdstukken, boek, (hoofdstuk) => leesTussenstand(browseropslag(), boek.id, hoofdstuk));
	}

	function zoekOpnieuw(zoekterm: string) {
		const gevonden = zoekVondsten(bouwVerzen(), zoekterm);
		zetVondsten(gevonden);
		zetAangevinkt(standaardAangevinkt(gevonden));
		zetKeuzes(leesKeuzes(browseropslag(), boek.id));
	}

	function zoeken(gebeurtenis: Event) {
		gebeurtenis.preventDefault();
		const zoekterm = zoek.trim();
		if (zoekterm === '') return;
		zetOpdracht({ zoek: zoekterm, nieuw });
		zetMeldingen([]);
		zoekOpnieuw(zoekterm);
	}

	function wissel(vondst: Vondst, aan: boolean) {
		const sleutel = vondstSleutel(vondst);
		const volgende = new Set(aangevinkt);
		if (aan) volgende.add(sleutel);
		else volgende.delete(sleutel);
		zetAangevinkt(volgende);
	}

	const gekozen = vondsten.filter((vondst) => aangevinkt.has(vondstSleutel(vondst)));

	function toepassen() {
		if (opdracht === null) return;
		const uitkomst = pasKeuzeToe(browseropslag(), boek.id, bouwVerzen(), opdracht.zoek, opdracht.nieuw, gekozen, new Date());
		const aangepast = gekozen.filter((vondst) => uitkomst.keuze.verzen.some(({ hoofdstuk, vers }) => hoofdstuk === vondst.hoofdstuk && vers === vondst.vers)).length;
		zetMeldingen([...uitkomst.meldingen, `${plekken(aangepast)} aangepast.`]);
		zoekOpnieuw(opdracht.zoek);
	}

	function terugdraaien(keuze: StructureleKeuze) {
		const uitkomst = draaiKeuzeTerug(browseropslag(), boek.id, keuze.id);
		zetMeldingen([...uitkomst, `Keuze "${keuze.zoekterm}" door "${keuze.nieuw}" teruggedraaid.`]);
		if (opdracht === null) zetKeuzes(leesKeuzes(browseropslag(), boek.id));
		else zoekOpnieuw(opdracht.zoek);
	}

	const groepen = groepeerVondsten(vondsten);

	return (
		<div class="vervangen">
			<p class="uitleg">
				Vervang een verwoording in het hele boek. Zoek eerst, bekijk in het voorbeeld elke plek, en pas daarna de aangevinkte plekken toe. De bewerking komt in de tussenstand van de verzen; de rest van het vers blijft zoals het was.
			</p>
			<form class="vervangen-formulier" onSubmit={zoeken}>
				<label>
					Zoek
					<input type="text" value={zoek} onInput={(gebeurtenis) => zetZoek(gebeurtenis.currentTarget.value)} />
				</label>
				<label>
					Vervang door
					<input type="text" value={nieuw} onInput={(gebeurtenis) => zetNieuw(gebeurtenis.currentTarget.value)} />
				</label>
				<button type="submit">Zoeken</button>
			</form>

			<p role="status" class="vervangen-samenvatting">
				{opdracht !== null && `${plekken(vondsten.length)} gevonden voor "${opdracht.zoek}".`}
			</p>

			{opdracht !== null && vondsten.length > 0 && (
				<div class="voorbeeld">
					<HoofdstukGroepen boek={boek.id} titel="Plekken" hoofdstukken={groepen.open} nieuw={opdracht.nieuw} aangevinkt={aangevinkt} bijWissel={wissel} />
					<HoofdstukGroepen
						boek={boek.id}
						titel="Goedgekeurd (standaard uit)"
						hoofdstukken={groepen.goedgekeurd}
						nieuw={opdracht.nieuw}
						aangevinkt={aangevinkt}
						bijWissel={wissel}
					/>
					{groepen.metDeHand.length > 0 && (
						<section class="vondstgroep">
							<h2>Met de hand (opmaakgrens)</h2>
							<p class="uitleg">Deze plekken lopen over een opmaakgrens en worden niet vervangen. Pas ze zelf aan in het vers.</p>
							<ul class="vondsten">
								{groepen.metDeHand.map((vondst) => (
									<VondstRegel key={vondstSleutel(vondst)} boek={boek.id} vondst={vondst} nieuw={opdracht.nieuw} aangevinkt={false} bijWissel={wissel} />
								))}
							</ul>
						</section>
					)}
					<button type="button" class="toepassen" disabled={gekozen.length === 0} onClick={toepassen}>
						{plekken(gekozen.length)} toepassen
					</button>
				</div>
			)}

			<Melding regels={meldingen} />

			<section class="toegepaste-keuzes">
				<h2>Toegepaste keuzes</h2>
				{keuzes.length === 0 && <p class="melding">Nog geen keuzes toegepast.</p>}
				<ul>
					{keuzes.map((keuze) => (
						<li key={keuze.id}>
							<span>
								"{keuze.zoekterm}" door "{keuze.nieuw}", {aantalVerzen(keuze)} aangepast op {toegepastOp(keuze)}
							</span>
							<button type="button" onClick={() => terugdraaien(keuze)}>
								Terugdraaien
							</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
