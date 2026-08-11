import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBulkSelection } from '../useBulkSelection';

describe('useBulkSelection', () => {
    it('toggles individual ids in and out of the selection', () => {
        const { result } = renderHook(() => useBulkSelection('filters-a'));

        act(() => result.current.toggleSelect(1));
        expect(result.current.selectedIds.has(1)).toBe(true);

        act(() => result.current.toggleSelect(1));
        expect(result.current.selectedIds.has(1)).toBe(false);
    });

    it('toggleSelectAll selects all when not all selected, and clears when all are already selected', () => {
        const { result } = renderHook(() => useBulkSelection('filters-a'));

        act(() => result.current.toggleSelectAll([1, 2, 3]));
        expect([...result.current.selectedIds].sort()).toEqual([1, 2, 3]);

        act(() => result.current.toggleSelectAll([1, 2, 3]));
        expect(result.current.selectedIds.size).toBe(0);
    });

    it('clears the selection when resetKey changes', () => {
        // Regression test for a real, previously-shipped bug (per CLAUDE.md): the bulk-select
        // toolbar didn't clear its selection when the admin changed a filter, so a bulk action
        // could silently fire against ids that were no longer visible on screen.
        const { result, rerender } = renderHook(({ resetKey }) => useBulkSelection(resetKey), {
            initialProps: { resetKey: 'filters-a' },
        });

        act(() => result.current.toggleSelectAll([1, 2, 3]));
        expect(result.current.selectedIds.size).toBe(3);

        rerender({ resetKey: 'filters-b' });
        expect(result.current.selectedIds.size).toBe(0);
    });

    it('does not clear the selection when resetKey stays the same across a rerender', () => {
        const { result, rerender } = renderHook(({ resetKey }) => useBulkSelection(resetKey), {
            initialProps: { resetKey: 'filters-a' },
        });

        act(() => result.current.toggleSelect(5));
        rerender({ resetKey: 'filters-a' });
        expect(result.current.selectedIds.has(5)).toBe(true);
    });

    it('clear() empties the selection', () => {
        const { result } = renderHook(() => useBulkSelection('filters-a'));

        act(() => result.current.toggleSelectAll([1, 2, 3]));
        act(() => result.current.clear());
        expect(result.current.selectedIds.size).toBe(0);
    });
});
