// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAanwijzen } from './useAanwijzen';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function wacht(ms: number): void {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

function aangewezenVak() {
	const vak = renderHook(() => useAanwijzen());
	act(() => vak.result.current.handelers.onPointerEnter());
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
});
