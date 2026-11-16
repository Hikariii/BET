import { useEffect, useState } from 'preact/hooks';
import { ruweBrowseropslag } from '../bewerken/useTussenstand';
import { bewaarWeergave, leesWeergave, schaalVan, type Grootte, type Weergave } from './weergave';

export type Weergavebeheer = {
	weergave: Weergave;
	zetGrootte: (grootte: Grootte) => void;
	wisselZijbalk: () => void;
};

/**
 * De weergave-instellingen: zet `--schaal` op `<html>` en onthoudt de instelling in de browser.
 * Wat nog niet onthouden is, krijgt `standaard`; `variant` houdt de instellingen van een ontwerpvariant gescheiden.
 */
export function useWeergave(variant: string | null, standaard: Weergave): Weergavebeheer {
	const [weergave, zetWeergave] = useState(() => leesWeergave(ruweBrowseropslag(), variant, standaard));
	useEffect(() => {
		document.documentElement.style.setProperty('--schaal', String(schaalVan(weergave.grootte)));
		bewaarWeergave(ruweBrowseropslag(), variant, weergave);
	}, [weergave, variant]);
	return {
		weergave,
		zetGrootte: (grootte) => zetWeergave((vorige) => ({ ...vorige, grootte })),
		wisselZijbalk: () => zetWeergave((vorige) => ({ ...vorige, zijbalkIngeklapt: !vorige.zijbalkIngeklapt })),
	};
}
