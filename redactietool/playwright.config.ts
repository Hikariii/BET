import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

/** De rooktest draait op de gebouwde app: eerst `npm run build`. */
if (!existsSync(path.join(import.meta.dirname, 'dist/index.html'))) {
	throw new Error('dist/ ontbreekt: draai eerst `npm run build` (de rooktest opent de gebouwde app).');
}

const POORT = Number(process.env['E2E_POORT'] ?? 4173);
const BASISPAD = '/BET/';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '*.e2e.ts',
	reporter: 'list',
	fullyParallel: true,
	forbidOnly: process.env['CI'] !== undefined,
	use: {
		baseURL: `http://localhost:${POORT}${BASISPAD}`,
		browserName: 'chromium',
		viewport: { width: 1440, height: 900 },
		acceptDownloads: true,
	},
	webServer: {
		command: `npx vite preview --port ${POORT} --strictPort`,
		url: `http://localhost:${POORT}${BASISPAD}`,
		reuseExistingServer: false,
	},
});
