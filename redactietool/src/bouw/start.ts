// Draait met Node zelf (`node src/bouw/start.ts`). De bestanden in src/ importeren elkaar zonder
// extensie en gebruiken syntax die Node niet kan strippen (parameter properties in formaat/types.ts),
// daarom laadt Vite ze; Vite is er toch al voor de app.
import path from 'node:path';
import { createServer } from 'vite';

const docsmap = path.resolve(import.meta.dirname, '../..');
const hoofdmap = path.resolve(docsmap, '..');

const server = await createServer({
	root: docsmap,
	configFile: false,
	appType: 'custom',
	logLevel: 'warn',
	server: { middlewareMode: true, hmr: false, watch: null },
	optimizeDeps: { noDiscovery: true },
});
try {
	const { bouwData } = (await server.ssrLoadModule('/src/bouw/bouw.ts')) as typeof import('./bouw');
	bouwData({ hoofdmap, uitvoermap: path.join(docsmap, 'public', 'data') });
} finally {
	await server.close();
}
