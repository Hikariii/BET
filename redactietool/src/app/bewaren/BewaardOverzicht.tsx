import { useRef, useState } from 'preact/hooks';
import type { BewaardOverzicht } from '../../bewaren/overzicht';
import type { BoekData, OpenVraag } from '../../data/types';
import { versAdres } from '../adres';
import { vraagAdres } from '../begrippen/vraagAdres';
import { BackupInladen } from './BackupInladen';
import { kortUit, optieOmschrijving } from '../begrippen/vervangenVoorbeeld';
import { bewaarRegel, tijdVan, verouderdMelding, vervangingRegel } from './bewaarTekst';
import { downloadBackup } from './downloadBackup';
import { useBackupStand } from './useBackupStand';
import { useBewaardOverzicht } from './useBewaardOverzicht';
import './bewaren.css';

/** De verzen met een bewerking die Claude sinds de bewerking heeft veranderd, als "Lukas 4:2". */
function verouderdeVerzen(overzicht: BewaardOverzicht, boekNaam: string): string[] {
	return overzicht.hoofdstukken.flatMap(({ hoofdstuk, verzen }) => verzen.filter((vers) => vers.verouderd).map((vers) => `${boekNaam} ${hoofdstuk}:${vers.vers}`));
}

/** De pagina `#/<boek>/opgeslagen`: wat de browser bewaart per hoofdstuk, de toegepaste vervangingen, de antwoorden en de back-upknoppen. */
export function BewaardOverzicht({ boek, openVragen }: { boek: BoekData; openVragen: readonly OpenVraag[] }) {
	const overzicht = useBewaardOverzicht(boek);
	const backup = useBackupStand(boek.id, overzicht);
	const [melding, zetMelding] = useState('');
	const nummers = new Map(openVragen.map((vraag) => [vraag.kwestie, vraag.nr]));
	const invoer = useRef<HTMLInputElement>(null);
	const inladenKnop = useRef<HTMLButtonElement>(null);

	return (
		<section class="bewaard-overzicht" aria-labelledby="bewaard-titel">
			<h1 id="bewaard-titel">Opgeslagen in deze browser</h1>
			<p class="bewaard-regel">{bewaarRegel(overzicht)}</p>
			<p class="bewaard-backupregel">{backup.regel}</p>
			{backup.herinnering !== null && <p class="bewaard-herinnering">{backup.herinnering}</p>}
			<p class="bewaard-acties">
				<button type="button" data-help="back-up-downloaden" onClick={() => zetMelding(`Back-up gedownload als ${downloadBackup(boek)}.`)}>
					Back-up downloaden
				</button>
				<button type="button" data-help="back-up-inladen" ref={inladenKnop} onClick={() => invoer.current?.click()}>
					Back-up inladen
				</button>
			</p>
			<p class="bewaarstatus-melding" role="status">
				{melding}
			</p>
			<BackupInladen boek={boek} focusNaSluiten={inladenKnop} invoer={invoer} />
			{overzicht.totaal.verzen === 0 && overzicht.totaal.keuzes === 0 && overzicht.totaal.antwoorden === 0 && (
				<div class="bewaard-leeg">
					<p class="melding">Er is niets opgeslagen. Bewerk een vers, pas een vervanging toe of beantwoord een vertaalvraag en het staat hier.</p>
					<p class="bewaard-leeg-tip">Werkte je eerder in een andere browser of op een andere computer? Laad dan je back-up in.</p>
					<p>
						<button type="button" onClick={() => invoer.current?.click()}>
							Back-up inladen
						</button>
					</p>
				</div>
			)}
			{overzicht.totaal.verouderd > 0 && (
				<p class="bewaard-verouderd">{verouderdMelding(verouderdeVerzen(overzicht, boek.naam), 'voordat je het naar Word brengt')}</p>
			)}
			{overzicht.hoofdstukken.map(({ hoofdstuk, verzen }) => (
				<section class="bewaard-hoofdstuk" aria-labelledby={`bewaard-hoofdstuk-${hoofdstuk}`}>
					<h2 id={`bewaard-hoofdstuk-${hoofdstuk}`}>
						<a href={versAdres(boek.id, hoofdstuk)}>
							{boek.naam} {hoofdstuk}
						</a>
					</h2>
					<ul class="bewaard-verzen">
						{verzen.map((vers) => (
							<li>
								<a href={versAdres(boek.id, hoofdstuk, vers.vers)}>vers {vers.vers}</a>
								<span class="bewaard-tijd">opgeslagen {tijdVan(vers.bewaard)}</span>
								{vers.herkomst === 'structurele keuze' && <span class="bewaard-label">via vervanging</span>}
								{vers.verouderd && <span class="bewaard-label bewaard-label-verouderd">door Claude veranderd</span>}
							</li>
						))}
					</ul>
				</section>
			))}
			{overzicht.keuzes.length > 0 && (
				<section class="bewaard-keuzes" aria-labelledby="bewaard-keuzes-titel">
					<h2 id="bewaard-keuzes-titel">Toegepaste vervangingen</h2>
					<ul>
						{overzicht.keuzes.map((keuze) => (
							<li>{vervangingRegel(keuze)}</li>
						))}
					</ul>
					<p>
						Terugdraaien kan bij <a href={`#/${encodeURIComponent(boek.id)}/begrippen/vervangen`}>Zoeken en vervangen</a>.
					</p>
				</section>
			)}
			{overzicht.antwoorden.length > 0 && (
				<section class="bewaard-antwoorden" aria-labelledby="bewaard-antwoorden-titel">
					<h2 id="bewaard-antwoorden-titel">Antwoorden op vertaalvragen</h2>
					<ul>
						{overzicht.antwoorden.map((antwoord) => (
							<li>
								<AntwoordKop boekId={boek.id} kwestie={antwoord.kwestie} nummers={nummers} />: <strong>{kortUit(optieOmschrijving(antwoord.optie), 80)}</strong>, gegeven{' '}
								{tijdVan(antwoord.gegeven)}.
							</li>
						))}
					</ul>
				</section>
			)}
		</section>
	);
}

/** De kwestie van een beantwoorde vraag, als link naar de vraag; een kwestie die niet meer in het register staat is gewone tekst. */
function AntwoordKop({ boekId, kwestie, nummers }: { boekId: string; kwestie: string; nummers: ReadonlyMap<string, string> }) {
	const nr = nummers.get(kwestie);
	if (nr === undefined) return <>{kortUit(kwestie, 80)}</>;
	return (
		<>
			<span class="vraagnr">{nr}</span> <a href={vraagAdres(boekId, nr)}>{kortUit(kwestie, 80)}</a>
		</>
	);
}
