import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function createCustomer(page: Page, name: string): Promise<void> {
  await page.locator('nav >> text="客户管理"').click();
  await page.getByRole('button', { name: '新建客户' }).click();
  await page.locator('#name').fill(name);
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('cell', { name })).toBeVisible({ timeout: 10_000 });
}

async function createOrder(page: Page, customerName: string, productName: string): Promise<void> {
  await page.locator('nav >> text="订单管理"').click();
  await page.getByRole('link', { name: '新建订单' }).click();
  await page.locator('#customerId').selectOption({ label: customerName });
  await page.locator('#productName').fill(productName);
  await page.locator('#quantity').fill('10');
  await page.locator('#unitPrice').fill('20');
  await page.getByRole('button', { name: '创建订单' }).click();
  await expect(page.getByText(`${customerName} · ${productName}`)).toBeVisible({ timeout: 10_000 });
}

async function createPayment(page: Page, productName: string): Promise<void> {
  await page.locator('nav >> text="收款对账"').click();
  await page.getByRole('button', { name: '登记收款' }).click();
  await page.locator('input[placeholder="输入订单号搜索..."]').fill(productName);
  await page.locator('#payOrder').selectOption({ index: 1 });
  await page.locator('#payAmount').fill('120');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('收款登记成功')).toBeVisible({ timeout: 10_000 });
}

async function createWageExpense(page: Page): Promise<void> {
  await page.locator('nav >> text="工人工资"').click();
  await page.getByRole('button', { name: '添加工人' }).click();
  await page.locator('#wName').fill('经营统计长工');
  await page.locator('#wSalary').fill('6000');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('cell', { name: '经营统计长工' })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: '长工工资' }).click();
  await page.getByRole('button', { name: '生成本月工资' }).click();
  await expect(page.getByText(/已为 1 位长工生成工资记录|本月工资已全部生成，无需重复操作/)).toBeVisible({
    timeout: 10_000,
  });
}

async function createThreadPurchaseExpense(page: Page): Promise<void> {
  await page.locator('nav >> text="线材库存"').click();
  await page.getByRole('button', { name: '新增线材' }).click();
  await page.locator('#tf-colorNo').fill('9901');
  await page.locator('#tf-brand').fill('Madeira');
  await page.locator('#tf-colorName').fill('经营统计蓝');
  await page.locator('#tf-quantity').fill('2');
  await page.locator('#tf-minStock-new').fill('1');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('线材已添加').last()).toBeVisible({ timeout: 10_000 });

  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: '9901' }) });
  await row.getByTitle('调整库存').click();
  await page.locator('#adjustDelta').fill('3');
  await page.locator('#adjustSupplier').fill('经营统计供应商');
  await page.locator('#adjustUnitCost').fill('5');
  await page.locator('#adjustTotalCost').fill('15');
  await page.getByRole('button', { name: '确认调整' }).click();
  await expect(page.getByText('已入库 3 筒，采购记录已保存')).toBeVisible({ timeout: 10_000 });
}

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

  test('工厂经营统计页展示饼图并支持周期切换', async ({ appPage: page }) => {
    const currentYear = new Date().getFullYear();
    const productName = '经营统计测试产品';

    await createCustomer(page, '经营统计测试客户');
    await createOrder(page, '经营统计测试客户', productName);
    await createPayment(page, productName);
    await createWageExpense(page);
    await createThreadPurchaseExpense(page);

    await page.locator('nav >> text="收款对账"').click();
    await page.getByRole('link', { name: '工厂经营统计' }).click();

    await expect(page.getByRole('heading', { name: '工厂经营统计' })).toBeVisible();
    await expect(page.getByText('共 12 个周期')).toBeVisible();
    await expect(page.getByText('支出构成')).toBeVisible();
    await expect(page.getByText('收支对比')).toBeVisible();
    await expect(
      page
        .locator('div')
        .filter({ has: page.getByText('支出构成') })
        .locator('svg.recharts-surface')
        .first(),
    ).toBeVisible();
    await expect(
      page
        .locator('div')
        .filter({ has: page.getByText('收支对比') })
        .locator('svg.recharts-surface')
        .first(),
    ).toBeVisible();

    await page.locator('#overviewGranularity').selectOption('quarter');
    await expect(page.locator('#overviewQuarter')).toBeVisible();
    await expect(page.locator('#overviewMonth')).toHaveCount(0);
    await expect(page.getByText('共 4 个周期')).toBeVisible();
    await expect(page.getByText(new RegExp(`${currentYear}年Q[1-4]`)).first()).toBeVisible();

    await page.locator('#overviewGranularity').selectOption('year');
    await expect(page.locator('#overviewQuarter')).toHaveCount(0);
    await expect(page.locator('#overviewMonth')).toHaveCount(0);
    await expect(page.getByText('共 1 个周期')).toBeVisible();
    await expect(page.locator('svg.recharts-surface').first()).toBeVisible();

    await expect(page.getByText('工资支出').first()).toBeVisible();
    await expect(page.getByText('线材采购').first()).toBeVisible();
    await expect(page.getByText('实收').first()).toBeVisible();
    await expect(page.getByText('总支出').first()).toBeVisible();
  });
});
