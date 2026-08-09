'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Closes a dropdown/panel when the user clicks outside `ref`'s element (and, by default, on
 * Escape). Extracted from three independent hand-rolled copies of this exact listener/cleanup
 * shape (RootHeader, NotificationBell, ProfileClient's CityInput) that had already started to
 * drift — e.g. only one of the three handled Escape before this was factored out.
 *
 * `onOutside`/`onEscape` are read via a ref updated on every render rather than being effect
 * dependencies — callers pass inline arrow functions, so depending on them directly would
 * tear down and re-add the document listeners on every render (a real regression a first pass
 * at this hook had, caught by review since e.g. NotificationBell's 60s poll re-renders it
 * whether or not its dropdown is even open). `ref`/`escape` are stable across a component's
 * lifetime in every current call site, so only those drive resubscription.
 *
 * `enabled` gates the outside-click check only, not Escape — RootHeader relies on this: it
 * disables the header-menu's outside-click check while search is active (GlobalSearch's results
 * render via a portal, so they're never "inside" the ref), but Escape should still dismiss
 * everything even mid-search.
 */
export function useOutsideClick(
    ref: RefObject<HTMLElement | null>,
    onOutside: () => void,
    opts: { escape?: boolean; enabled?: boolean; onEscape?: () => void } = {},
) {
    const { escape = true, enabled = true } = opts;

    const onOutsideRef = useRef(onOutside);
    const onEscapeRef = useRef(opts.onEscape);
    const enabledRef = useRef(enabled);
    useEffect(() => {
        onOutsideRef.current = onOutside;
        onEscapeRef.current = opts.onEscape;
        enabledRef.current = enabled;
    });

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (!enabledRef.current) return;
            if (ref.current && !ref.current.contains(e.target as Node)) onOutsideRef.current();
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') (onEscapeRef.current ?? onOutsideRef.current)();
        }
        document.addEventListener('mousedown', handleClickOutside);
        if (escape) document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (escape) document.removeEventListener('keydown', handleEscape);
        };
    }, [ref, escape]);
}
