import { describe, expect, it } from 'vitest';
import { eigenAntwoordUitleg, eigenAntwoordVastgelegd } from './antwoordTeksten';

describe('teksten bij een eigen antwoord', () => {
	it('noemt Kiezen alleen bij een vraag met opties', () => {
		expect(eigenAntwoordUitleg(true)).toContain('Kiezen');
		expect(eigenAntwoordVastgelegd(true)).toContain('Kiezen');

		expect(eigenAntwoordUitleg(false)).not.toContain('Kiezen');
		expect(eigenAntwoordVastgelegd(false)).toBe('Eigen antwoord vastgelegd.');
	});
});
