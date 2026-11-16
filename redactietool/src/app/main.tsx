import { render } from 'preact';
import { App } from './App';
import { laadOntwerpCss } from './laadOntwerpCss';
import { leesOntwerp } from './ontwerpProef';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';
import '@fontsource-variable/atkinson-hyperlegible-next/wght-italic.css';
import '@fontsource-variable/inter/wght.css';
import './app.css';
// Na app.css en de css van de schermen (die via App al geladen is), zodat de vormgeving wint bij gelijke specificiteit.
import './vormgeving.css';

const wortel = document.getElementById('app');
if (wortel === null) {
	throw new Error('index.html mist het element #app');
}
const ontwerp = leesOntwerp(window.location.search);
if (ontwerp.variant !== null) await laadOntwerpCss(ontwerp.variant);
render(<App />, wortel);
