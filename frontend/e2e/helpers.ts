import { Page, APIRequestContext, expect } from '@playwright/test';

const API_BASE_URL = 'http://127.0.0.1:8000';

export async function login(page: Page, email: string, password: string) {
    await page.goto('/he/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/he\/?(\?.*)?$/);
}

// Looks up a seeded product's real id by its known title — GET /products is public, no auth
// needed. Used to build a stable data-testid locator instead of depending on title_he, which
// isn't guaranteed unique (see ProductTile.tsx's data-testid, keyed on product.id for that reason).
export async function getProductId(request: APIRequestContext, vertical: string, titleHe: string): Promise<number> {
    const res = await request.get(`${API_BASE_URL}/products?vertical=${vertical}`);
    const products: { id: number; title_he: string }[] = await res.json();
    const product = products.find((p) => p.title_he === titleHe);
    if (!product) throw new Error(`E2E fixture product not found: "${titleHe}" (vertical=${vertical})`);
    return product.id;
}
