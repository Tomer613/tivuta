import { defineConfig, devices } from '@playwright/test';

// Chromium only — matches every manual verification already done throughout this project's
// history (see CLAUDE.md's various "session" writeups, all driven by a scratch Playwright/Chromium
// install). Not an attempt at cross-browser coverage.
export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    // One worker, not just fullyParallel:false — all 3 specs hit the same real backend process
    // (shared rate-limiter state, shared DB), and `next dev` compiles each route on first visit,
    // which can take several seconds under concurrent cold-compiles from multiple spec files at
    // once. Serial execution removes both classes of cross-file flakiness; 3 specs stay fast
    // enough serially that this isn't a real cost for a starter suite this size.
    workers: 1,
    // Generous enough to tolerate a `next dev` on-demand compile of a not-yet-visited route
    // (this is what actually caused the two observed failures below, not a real login bug —
    // confirmed by an isolated single-test run passing cleanly at the default timeout).
    expect: { timeout: 15_000 },
    // Deliberately 0, even in CI: every spec mutates real, shared backend state (locks an
    // account, creates a real lead/order) against one DB with no reset between attempts. A retry
    // doesn't get a clean slate — it replays the same steps against already-mutated state, so it
    // either fails for a *different*, more confusing reason (e.g. auth.spec.ts's account is
    // already locked from attempt 1, so the retry's first assertion checks for the wrong error
    // message) or reproduces the original failure with extra noise. A single clear failure beats
    // a retry that can only mask or compound it.
    retries: 0,
    reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'retain-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    // reuseExistingServer: !process.env.CI is Playwright's own default — locally this reuses
    // whatever a developer already has running via `npm run dev` / `uvicorn` (the workflow every
    // prior session in this project used), and only in CI does it launch fresh processes. The
    // bare `uvicorn` command assumes it's on PATH, true in CI after a venv-less `pip install`, but
    // NOT true on a developer machine using a `.venv` — so running this locally against a
    // not-already-running backend will fail to auto-start it; start the backend yourself first
    // (see CLAUDE.md "How to Run"), matching this project's existing local workflow.
    webServer: [
        {
            command: 'cd ../backend && uvicorn app.main:app --port 8000',
            url: 'http://127.0.0.1:8000/docs',
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
            // The suite's specs collectively make several /auth/login requests across different
            // accounts within one run, all counted against the same per-IP slowapi bucket
            // (5/minute default) regardless of account — raised only for this webServer-launched
            // process. Only takes effect when Playwright itself starts the backend (fresh in CI,
            // or locally when nothing's already listening on :8000); a separately-started local
            // backend needs this set manually before it starts to get the same fix.
            env: { ...process.env, LOGIN_RATE_LIMIT: '100/minute' },
        },
        {
            command: 'npm run dev',
            url: 'http://127.0.0.1:3000/he/login',
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
        },
    ],
});
