import { test, expect } from '@playwright/test';
import { login } from './helpers';

// Regression test for the "General Contact Us Feature" session: before it, GET /admin/leads was
// permanently empty (every lead-creating path wrapped in a CustomerOrder). This turns that
// session's own ad-hoc scratch-Playwright verification into a permanent check.
const MEMBER_EMAIL = 'e2e_member@tivuta.test';
const MEMBER_PASSWORD = 'e2eMemberPass123';
const ADMIN_EMAIL = 'e2e_admin@tivuta.test';
const ADMIN_PASSWORD = 'e2eAdminPass123';
const MESSAGE = 'זוהי הודעת בדיקה אוטומטית לבדיקת תכונת צור קשר.';

test('member contact-us submission appears in the admin leads queue', async ({ page }) => {
    // Computed inside the test, not at module scope — module-level code runs once per worker
    // process, not once per test invocation, so a fixed/hoisted value would be reused verbatim
    // if this test ever ran more than once in the same process (retries are disabled globally,
    // see playwright.config.ts, but this stays correct independent of that setting too).
    const SUBJECT = `שאלה בדיקת E2E ${Date.now()}`;

    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);

    await page.locator('text=שלח פנייה').first().click();
    await expect(page).toHaveURL(/\/he\/contact\/?$/);

    await page.fill('input[type="text"]', SUBJECT);
    await page.fill('textarea', MESSAGE);
    await page.click('button[type="submit"]');
    await expect(page.getByText('הפנייה נשלחה בהצלחה!')).toBeVisible();

    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto('/he/admin/leads');
    await expect(page.getByText(SUBJECT)).toBeVisible();
    await expect(page.getByText('פנייה כללית')).toBeVisible();
});
