import { test, expect } from './fixtures';

import type { Page } from '@playwright/test';

async function goToThreads(page: Page): Promise<void> {
  await page.locator('nav >> text="线材库存"').click();
  await expect(page.getByRole('heading', { name: '线材库存' })).toBeVisible();
}

async function createThread(
  page: Page,
  data: {
    colorNo: string;
    brand?: string;
    colorName?: string;
    material?: string;
    quantity?: number;
    minStock?: number;
    unitCost?: string;
    supplier?: string;
    notes?: string;
  },
): Promise<void> {
  await page.getByRole('button', { name: '新增线材' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.locator('#tf-colorNo').fill(data.colorNo);

  if (data.brand) {
    await page.locator('#tf-brand').fill(data.brand);
  }

  if (data.colorName) {
    await page.locator('#tf-colorName').fill(data.colorName);
  }

  if (data.material) {
    await page.locator('#tf-material').selectOption({ label: data.material });
  }

  if (data.quantity != null) {
    await page.locator('#tf-quantity').fill(String(data.quantity));
  }

  if (data.minStock != null) {
    await page.locator('#tf-minStock-new').fill(String(data.minStock));
  }

  if (data.unitCost) {
    await page.locator('#tf-unitCost').fill(data.unitCost);
  }

  if (data.supplier) {
    await page.locator('#tf-supplier').fill(data.supplier);
  }

  if (data.notes) {
    await page.locator('#tf-notes').fill(data.notes);
  }

  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('线材已添加').last()).toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

function getThreadRow(page: Page, colorNo: string) {
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name: colorNo }) });
}

test.describe('线材库存', () => {
  test('新增线材并展示基础信息', async ({ appPage: page }) => {
    await goToThreads(page);

    await expect(page.getByText('暂无线材数据，点击"新增线材"添加第一条记录')).toBeVisible();

    await createThread(page, {
      colorNo: '8000',
      brand: 'Madeira',
      colorName: '大红',
      material: '涤纶线',
      quantity: 12,
      minStock: 5,
      unitCost: '3.50',
      supplier: '红线供应商',
      notes: '首批入库',
    });

    const row = getThreadRow(page, '8000');
    await expect(row.getByRole('cell', { name: 'Madeira' })).toBeVisible();
    await expect(row.getByRole('cell', { name: '大红' })).toBeVisible();
    await expect(row.getByRole('cell', { name: '涤纶线' })).toBeVisible();
    await expect(row.getByRole('cell', { name: '12' })).toBeVisible();
    await expect(row.getByText('正常')).toBeVisible();
  });

  test('支持按关键词、品牌和库存状态筛选', async ({ appPage: page }) => {
    await goToThreads(page);

    await createThread(page, {
      colorNo: '1001',
      brand: 'Madeira',
      colorName: '玫红',
      quantity: 3,
      minStock: 5,
    });

    await createThread(page, {
      colorNo: '1002',
      brand: 'Gunold',
      colorName: '藏青',
      quantity: 0,
      minStock: 2,
    });

    await page.getByPlaceholder('搜索色号/颜色名称...').fill('1001');
    await expect(getThreadRow(page, '1001')).toBeVisible();
    await expect(getThreadRow(page, '1002')).toHaveCount(0);

    await page.getByPlaceholder('搜索色号/颜色名称...').fill('');
    await page.locator('select.w-36').selectOption({ label: 'Gunold' });
    await expect(getThreadRow(page, '1002')).toBeVisible();
    await expect(getThreadRow(page, '1001')).toHaveCount(0);

    await page.locator('select.w-36').selectOption('');
    await page.locator('select.w-32').selectOption('low');
    await expect(getThreadRow(page, '1001')).toBeVisible();
    await expect(getThreadRow(page, '1002')).toHaveCount(0);

    await page.locator('select.w-32').selectOption('zero');
    await expect(getThreadRow(page, '1002')).toBeVisible();
    await expect(getThreadRow(page, '1001')).toHaveCount(0);
  });

  test('支持采购入库并维护采购记录', async ({ appPage: page }) => {
    await goToThreads(page);

    await createThread(page, {
      colorNo: '2001',
      brand: 'Madeira',
      colorName: '天蓝',
      quantity: 5,
      minStock: 2,
      supplier: '原始供应商',
    });

    const row = getThreadRow(page, '2001');
    await row.getByTitle('调整库存').click();

    await page.locator('#adjustDelta').fill('7');
    await page.locator('#adjustSupplier').fill('新供应商');
    await page.locator('#adjustUnitCost').fill('2.50');
    await page.locator('#adjustTotalCost').fill('17.50');
    await page.getByRole('button', { name: '确认调整' }).click();

    await expect(page.getByText('已入库 7 筒，采购记录已保存')).toBeVisible();
    await expect(row.getByRole('cell', { name: '12' })).toBeVisible();

    await row.getByTitle('采购记录').click();
    const historyDialog = page.getByRole('dialog');

    await expect(historyDialog.getByText('采购记录')).toBeVisible();
    await expect(historyDialog.getByRole('cell', { name: '7', exact: true })).toBeVisible();
    await expect(historyDialog.getByRole('cell', { name: '¥2.50' })).toBeVisible();
    await expect(historyDialog.getByRole('cell', { name: '¥17.50' })).toBeVisible();
    await expect(historyDialog.getByRole('cell', { name: '新供应商' })).toBeVisible();
    await expect(historyDialog.getByText('累计采购:')).toBeVisible();
    await expect(historyDialog.getByText('总花费:')).toBeVisible();

    await historyDialog.getByTitle('删除').click();
    await expect(page.getByText('采购记录已删除')).toBeVisible();
    await expect(historyDialog.getByText('暂无采购记录')).toBeVisible();

    await historyDialog.getByRole('button', { name: '关闭', exact: true }).first().click();
    await expect(row.getByRole('cell', { name: '5' })).toBeVisible();
  });

  test('支持编辑和删除线材', async ({ appPage: page }) => {
    await goToThreads(page);

    await createThread(page, {
      colorNo: '3001',
      brand: 'Madeira',
      colorName: '浅紫',
      quantity: 4,
      minStock: 1,
      notes: '待修改',
    });

    const row = getThreadRow(page, '3001');
    await row.getByTitle('编辑').click();

    await page.locator('#tf-colorName').fill('深紫');
    await page.locator('#tf-minStock-edit').fill('6');
    await page.locator('#tf-notes').fill('已更新');
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('线材信息已更新')).toBeVisible();
    await expect(row.getByRole('cell', { name: '深紫' })).toBeVisible();
    await expect(row.getByText('偏低')).toBeVisible();

    await row.getByTitle('删除').click();
    await expect(page.getByText('确定要删除此线材吗？关联的采购记录也将一并删除。')).toBeVisible();
    await page.getByRole('button', { name: '删除' }).click();

    await expect(page.getByText('线材已删除')).toBeVisible();
    await expect(getThreadRow(page, '3001')).toHaveCount(0);
    await expect(page.getByText('暂无线材数据，点击"新增线材"添加第一条记录')).toBeVisible();
  });
});
