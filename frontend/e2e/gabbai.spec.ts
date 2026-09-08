import { test, expect } from '@playwright/test';
import { login, getProductId } from './helpers';

// Full lifecycle for the is_gabbai flag decoupled from `role` this session (see CLAUDE.md's
// "Decouple Gabbai Status from role" section): self-service registration unblocks checkout from a
// requires_gabbai world, and self-service deactivation genuinely re-blocks it — not just a display
// change on the profile page. backend/tests/test_gabbai.py already pins the API-level behavior;
// this spec drives the real UI a gabbai actually uses.
const GABBAI_EMAIL = 'e2e_gabbai@tivuta.test';
const GABBAI_PASSWORD = 'e2eGabbaiPass123';
const VERTICAL_SLUG = 'e2e_kiddush';
const PRODUCT_TITLE = 'יין קידוש E2E';

test('gabbai registration unblocks checkout, deactivation re-blocks it', async ({ page, request }) => {
    await login(page, GABBAI_EMAIL, GABBAI_PASSWORD);

    // Register as gabbai.
    await page.goto('/he/profile#gabbai-registration');
    await page.click('text=הרשמה כגבאי');
    await page.fill('input[placeholder="שם הקהילה"]', 'קהילת E2E');
    await page.fill('input[placeholder="כתובת בית הכנסת"]', 'רחוב E2E 1');
    await page.click('button[type="submit"]');
    await expect(page.locator('#gabbai-registration')).toContainText('רשום/ה כגבאי');

    // Checkout from the gabbai-only world now succeeds.
    const productId = await getProductId(request, VERTICAL_SLUG, PRODUCT_TITLE);
    await page.goto(`/he/world?slug=${VERTICAL_SLUG}`);
    const tile = page.getByTestId(`product-tile-${productId}`);
    await expect(tile).toBeVisible();
    await tile.getByRole('button', { name: 'הוסף לסל' }).click();

    await page.goto('/he/cart');
    await page.getByRole('button', { name: 'צרו איתי קשר' }).click();
    await expect(page.getByText(/ORD-\d{6}/)).toBeVisible();

    // Deactivate.
    await page.goto('/he/profile#gabbai-registration');
    page.once('dialog', (d) => d.accept());
    await page.click('text=ביטול רישום כגבאי');
    await expect(page.locator('#gabbai-registration')).toContainText('הרשמה כגבאי');

    // Checkout from the same world is genuinely blocked again, not just the profile display.
    await page.goto(`/he/world?slug=${VERTICAL_SLUG}`);
    await tile.getByRole('button', { name: 'הוסף לסל' }).click();
    await page.goto('/he/cart');
    await expect(page.getByRole('link', { name: 'להשלמת רישום כגבאי' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'צרו איתי קשר' })).not.toBeVisible();
});
