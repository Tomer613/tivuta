import { test, expect } from '@playwright/test';
import { apiLogin, API_BASE_URL } from './helpers';

// Exercises VENDOR_LOGIN_RATE_LIMIT (backend/app/routers/vendor_portal.py), added specifically so
// a future vendor-portal spec wouldn't need another production-code change to avoid the same
// per-IP rate-limit collision LOGIN_RATE_LIMIT was built to fix for /auth/login. This is that spec.
const VENDOR_EMAIL = 'e2e_vendor@tivuta.test';
const VENDOR_PASSWORD = 'e2eVendorPass123';

test('vendor logs in, reports a sale, and sees it in their own dashboard', async ({ page, request }) => {
    // The customer_number isn't known ahead of time (randomly generated per seed) — fetched via
    // the member's own login + profile, the same way a real customer would read it off their card.
    const memberToken = await apiLogin(request, 'e2e_member@tivuta.test', 'e2eMemberPass123');
    const meRes = await request.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${memberToken}` },
    });
    const { customer_number: customerNumber } = await meRes.json();
    expect(customerNumber).toBeTruthy();

    await page.goto('/he/vendor/login');
    await page.fill('input[type="email"]', VENDOR_EMAIL);
    await page.fill('input[type="password"]', VENDOR_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/he\/vendor\/dashboard\/?$/);

    await page.goto('/he/vendor/report');
    await page.getByPlaceholder('TVT-XXXXXXXXXX').fill(customerNumber);
    await page.getByPlaceholder('1000').fill('500');
    await page.click('button[type="submit"]');
    await expect(page.getByText('העסקה דווחה בהצלחה', { exact: false })).toBeVisible();

    await page.goto('/he/vendor/dashboard');
    await expect(page.getByText('₪500')).toBeVisible();
    await expect(page.getByText('אושרה')).toBeVisible();
});
