import { test, expect } from '@playwright/test';

// Regression test for the "General Contact Us Feature" session: before it, GET /admin/leads was
// permanently empty (every lead-creating path wrapped in a CustomerOrder). This turns that
// session's own ad-hoc scratch-Playwright verification into a permanent check.
const MEMBER_EMAIL = 'e2e_member@tivuta.test';
const MEMBER_PASSWORD = 'e2eMemberPass123';
const ADMIN_EMAIL = 'e2e_admin@tivuta.test';
const ADMIN_PASSWORD = 'e2eAdminPass123';
// Unique per test run (not just per spec) — a CI retry re-submits the whole test from scratch,
// and a fixed subject string would create a second lead with the same text, turning the final
// getByText assertion into a strict-mode "multiple elements matched" failure instead of a clean
// pass on the retry that was supposed to recover.
const SUBJECT = `שאלה בדיקת E2E ${Date.now()}`;
const MESSAGE = 'זוהי הודעת בדיקה אוטומטית לבדיקת תכונת צור קשר.';

test('member contact-us submission appears in the admin leads queue', async ({ page }) => {
    await page.goto('/he/login');
    await page.fill('input[type="email"]', MEMBER_EMAIL);
    await page.fill('input[type="password"]', MEMBER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/he\/?(\?.*)?$/);

    await page.locator('text=שלח פנייה').first().click();
    await expect(page).toHaveURL(/\/he\/contact\/?$/);

    await page.fill('input[type="text"]', SUBJECT);
    await page.fill('textarea', MESSAGE);
    await page.click('button[type="submit"]');
    await expect(page.getByText('הפנייה נשלחה בהצלחה!')).toBeVisible();

    await page.goto('/he/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/he\/?(\?.*)?$/);

    await page.goto('/he/admin/leads');
    await expect(page.getByText(SUBJECT)).toBeVisible();
    await expect(page.getByText('פנייה כללית')).toBeVisible();
});
