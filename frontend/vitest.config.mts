import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        environment: 'jsdom',
        // e2e/ holds Playwright specs (their own `test`/`expect`, not Vitest's) — excluded so
        // Vitest's default glob doesn't try to collect and run them.
        exclude: [...configDefaults.exclude, 'e2e/**'],
    },
});
