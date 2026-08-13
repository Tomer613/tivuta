import { test, expect } from '@playwright/test';
import { login, apiLogin, getProductId, API_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './helpers';

// Coverage for two real, previously untested backend behaviors: the scheduled-distribution cron
// trigger (POST /api/distributions/process-scheduled) and audience segmentation (filter_city /
// filter_membership_track in _send_distribution). CRON_SECRET must match playwright.config.ts's
// webServer env for the backend process this spec runs against.
const CRON_SECRET = 'e2e-test-cron-secret';
// Must match E2E_DIST_CITY / E2E_DIST_TRACK in backend/scripts/seed_e2e.py — those are the only
// values any seeded user has set for city/membership_tracks, so a filtered send only ever matches
// the one dedicated member. Keep the two files in sync if either constant ever changes.
const DIST_CITY = 'ירושלים';
const DIST_TRACK = 'gold_track';

test('scheduled distribution with audience segmentation sends only to matching members', async ({ page, request }) => {
    const suffix = Date.now();
    const adminToken = await apiLogin(request, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    const productId = await getProductId(request, 'diamonds', 'טבעת יהלום E2E');

    // Naive-UTC, 5 minutes in the past — Distribution.scheduled_at has no timezone, matching this
    // codebase's established naive-UTC convention (see confirmed_at). toISOString() is always UTC
    // regardless of local timezone; slicing off the trailing "Z"/ms yields a clean naive string.
    const scheduledAt = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 19);

    const cityTitle = `מבצע-עיר-${suffix}`;
    const trackTitle = `מבצע-מסלול-${suffix}`;

    // Independent creates — only the cron call below needs both results — so run them concurrently.
    const [cityResp, trackResp] = await Promise.all([
        request.post(`${API_BASE_URL}/admin/distributions`, {
            headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            data: {
                distribution_type: 'daily_deal',
                product_id: productId,
                title_he: cityTitle,
                channels: ['email'],
                scheduled_at: scheduledAt,
                filter_city: DIST_CITY,
            },
        }),
        request.post(`${API_BASE_URL}/admin/distributions`, {
            headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            data: {
                distribution_type: 'daily_deal',
                product_id: productId,
                title_he: trackTitle,
                channels: ['email'],
                scheduled_at: scheduledAt,
                filter_membership_track: DIST_TRACK,
            },
        }),
    ]);
    expect(cityResp.ok()).toBeTruthy();
    expect(trackResp.ok()).toBeTruthy();
    const cityDist = await cityResp.json();
    const trackDist = await trackResp.json();

    // Same call GitHub Actions makes every 15 minutes in production.
    const cronResp = await request.post(`${API_BASE_URL}/api/distributions/process-scheduled`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(cronResp.ok()).toBeTruthy();
    const cronBody = await cronResp.json();
    expect(cronBody.ids).toEqual(expect.arrayContaining([cityDist.id, trackDist.id]));

    // _send_distribution runs as a background task right after the response — poll rather than
    // assume zero delay.
    await expect(async () => {
        const listResp = await request.get(`${API_BASE_URL}/admin/distributions`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const list: { id: number; status: string; sent_count: number }[] = await listResp.json();
        const city = list.find((d) => d.id === cityDist.id);
        const track = list.find((d) => d.id === trackDist.id);
        expect(city?.status).toBe('sent');
        expect(track?.status).toBe('sent');
        // The real proof segmentation worked: each filter should have matched exactly its own
        // dedicated member, not both (no other seeded user has city or membership_tracks set).
        expect(city?.sent_count).toBe(1);
        expect(track?.sent_count).toBe(1);
    }).toPass({ timeout: 10_000 });

    // Confirm the real admin UI reflects it too, not just the API.
    await login(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    await page.goto('/he/admin/distribution');
    await expect(page.getByText(cityTitle)).toBeVisible();
    await expect(page.getByText(trackTitle)).toBeVisible();
});
