import { test, expect, expectCellVisible } from './fixtures';

async function createCustomer(page: import('@playwright/test').Page, name: string): Promise<void> {
  await page.locator('nav >> text="客户管理"').click();
  await page.getByRole('button', { name: '新建客户' }).click();
  await page.locator('#name').fill(name);
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('cell', { name })).toBeVisible({ timeout: 10_000 });
}

test.describe('订单管理', () => {
  test('初始空状态显示提示', async ({ appPage: page }) => {
    await expect(page.getByText('暂无订单数据')).toBeVisible();
  });

  test('新建订单完整流程', async ({ appPage: page }) => {
    await createCustomer(page, '订单测试客户');

    await page.locator('nav >> text="订单管理"').click();
    await page.getByRole('link', { name: '新建订单' }).click();
    await expect(page.getByRole('heading', { name: '新建订单' })).toBeVisible();
    await expect(page.getByText('填写新订单信息')).toBeVisible();

    const orderNoInput = page.locator('#orderNo');
    await expect(orderNoInput).not.toHaveValue('', { timeout: 10_000 });

    await page.locator('#customerId').selectOption({ label: '订单测试客户' });
    await page.locator('#productName').fill('连衣裙胸口绣花');
    await page.locator('#patternName').fill('玫瑰花');
    await page.locator('#fabricType').fill('纯棉');
    await page.locator('#quantity').fill('1000');
    await page.locator('#unitPrice').fill('2.5');

    await expect(page.getByText('¥2500.00').first()).toBeVisible();

    await page.locator('#deposit').fill('500');

    await page.getByRole('button', { name: '创建订单' }).click();

    await expect(page.getByText('订单测试客户 · 连衣裙胸口绣花')).toBeVisible({ timeout: 10_000 });
  });

  test('新建订单表单验证', async ({ appPage: page }) => {
    await page.getByRole('link', { name: '新建订单' }).click();
    await page.getByRole('button', { name: '创建订单' }).click();
    await expect(page.getByText('请选择客户', { exact: true })).toBeVisible();
  });

  test('订单详情页展示和标签切换', async ({ appPage: page }) => {
    await createCustomer(page, '详情页测试客户');

    await page.locator('nav >> text="订单管理"').click();
    await page.getByRole('link', { name: '新建订单' }).click();
    await page.locator('#customerId').selectOption({ label: '详情页测试客户' });
    await page.locator('#productName').fill('T恤绣花');
    await page.locator('#quantity').fill('500');
    await page.locator('#unitPrice').fill('3');
    await page.getByRole('button', { name: '创建订单' }).click();

    await expect(page.getByText('详情页测试客户 · T恤绣花')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('总金额')).toBeVisible();
    await expect(page.getByText('已收款')).toBeVisible();
    await expect(page.getByText('未收金额')).toBeVisible();

    // Tab: 基本信息
    await expect(page.getByText('订单信息')).toBeVisible();

    // Tab: 生产记录
    await page.getByRole('button', { name: /生产记录/ }).click();
    await expect(page.getByText('暂无生产记录')).toBeVisible();

    // Tab: 收款记录
    await page.getByRole('button', { name: /收款记录/ }).click();
    await expect(page.getByText('暂无收款记录')).toBeVisible();
  });

  test('订单状态更改', async ({ appPage: page }) => {
    await createCustomer(page, '状态测试客户');

    await page.locator('nav >> text="订单管理"').click();
    await page.getByRole('link', { name: '新建订单' }).click();
    await page.locator('#customerId').selectOption({ label: '状态测试客户' });
    await page.locator('#productName').fill('状态测试产品');
    await page.locator('#quantity').fill('100');
    await page.locator('#unitPrice').fill('1');
    await page.getByRole('button', { name: '创建订单' }).click();
    await expect(page.getByText('状态测试客户 · 状态测试产品')).toBeVisible({ timeout: 10_000 });

    const statusSelect = page.locator('select.w-32');
    await statusSelect.selectOption('生产中');
    await expect(page.getByText('状态已更新为"生产中"')).toBeVisible({ timeout: 10_000 });
  });

  test('订单列表显示和搜索', async ({ appPage: page }) => {
    await createCustomer(page, '列表测试客户');

    // Create two orders
    await page.locator('nav >> text="订单管理"').click();
    await page.getByRole('link', { name: '新建订单' }).click();
    await page.locator('#customerId').selectOption({ label: '列表测试客户' });
    await page.locator('#productName').fill('衬衫绣花');
    await page.locator('#quantity').fill('200');
    await page.locator('#unitPrice').fill('5');
    await page.getByRole('button', { name: '创建订单' }).click();
    await page.waitForURL(/\/orders\/\d+/, { timeout: 10_000 });

    await page.locator('nav >> text="订单管理"').click();
    await page.getByRole('link', { name: '新建订单' }).click();
    await page.locator('#customerId').selectOption({ label: '列表测试客户' });
    await page.locator('#productName').fill('裤子绣花');
    await page.locator('#quantity').fill('300');
    await page.locator('#unitPrice').fill('4');
    await page.getByRole('button', { name: '创建订单' }).click();
    await page.waitForURL(/\/orders\/\d+/, { timeout: 10_000 });

    await page.locator('nav >> text="订单管理"').click();
    await expectCellVisible(page, '衬衫绣花');
    await expectCellVisible(page, '裤子绣花');

    // Search
    await page.getByPlaceholder('搜索订单号/产品/客户...').fill('衬衫');
    await expectCellVisible(page, '衬衫绣花');
    await expect(page.getByRole('cell', { name: '裤子绣花' })).not.toBeVisible({ timeout: 5_000 });
  });

  test('订单列表状态筛选', async ({ appPage: page }) => {
    await createCustomer(page, '筛选测试客户');

    await page.locator('nav >> text="订单管理"').click();
    await page.getByRole('link', { name: '新建订单' }).click();
    await page.locator('#customerId').selectOption({ label: '筛选测试客户' });
    await page.locator('#productName').fill('筛选测试产品');
    await page.locator('#quantity').fill('100');
    await page.locator('#unitPrice').fill('1');
    await page.getByRole('button', { name: '创建订单' }).click();
    await page.waitForURL(/\/orders\/\d+/, { timeout: 10_000 });

    await page.locator('nav >> text="订单管理"').click();
    await expectCellVisible(page, '筛选测试产品');

    await page.getByRole('button', { name: '待打样' }).click();
    await expectCellVisible(page, '筛选测试产品');

    await page.getByRole('button', { name: '已完成' }).click();
    await expect(page.getByText('未找到匹配的订单')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: '全部' }).click();
    await expectCellVisible(page, '筛选测试产品');
  });

  test('删除订单', async ({ appPage: page }) => {
    await createCustomer(page, '删除测试客户');

    await page.locator('nav >> text="订单管理"').click();
    await page.getByRole('link', { name: '新建订单' }).click();
    await page.locator('#customerId').selectOption({ label: '删除测试客户' });
    await page.locator('#productName').fill('将删除产品');
    await page.locator('#quantity').fill('100');
    await page.locator('#unitPrice').fill('1');
    await page.getByRole('button', { name: '创建订单' }).click();
    await expect(page.getByText('删除测试客户 · 将删除产品')).toBeVisible({ timeout: 10_000 });

    await page.getByTitle('删除订单').click();
    await expect(page.getByText('此操作不可撤销')).toBeVisible();
    await page.getByRole('button', { name: '删除' }).click();

    await expect(page.getByRole('heading', { name: '订单管理', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('在订单详情登记收款', async ({ appPage: page }) => {
    await createCustomer(page, '收款测试客户');

    await page.locator('nav >> text="订单管理"').click();
    await page.getByRole('link', { name: '新建订单' }).click();
    await page.locator('#customerId').selectOption({ label: '收款测试客户' });
    await page.locator('#productName').fill('收款测试产品');
    await page.locator('#quantity').fill('100');
    await page.locator('#unitPrice').fill('10');
    await page.getByRole('button', { name: '创建订单' }).click();
    await expect(page.getByText('收款测试客户 · 收款测试产品')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /收款记录/ }).click();
    await page.getByRole('button', { name: '登记收款' }).click();

    await page.locator('#pdAmount').fill('500');
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('收款登记成功')).toBeVisible({ timeout: 10_000 });
  });
});
