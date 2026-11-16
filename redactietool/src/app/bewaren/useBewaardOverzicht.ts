import { useMemo } from 'preact/hooks';
import { bewaardOverzicht, type BewaardOverzicht } from '../../bewaren/overzicht';
import type { BoekData, HoofdstukData } from '../../data/types';
import { ruweBrowseropslag } from '../bewerken/useTussenstand';
import { laadAlleHoofdstukken } from '../gegevens';
import { useLaden } from '../hooks';
import { useOpslagTeller } from './useOpslagTeller';

const hoofdstukkenPerBoek = new Map<string, Promise<HoofdstukData[]>>();

/** Laadt de hoofdstukken van het boek één keer voor de hele sessie; een mislukte poging wordt de volgende keer opnieuw gedaan. */
function laadHoofdstukkenEenmalig(boek: BoekData): Promise<HoofdstukData[]> {
	const eerder = hoofdstukkenPerBoek.get(boek.id);
	if (eerder !== undefined) return eerder;
	const belofte = laadAlleHoofdstukken(boek);
	hoofdstukkenPerBoek.set(boek.id, belofte);
	belofte.catch(() => hoofdstukkenPerBoek.delete(boek.id));
	return belofte;
}

/**
 * Wat de browser van dit boek bewaart, bijgewerkt na elke wijziging in de opslag.
 * Zolang de hoofdstukken uit de repo laden staat `verouderdBekend` op onwaar.
 */
export function useBewaardOverzicht(boek: BoekData): BewaardOverzicht {
	const opslagTeller = useOpslagTeller();
	const hoofdstukken = useLaden(() => laadHoofdstukkenEenmalig(boek), [boek.id]);
	const repo = hoofdstukken.soort === 'klaar' ? hoofdstukken.waarde : [];
	return useMemo(() => bewaardOverzicht(ruweBrowseropslag(), boek, repo), [boek, repo, opslagTeller]);
}
