import { test, expect } from '@playwright/test';
import { login } from './helpers';

// Multi-list shopping lists (see CLAUDE.md's "Multi-List Shopping Lists" section) — a user can
// have several named lists per world, with a picker screen appearing only once 2+ exist. Shopping
// list CRUD is never gated on is_gabbai (only checkout is), so this spec uses a plain member — no
// gabbai registration needed at all.
const MEMBER_EMAIL = 'e2e_shopping_list@tivuta.test';
const MEMBER_PASSWORD = 'e2eShoppingListPass123';
const VERTICAL_SLUG = 'e2e_kiddush';
const PRODUCT_TITLE = 'יין קידוש E2E';
// The very first list auto-created for a world defaults to the world's own label_he (see
// get_shopping_lists in shopping_list.py) — this is the seeded vertical's real label_he, so it's a
// known, stable name for "the other (solo) list" throughout this spec, no dynamic DOM search needed.
// Note this name ALSO appears in the site footer's per-world nav links — every locator below is
// scoped to <main> specifically to avoid colliding with that.
const DEFAULT_LIST_NAME = 'קידוש E2E';
const NEW_LIST_NAME = 'רשימת חג';
const RENAMED_LIST_NAME = 'רשימת חג מעודכנת';

test('multiple named lists per world stay independent and manageable', async ({ page }) => {
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    const main = page.getByRole('main');

    // First visit auto-seeds a single list directly — no picker screen for the common case.
    await page.goto(`/he/shopping-list?vertical=${VERTICAL_SLUG}`);
    await expect(main.getByRole('heading', { name: 'בחר רשימה' })).not.toBeVisible();

    // Create a second list.
    await main.getByText('+ צור רשימה נוספת').click();
    await main.getByPlaceholder('לדוגמה: רשימת קידוש רגילה').fill(NEW_LIST_NAME);
    await main.getByRole('button', { name: 'צור' }).click();
    await expect(page).toHaveURL(/[?&]list=\d+/);
    await expect(main).toContainText(NEW_LIST_NAME);
    await expect(main.getByText('כל הרשימות שלי')).toBeVisible();

    // The picker now shows both lists.
    await main.getByText('כל הרשימות שלי').click();
    await expect(main.getByRole('heading', { name: 'בחר רשימה' })).toBeVisible();
    await expect(main.getByText(NEW_LIST_NAME, { exact: true })).toBeVisible();
    await expect(main.getByText(DEFAULT_LIST_NAME, { exact: true })).toBeVisible();

    // Open the new list and add the seeded product to it.
    await main.getByText(NEW_LIST_NAME, { exact: true }).click();
    await main.getByPlaceholder('חיפוש מוצר...').fill(PRODUCT_TITLE);
    await main.getByText(PRODUCT_TITLE).click();
    await expect(main).toContainText(PRODUCT_TITLE);

    // The OTHER (default) list must not have picked up this item — independence between lists.
    await main.getByText('כל הרשימות שלי').click();
    await main.getByText(DEFAULT_LIST_NAME, { exact: true }).click();
    await expect(main).not.toContainText(PRODUCT_TITLE);

    // Rename the new list, then confirm the new name shows everywhere.
    await main.getByText('כל הרשימות שלי').click();
    await main.getByText(NEW_LIST_NAME, { exact: true }).click();
    await main.getByTitle('שנה שם לרשימה').click();
    await main.getByPlaceholder('לדוגמה: רשימת קידוש רגילה').fill(RENAMED_LIST_NAME);
    await main.getByRole('button', { name: 'שמור' }).click();
    await expect(main).toContainText(RENAMED_LIST_NAME);
    await main.getByText('כל הרשימות שלי').click();
    await expect(main.getByText(RENAMED_LIST_NAME, { exact: true })).toBeVisible();

    // Delete it — back down to a single list, no more picker.
    const renamedRow = main.locator('div')
        .filter({ hasText: RENAMED_LIST_NAME })
        .filter({ has: page.getByRole('button', { name: 'מחק רשימה' }) })
        .last();
    page.once('dialog', (d) => d.accept());
    await renamedRow.getByRole('button', { name: 'מחק רשימה' }).click();
    await expect(main.getByText(RENAMED_LIST_NAME)).not.toBeVisible();
    await expect(main.getByRole('heading', { name: 'בחר רשימה' })).not.toBeVisible();
});
