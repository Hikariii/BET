import { useEffect, useState } from 'preact/hooks';
import { luisterNaOpslagwijziging, opslagTeller } from '../../bewaren/wijziging';

/**
 * Een getal dat oploopt zodra de bewaarde stand verandert: in deze tab (via `browseropslag`) of in een andere tab van dezelfde browser.
 * Neem het op in de afhankelijkheden van alles wat uit de opslag leest.
 */
export function useOpslagTeller(): number {
	const [teller, zetTeller] = useState(opslagTeller);
	useEffect(() => {
		const bijmelden = () => zetTeller(opslagTeller());
		const afmelden = luisterNaOpslagwijziging(bijmelden);
		const bijAndereTab = () => bijmelden();
		window.addEventListener('storage', bijAndereTab);
		// De opslag kan veranderd zijn tussen de eerste render en het aanmelden.
		bijmelden();
		return () => {
			afmelden();
			window.removeEventListener('storage', bijAndereTab);
		};
	}, []);
	return teller;
}
