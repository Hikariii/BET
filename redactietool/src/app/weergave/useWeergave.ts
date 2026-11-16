import { useEffect, useState } from 'preact/hooks';
import { ruweBrowseropslag } from '../bewerken/useTussenstand';
import { bewaarWeergave, leesWeergave, schaalVan, type Grootte, type Weergave } from './weergave';

export type Weergavebeheer = {
	weergave: Weergave;
	zetGrootte: (grootte: Grootte) => void;
};

/** De weergave-instellingen: zet `--schaal` op `<html>` en onthoudt de instelling in de browser. */
export function useWeergave(): Weergavebeheer {
	const [weergave, zetWeergave] = useState(() => leesWeergave(ruweBrowseropslag()));
	useEffect(() => {
		document.documentElement.style.setProperty('--schaal', String(schaalVan(weergave.grootte)));
		bewaarWeergave(ruweBrowseropslag(), weergave);
	}, [weergave]);
	return {
		weergave,
		zetGrootte: (grootte) => zetWeergave({ grootte }),
	};
}
