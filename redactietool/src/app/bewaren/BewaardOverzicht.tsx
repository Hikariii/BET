import { useRef, useState } from 'preact/hooks';
import type { BoekData } from '../../data/types';
import { versAdres } from '../adres';
import { BackupInladen } from './BackupInladen';
import { bewaarRegel, meervoud, tijdVan } from './bewaarTekst';
import { downloadBackup } from './downloadBackup';
import { useBewaardOverzicht } from './useBewaardOverzicht';
import './bewaren.css';

/** De pagina `#/<boek>/bewaard`: wat de browser bewaart per hoofdstuk, de toegepaste keuzes en de back-upknoppen. */
export function BewaardOverzicht({ boek }: { boek: BoekData }) {
	const overzicht = useBewaardOverzicht(boek);
	const [melding, zetMelding] = useState('');
	const invoer = useRef<HTMLInputElement>(null);
	const inladenKnop = useRef<HTMLButtonElement>(null);

	return (
		<section class="bewaard-overzicht" aria-labelledby="bewaard-titel">
			<h1 id="bewaard-titel">Bewaard in deze browser</h1>
			<p class="bewaard-regel">{bewaarRegel(overzicht)}</p>
			<p class="bewaard-acties">
				<button type="button" onClick={() => zetMelding(`Back-up gedownload als ${downloadBackup(boek)}.`)}>
					Back-up downloaden
				</button>
				<button type="button" ref={inladenKnop} onClick={() => invoer.current?.click()}>
					Back-up inladen
				</button>
			</p>
			<p class="bewaarstatus-melding" role="status">
				{melding}
			</p>
			<BackupInladen boek={boek} focusNaSluiten={inladenKnop} invoer={invoer} />
			{overzicht.totaal.verzen === 0 && overzicht.totaal.keuzes === 0 && (
				<p class="melding">Er is niets bewaard. Bewerk een vers of pas een keuze toe en het staat hier.</p>
			)}
			{overzicht.totaal.verouderd > 0 && (
				<p class="bewaard-verouderd">
					{meervoud(overzicht.totaal.verouderd, 'bewerking is', 'bewerkingen zijn')} verouderd: de repo is sinds de bewerking veranderd. Kijk die
					verzen na voordat je ze naar Word brengt.
				</p>
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
								<span class="bewaard-tijd">bewaard {tijdVan(vers.bewaard)}</span>
								{vers.herkomst === 'structurele keuze' && <span class="bewaard-label">via keuze</span>}
								{vers.verouderd && <span class="bewaard-label bewaard-label-verouderd">verouderd</span>}
							</li>
						))}
					</ul>
				</section>
			))}
			{overzicht.keuzes.length > 0 && (
				<section class="bewaard-keuzes" aria-labelledby="bewaard-keuzes-titel">
					<h2 id="bewaard-keuzes-titel">Toegepaste keuzes</h2>
					<ul>
						{overzicht.keuzes.map((keuze) => (
							<li>
								<strong>{keuze.zoekterm}</strong> werd <strong>{keuze.nieuw}</strong>, in {meervoud(keuze.aantalVerzen, 'vers', 'verzen')},
								toegepast {tijdVan(keuze.toegepast)}.
							</li>
						))}
					</ul>
					<p>
						Terugdraaien kan bij <a href={`#/${encodeURIComponent(boek.id)}/begrippen/vervangen`}>Zoeken en vervangen</a>.
					</p>
				</section>
			)}
		</section>
	);
}
