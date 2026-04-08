import { test as base, expect, type Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlJsDir = path.resolve(__dirname, '..', 'node_modules', 'sql.js', 'dist');
const mockScriptPath = path.resolve(__dirname, 'tauri-mock.js');

async function setupTauriMock(page: Page): Promise<void> {
  await page.route('**/test-assets/**', async (route) => {
    const url = new URL(route.request().url());
    const filename = url.pathname.split('/').pop()!;
    const filePath = path.join(sqlJsDir, filename);
    await route.fulfill({
      path: filePath,
      contentType: filename.endsWith('.wasm')
        ? 'application/wasm'
        : 'application/javascript',
    });
  });

  await page.addInitScript({ path: mockScriptPath });
}

export const test = base.extend<{ appPage: Page }>({
  appPage: async ({ page }, use) => {
    page.on('pageerror', (err) => console.error('[PAGE ERROR]', err.message));

    await setupTauriMock(page);
    await page.goto('/');
    await page.waitForSelector('text=绣花厂订单管理', { timeout: 15_000 });
    await use(page);
  },
});

export { expect };

/** Wait for a table cell with given text to be visible */
export async function expectCellVisible(
  page: Page,
  text: string,
  timeout = 10_000,
): Promise<void> {
  await expect(page.getByRole('cell', { name: text })).toBeVisible({ timeout });
}

/** Wait for a table cell with given text to be hidden */
export async function expectCellHidden(
  page: Page,
  text: string,
  timeout = 10_000,
): Promise<void> {
  await expect(page.getByRole('cell', { name: text })).not.toBeVisible({ timeout });
}
