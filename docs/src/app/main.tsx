import { render } from 'preact';
import { App } from './App';
import './app.css';

const wortel = document.getElementById('app');
if (wortel === null) {
	throw new Error('index.html mist het element #app');
}
render(<App />, wortel);
