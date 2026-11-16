// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAanwijzen } from './useAanwijzen';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function wacht(ms: number): void {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

function vak(kanUitklappen = true) {
	return renderHook(() => useAanwijzen(kanUitklappen));
}

function wijsAan(cel: ReturnType<typeof vak>): void {
	act(() => cel.result.current.handelers.onPointerEnter());
}

function verlaat(cel: ReturnType<typeof vak>): void {
	act(() => cel.result.current.handelers.onPointerLeave());
}

function aangewezenVak() {
	const vak = renderHook(() => useAanwijzen(true));
	wijsAan(vak);
	wacht(200);
	expect(vak.result.current).toMatchObject({ open: true, sluitend: false });
	return vak;
}

describe('useAanwijzen', () => {
	it('is meteen sluitend als de aanwijzer weggaat, en sluit pas na de vertraging', () => {
		const vak = aangewezenVak();

		act(() => vak.result.current.handelers.onPointerLeave());
		expect(vak.result.current).toMatchObject({ open: true, sluitend: true });

		wacht(399);
		expect(vak.result.current).toMatchObject({ open: true, sluitend: true });

		wacht(1);
		expect(vak.result.current).toMatchObject({ open: false, sluitend: false });
	});

	it('is niet meer sluitend en blijft open als de aanwijzer binnen de vertraging terugkomt', () => {
		const vak = aangewezenVak();
		act(() => vak.result.current.handelers.onPointerLeave());
		wacht(100);
		expect(vak.result.current.sluitend).toBe(true);

		act(() => vak.result.current.handelers.onPointerEnter());
		expect(vak.result.current).toMatchObject({ open: true, sluitend: false });

		wacht(1000);
		expect(vak.result.current).toMatchObject({ open: true, sluitend: false });
	});

	it('houdt een ander vak dicht zolang er een uitgeklapt is, ook tijdens de vertraging, en opent het daarna als de aanwijzer er nog is', () => {
		const eerste = aangewezenVak();
		const tweede = vak();

		verlaat(eerste);
		wijsAan(tweede);
		wacht(200);
		expect(eerste.result.current.open).toBe(true);
		expect(tweede.result.current.open).toBe(false);

		wacht(200);
		expect(eerste.result.current.open).toBe(false);
		expect(tweede.result.current).toMatchObject({ open: true, sluitend: false });
	});

	it('laat een vak dat niet uitklapt (vast of zonder overloop) andere vakken niet dichthouden', () => {
		const vastVak = vak(false);
		wijsAan(vastVak);
		wacht(200);
		expect(vastVak.result.current.open).toBe(true);

		const zwevend = vak();
		wijsAan(zwevend);
		wacht(200);

		expect(zwevend.result.current.open).toBe(true);
	});
});
