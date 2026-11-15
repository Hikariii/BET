import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// Pages serveert de repo Hikariii/BET onder /BET/; lokaal staat de tool op de wortel.
const PAGES_BASISPAD = '/BET/';

export default defineConfig(({ command, isPreview }) => ({
	base: command === 'build' || isPreview === true ? PAGES_BASISPAD : '/',
	plugins: [preact()],
	// De commit van de repo waaruit de build komt; GitHub Actions zet GITHUB_SHA, lokaal is er geen en wordt het null.
	define: { __REPO_COMMIT__: JSON.stringify(process.env['GITHUB_SHA'] ?? null) },
}));
