import { test, expect } from '@playwright/test';

// Assumes a freshly seeded DB (`python -m scripts.seed_e2e` against a new DATABASE_URL) — the
// account starts unlocked. Re-running this spec against an already-locked account (e.g. a reused
// local dev.db within the lockout window) will fail differently since the account would already
// be locked on the first attempt; use a fresh e2e DB per run, matching the CI flow.
// A dedicated account, distinct from the one cart-checkout.spec.ts / contact-us.spec.ts log in
// as — locking this one out must not break those specs, and spec files don't run in a guaranteed
// order relative to each other.
const LOCKOUT_EMAIL = 'e2e_lockout@tivuta.test';
const LOCKOUT_PASSWORD = 'e2eLockoutPass123';

test('locks the account after repeated wrong passwords and shows the specific lockout message', async ({ page }) => {
    await page.goto('/he/login');

    // The E2E seed lowers max_failed_login_attempts to 3 specifically so this 4-request sequence
    // stays under slowapi's 5/minute per-IP rate limit on /auth/login — the two mechanisms share
    // the same default threshold and collide otherwise (see CLAUDE.md's Per-Account Login Lockout
    // session, which hit this exact flakiness during its own manual verification).
    for (let i = 0; i < 3; i++) {
        await page.fill('input[type="email"]', LOCKOUT_EMAIL);
        await page.fill('input[type="password"]', 'wrong-password');
        await page.click('button[type="submit"]');
        await expect(page.getByText('אימייל או סיסמה שגויים')).toBeVisible();
    }

    // 4th attempt uses the CORRECT password, but the account is now locked — must show the
    // specific 423 message, not the generic wrong-password one.
    await page.fill('input[type="email"]', LOCKOUT_EMAIL);
    await page.fill('input[type="password"]', LOCKOUT_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.getByText('Too many failed login attempts')).toBeVisible();
});
