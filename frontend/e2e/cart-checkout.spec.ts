import { test, expect } from '@playwright/test';
import { login, getProductId } from './helpers';

// Frontend-level regression test for the historical stale-quantity bug (Back-Office Orders
// Phase 1, see CLAUDE.md): cart-checkout once silently tagged every line item with the *last*
// cart item's quantity. backend/tests/test_cart_checkout.py already pins this at the API level;
// this spec drives the actual product-tile quantity-stepper UI instead, which that test bypasses
// entirely by posting a JSON body directly.
const MEMBER_EMAIL = 'e2e_member@tivuta.test';
const MEMBER_PASSWORD = 'e2eMemberPass123';
const PRODUCT_A = 'טבעת יהלום E2E';
const PRODUCT_B = 'עגילי יהלום E2E';

test('cart checkout preserves each product\'s own quantity', async ({ page, request }) => {
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);

    // testids are keyed on product.id (stable), not title_he (admin-editable, not guaranteed
    // unique) — looked up by title here since that's the only thing this spec knows ahead of time.
    const idA = await getProductId(request, 'diamonds', PRODUCT_A);
    const idB = await getProductId(request, 'diamonds', PRODUCT_B);

    await page.goto('/he/world?slug=diamonds');

    const tileA = page.getByTestId(`product-tile-${idA}`);
    const tileB = page.getByTestId(`product-tile-${idB}`);
    await expect(tileA).toBeVisible();
    await expect(tileB).toBeVisible();

    // Product A: add to cart, then increment to quantity 2 via the real +/- stepper.
    await tileA.getByRole('button', { name: 'הוסף לסל' }).click();
    await tileA.getByRole('button', { name: 'הוסף כמות' }).click();

    // Product B: add to cart, left at quantity 1 — this is the item whose quantity the
    // historical bug would have overwritten onto every other line item.
    await tileB.getByRole('button', { name: 'הוסף לסל' }).click();

    await page.goto('/he/cart');
    await page.getByRole('button', { name: 'צרו איתי קשר' }).click();

    // Order number is rendered dir="ltr" as "ORD-000123" — a stable, locale-independent marker
    // of checkout success (avoids depending on exact Hebrew success copy).
    await expect(page.getByText(/ORD-\d{6}/)).toBeVisible();

    await page.goto('/he/profile#my-orders');
    const ordersSection = page.locator('#my-orders');
    await expect(ordersSection.getByText(`${PRODUCT_A} ×2`)).toBeVisible();
    await expect(ordersSection.getByText(PRODUCT_B, { exact: true })).toBeVisible();
});
