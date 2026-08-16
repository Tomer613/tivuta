import { test, expect } from '@playwright/test';
import { login, apiLogin, getProductId, API_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './helpers';

// Covers three pieces shipped together and only ever verified manually/via pytest until now:
// sale-price display on the storefront tile, a quantity-discount bundle actually applying at
// checkout (and the resulting order-price snapshot surviving into the customer's order history),
// and the admin product-delete flow (real delete when safe, a clear block when a product has
// order history — see CLAUDE.md's product-delete session for why this isn't just is_active=false).

const MEMBER_EMAIL = 'e2e_member@tivuta.test';
const MEMBER_PASSWORD = 'e2eMemberPass123';
const SALE_PRODUCT_TITLE = 'טבעת יהלום מבצע E2E';
const PRODUCT_A = 'טבעת יהלום E2E';
const PRODUCT_B = 'עגילי יהלום E2E';

test('storefront tile shows the strikethrough sale price and discount badge', async ({ page, request }) => {
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    const productId = await getProductId(request, 'diamonds', SALE_PRODUCT_TITLE);

    await page.goto('/he/world?slug=diamonds');
    const tile = page.getByTestId(`product-tile-${productId}`);
    await expect(tile).toBeVisible();

    // Seeded at price=2000, sale_price=1500 -> 25% off.
    await expect(tile.getByText('₪2,000')).toBeVisible();
    await expect(tile.getByText('₪1,500')).toBeVisible();
    await expect(tile.getByText('25%')).toBeVisible();
});

test('quantity discount bundle applies at checkout and the saving survives into order history', async ({ page, request }) => {
    const adminToken = await apiLogin(request, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    const idA = await getProductId(request, 'diamonds', PRODUCT_A);
    const idB = await getProductId(request, 'diamonds', PRODUCT_B);

    // Own, throwaway bundle per run (unique name) — matches admin-bulk-actions.spec.ts's
    // precedent of a spec creating its own fixtures via the API rather than static seed data,
    // since (unlike the sale-price product above) this fixture only exists to be torn through by
    // this one test's checkout, not referenced anywhere else.
    const bundleName = `E2E-Bundle-${Date.now()}`;
    const bundleResp = await request.post(`${API_BASE_URL}/admin/quantity-discounts`, {
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        data: { name_he: bundleName, tiers: [{ min_quantity: 3, discount_percent: 10 }] },
    });
    expect(bundleResp.ok()).toBeTruthy();
    const bundle = await bundleResp.json();

    const assignResp = await request.patch(`${API_BASE_URL}/admin/products/bulk-quantity-discount`, {
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        data: { product_ids: [idA, idB], quantity_discount_bundle_id: bundle.id },
    });
    expect(assignResp.ok()).toBeTruthy();

    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await page.goto('/he/world?slug=diamonds');

    // 2 of A + 1 of B = 3 combined units in the bundle -> crosses the 3-unit / 10% tier.
    const tileA = page.getByTestId(`product-tile-${idA}`);
    await tileA.getByRole('button', { name: 'הוסף לסל' }).click();
    await tileA.getByRole('button', { name: 'הוסף כמות' }).click();
    const tileB = page.getByTestId(`product-tile-${idB}`);
    await tileB.getByRole('button', { name: 'הוסף לסל' }).click();

    await page.goto('/he/cart');
    // Pre-checkout preview already reflects the pending discount.
    await expect(page.getByText('חיסכון')).toBeVisible();
    await page.getByRole('button', { name: 'צרו איתי קשר' }).click();
    await expect(page.getByText(/ORD-\d{6}/)).toBeVisible();

    // The snapshotted prices (A: 5000*0.9=4500 x2 units -> ₪1,000 saved; B: 3000*0.9=2700 x1 unit
    // -> ₪300 saved) must show up in the customer's order history — proves the discount wasn't
    // just a client-side preview but was actually persisted server-side. Both line items render
    // their own "חסכת ₪X" line, so asserting the specific amounts (not just the loose label) both
    // confirms presence unambiguously and pins down the actual stacked-discount math.
    await page.goto('/he/profile#my-orders');
    const ordersSection = page.locator('#my-orders');
    await expect(ordersSection.getByText('₪4,500')).toBeVisible();
    await expect(ordersSection.getByText('₪2,700')).toBeVisible();
    await expect(ordersSection.getByText('חסכת ₪1,000')).toBeVisible();
    await expect(ordersSection.getByText('חסכת ₪300')).toBeVisible();

    // Undo the bundle assignment so this throwaway bundle doesn't keep discounting the two
    // shared, stable seeded products for any spec that happens to run after this one.
    await request.patch(`${API_BASE_URL}/admin/products/bulk-quantity-discount`, {
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        data: { product_ids: [idA, idB], quantity_discount_bundle_id: null },
    });
});

test('admin can permanently delete an unused product, but is blocked from deleting one with order history', async ({ page, request }) => {
    const adminToken = await apiLogin(request, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    const suffix = Date.now();

    const unusedTitle = `E2E-Delete-Unused-${suffix}`;
    const usedTitle = `E2E-Delete-Blocked-${suffix}`;
    for (const title of [unusedTitle, usedTitle]) {
        const resp = await request.post(`${API_BASE_URL}/admin/products`, {
            headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            data: { vertical: 'diamonds', title_he: title, description_he: 'מוצר לבדיקת מחיקה', price: 100 },
        });
        expect(resp.ok()).toBeTruthy();
    }

    // Give the second product real order history so the delete-guard has something to block on.
    const usedId = await getProductId(request, 'diamonds', usedTitle);
    const memberToken = await apiLogin(request, MEMBER_EMAIL, MEMBER_PASSWORD);
    const checkoutResp = await request.post(`${API_BASE_URL}/leads/cart-checkout`, {
        headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
        data: { items: [{ product_id: usedId, quantity: 1 }] },
    });
    expect(checkoutResp.ok()).toBeTruthy();

    await login(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    await page.goto('/he/admin/products');
    await page.fill('input[placeholder="חיפוש מוצר..."]', suffix.toString());

    const unusedRow = page.locator('tr', { has: page.getByText(unusedTitle, { exact: true }) });
    await unusedRow.getByTitle('מחיקה').click();
    await unusedRow.getByText('כן').click();
    await expect(page.getByText('המוצר נמחק לצמיתות')).toBeVisible();
    await expect(page.getByText(unusedTitle, { exact: true })).toHaveCount(0);

    const usedRow = page.locator('tr', { has: page.getByText(usedTitle, { exact: true }) });
    await usedRow.getByTitle('מחיקה').click();
    await usedRow.getByText('כן').click();
    await expect(page.getByText('לא ניתן למחוק אותו לצמיתות', { exact: false })).toBeVisible();
    // Still there, unaffected — the block didn't fall back to silently hiding it either.
    await expect(page.getByText(usedTitle, { exact: true })).toBeVisible();
    await expect(usedRow.getByText('פעיל')).toBeVisible();
});
