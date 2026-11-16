const EIGEN_ANTWOORD_ZIN = 'Geef per context aan wat je kiest, bijvoorbeeld per vers of per soort zin.';
const KIEZEN_ZIN = 'Daarna pas je bij een optie, met Kiezen of Zoek de plekken, een vervanging toe voor een groep verzen; die komt onder dit antwoord.';

/** De hulptekst bij Eigen antwoord; Kiezen komt alleen ter sprake als de vraag opties heeft. */
export function eigenAntwoordUitleg(kanKiezen: boolean): string {
	return kanKiezen ? `${EIGEN_ANTWOORD_ZIN} ${KIEZEN_ZIN}` : EIGEN_ANTWOORD_ZIN;
}

/** De melding na het vastleggen van een eigen antwoord. */
export function eigenAntwoordVastgelegd(kanKiezen: boolean): string {
	return kanKiezen ? 'Eigen antwoord vastgelegd. Met Kiezen of Zoek de plekken bij een optie kun je er vervangingen onder toepassen.' : 'Eigen antwoord vastgelegd.';
}
