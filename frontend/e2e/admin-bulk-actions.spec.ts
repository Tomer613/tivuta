import { test, expect } from '@playwright/test';
import { login, apiLogin, API_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './helpers';

// Regression coverage for the useBulkSelection resetKey bug (Back-Office Orders Phase 2 review):
// a filter change didn't clear stale selections, so a bulk action could silently apply to
// now-invisible rows. useBulkSelection.test.ts already covers the hook in isolation; this drives
// the real toolbar wired to the real leads table end-to-end.

test('admin bulk-updates the status of multiple selected leads', async ({ page, request }) => {
    const prefix = `Bulk-Test-${Date.now()}`;

    const memberToken = await apiLogin(request, 'e2e_member@tivuta.test', 'e2eMemberPass123');

    for (let i = 1; i <= 3; i++) {
        const resp = await request.post(`${API_BASE_URL}/leads/contact`, {
            headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
            data: { subject: `${prefix}-${i}`, message: 'הודעת בדיקה לפעולה מרוכזת' },
        });
        expect(resp.ok()).toBeTruthy();
    }

    await login(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

    await page.goto('/he/admin/leads');
    await page.fill('input[placeholder="חיפוש שם / מייל / מוצר..."]', prefix);
    await expect(page.locator('tbody tr')).toHaveCount(3);

    await page.getByTestId('select-all-leads').click();
    await page.getByTestId('bulk-action-select').selectOption({ value: 'set_status' });
    await page.getByTestId('bulk-value-select').selectOption({ value: 'contacted' });
    await page.getByTestId('bulk-execute-button').click();

    await expect(page.locator('tbody').getByText('טופלה')).toHaveCount(3);
});
