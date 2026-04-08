import { test, expect } from './fixtures';

test.describe('收款对账', () => {
  test('初始状态显示空记录和筛选区', async ({ appPage: page }) => {
    await page.locator('nav >> text="收款对账"').click();
    await expect(page.locator('h2:text("收款对账")')).toBeVisible();
    await expect(page.locator('text=暂无收款记录')).toBeVisible();
    await expect(page.locator('text=生成对账单')).toBeVisible();
    await expect(page.locator('text=登记收款')).toBeVisible();
  });

  test('日期筛选控件可用', async ({ appPage: page }) => {
    await page.locator('nav >> text="收款对账"').click();
    await expect(page.locator('#dateFrom')).toBeVisible();
    await expect(page.locator('#dateTo')).toBeVisible();
  });

  test('搜索框可用', async ({ appPage: page }) => {
    await page.locator('nav >> text="收款对账"').click();
    const searchInput = page.getByPlaceholder('搜索订单号、产品、客户...');
    await expect(searchInput).toBeVisible();
  });

  test('对账单页面可访问', async ({ appPage: page }) => {
    await page.locator('nav >> text="收款对账"').click();
    await page.getByRole('link', { name: '生成对账单' }).click();
    await expect(page).toHaveURL(/\/finance\/statement/);
  });
});
