import { render } from 'preact';
import { App } from './App';
import './app.css';
import { laadOntwerpVariant } from '../ontwerp/kiesVariant';

const wortel = document.getElementById('app');
if (wortel === null) {
	throw new Error('index.html mist het element #app');
}
void laadOntwerpVariant().then(() => render(<App />, wortel));
