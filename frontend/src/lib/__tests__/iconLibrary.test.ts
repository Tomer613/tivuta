import { describe, expect, it } from 'vitest';
import { ICON_OPTIONS, getCategoryIcon, getVerticalIcon, searchIcons, suggestIconsFor } from '../iconLibrary';

const OLD_VERTICAL_ICONS = ['Gem', 'Car', 'ShieldCheck', 'Home', 'Watch', 'Briefcase', 'Store', 'Sparkles', 'Heart', 'Building2', 'UtensilsCrossed'];
const OLD_CATEGORY_ICONS = [
    'Gem', 'Sparkles', 'Crown', 'Diamond', 'Watch', 'Heart',
    'Car', 'Truck', 'Bike', 'Fuel', 'Wrench',
    'Home', 'Sofa', 'Lamp', 'Bed',
    'UtensilsCrossed', 'Utensils', 'Cake', 'Wine', 'Coffee', 'ChefHat', 'Soup',
    'Shield', 'FileText', 'Umbrella', 'Landmark',
    'Tag', 'Star', 'Package', 'ShoppingBag', 'Shirt', 'Gift',
    'Baby', 'SprayCan', 'Bath', 'PartyPopper',
];

describe('iconLibrary', () => {
    it('is a strict superset of every icon name ever assigned to a real category/vertical row', () => {
        const missing = [...new Set([...OLD_VERTICAL_ICONS, ...OLD_CATEGORY_ICONS])].filter((k) => !ICON_OPTIONS.includes(k));
        expect(missing).toEqual([]);
    });

    it('has no duplicate keys', () => {
        expect(new Set(ICON_OPTIONS).size).toBe(ICON_OPTIONS.length);
    });

    it('searchIcons matches a known icon by Hebrew tag', () => {
        expect(searchIcons('שעון')).toContain('Watch');
    });

    it('searchIcons matches a known icon by English tag', () => {
        expect(searchIcons('watch')).toContain('Watch');
    });

    it('searchIcons matches by the icon key itself', () => {
        expect(searchIcons('spraycan')).toContain('SprayCan');
    });

    it('searchIcons is case-insensitive', () => {
        expect(searchIcons('WINE')).toContain('Wine');
    });

    it('searchIcons returns everything for an empty query', () => {
        expect(searchIcons('')).toEqual(ICON_OPTIONS);
    });

    it('searchIcons returns nothing for a query matching no icon', () => {
        expect(searchIcons('zzz-no-such-keyword-zzz')).toEqual([]);
    });

    it('suggestIconsFor ranks a clearly-relevant icon above unrelated ones', () => {
        const suggestions = suggestIconsFor('שעון יד לגברים');
        expect(suggestions[0]).toBe('Watch');
    });

    it('suggestIconsFor matches a real production category name via its Hebrew tag', () => {
        expect(suggestIconsFor('לקידוש')).toContain('Wine');
    });

    it('suggestIconsFor returns an empty array for empty input', () => {
        expect(suggestIconsFor('')).toEqual([]);
    });

    it('suggestIconsFor returns an empty array for gibberish with no real substring overlap with any tag', () => {
        // Deliberately consonant-cluster gibberish, not just "an unrelated real word" — a real
        // word (even one chosen to feel unrelated) can still accidentally contain a short real
        // tag as a substring (e.g. "keyword" genuinely contains "key"), which is correct
        // matching behavior, not a bug — this test isolates the true "no overlap at all" case.
        expect(suggestIconsFor('xqzjkl vbnmpq')).toEqual([]);
    });

    it('getCategoryIcon falls back to the Tag icon', () => {
        expect(getCategoryIcon(undefined)).toBe(getCategoryIcon('Tag'));
        expect(getCategoryIcon(null)).toBe(getCategoryIcon('Tag'));
        expect(getCategoryIcon('NotARealIcon')).toBe(getCategoryIcon('Tag'));
    });

    it('getVerticalIcon falls back to the Store icon', () => {
        expect(getVerticalIcon(undefined)).toBe(getVerticalIcon('Store'));
        expect(getVerticalIcon(null)).toBe(getVerticalIcon('Store'));
        expect(getVerticalIcon('NotARealIcon')).toBe(getVerticalIcon('Store'));
    });

    it('getCategoryIcon and getVerticalIcon have different fallbacks (Tag vs Store)', () => {
        expect(getCategoryIcon(undefined)).not.toBe(getVerticalIcon(undefined));
    });
});
