import { describe, expect, it } from 'vitest';
import { GeheugenOpslag, OpslagMetVolleSleutel } from '../../bewaren/testhulp';
import { bewaarLaatsteBackup, laatsteBackupSleutel, leesLaatsteBackup } from './laatsteBackup';

const MOMENT = new Date('2026-11-16T09:30:00.000Z');

describe('laatste back-up in de opslag', () => {
	it('geeft null zolang er geen back-up gedownload is', () => {
		expect(leesLaatsteBackup(new GeheugenOpslag(), 'lukas')).toBeNull();
	});

	it('onthoudt het moment per boek', () => {
		const opslag = new GeheugenOpslag();

		bewaarLaatsteBackup(opslag, 'lukas', MOMENT);

		expect(leesLaatsteBackup(opslag, 'lukas')).toBe(MOMENT.toISOString());
		expect(leesLaatsteBackup(opslag, 'markus')).toBeNull();
	});

	it('negeert een bewaarde waarde die geen tijd is', () => {
		const opslag = new GeheugenOpslag();
		opslag.setItem(laatsteBackupSleutel('lukas'), 'gisteren');

		expect(leesLaatsteBackup(opslag, 'lukas')).toBeNull();
	});

	it('gaat door als de opslag het bewaren weigert', () => {
		const opslag = new OpslagMetVolleSleutel(laatsteBackupSleutel('lukas'));

		expect(() => bewaarLaatsteBackup(opslag, 'lukas', MOMENT)).not.toThrow();
		expect(leesLaatsteBackup(opslag, 'lukas')).toBeNull();
	});
});
