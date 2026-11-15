import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// Pages serveert de repo Hikariii/BET onder /BET/; lokaal staat de tool op de wortel.
const PAGES_BASISPAD = '/BET/';

export default defineConfig(({ command, isPreview }) => ({
	base: command === 'build' || isPreview === true ? PAGES_BASISPAD : '/',
	plugins: [preact()],
}));
