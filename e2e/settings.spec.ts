import { test, expect, expectCellVisible } from './fixtures';

test.describe('系统设置 - 机台管理', () => {
  test('初始空状态显示提示', async ({ appPage: page }) => {
    await page.locator('nav >> text="系统设置"').click();
    await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible();
    await expect(page.getByText('暂无机台')).toBeVisible();
  });

  test('添加机台', async ({ appPage: page }) => {
    await page.locator('nav >> text="系统设置"').click();

    await page.getByRole('button', { name: '添加机台' }).click();
    await expect(page.getByText('填写机台基本信息')).toBeVisible();

    await page.locator('#machineName').fill('1号机');
    await page.locator('#machineModel').fill('田岛TMCE');
    await page.locator('#headCount').fill('6');

    await page.getByRole('button', { name: '保存' }).click();

    await expectCellVisible(page, '1号机');
    await expectCellVisible(page, '田岛TMCE');
  });

  test('编辑机台', async ({ appPage: page }) => {
    await page.locator('nav >> text="系统设置"').click();

    await page.getByRole('button', { name: '添加机台' }).click();
    await page.locator('#machineName').fill('编辑测试机');
    await page.getByRole('button', { name: '保存' }).click();
    await expectCellVisible(page, '编辑测试机');

    await page.getByTitle('编辑').click();
    await expect(page.getByText('修改机台信息')).toBeVisible();
    await page.locator('#machineName').fill('已修改机台');
    await page.locator('#machineStatus').selectOption('维修');
    await page.getByRole('button', { name: '保存' }).click();

    await expectCellVisible(page, '已修改机台');
  });

  test('删除机台', async ({ appPage: page }) => {
    await page.locator('nav >> text="系统设置"').click();

    await page.getByRole('button', { name: '添加机台' }).click();
    await page.locator('#machineName').fill('将删除机台');
    await page.getByRole('button', { name: '保存' }).click();
    await expectCellVisible(page, '将删除机台');

    await page.getByTitle('删除').click();
    await expect(page.getByText('确定要删除此机台吗')).toBeVisible();
    await page.getByRole('button', { name: '删除' }).click();

    await expect(page.getByText('暂无机台')).toBeVisible({ timeout: 10_000 });
  });

  test('机台名称为空显示错误', async ({ appPage: page }) => {
    await page.locator('nav >> text="系统设置"').click();
    await page.getByRole('button', { name: '添加机台' }).click();
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('请输入机台名称')).toBeVisible();
  });
});

test.describe('系统设置 - 密码和备份', () => {
  test('密码设置区域可见', async ({ appPage: page }) => {
    await page.locator('nav >> text="系统设置"').click();
    await expect(page.getByText('启动密码', { exact: true })).toBeVisible();
    await expect(page.getByText('未设置启动密码')).toBeVisible({ timeout: 10_000 });
  });

  test('备份区域可见', async ({ appPage: page }) => {
    await page.locator('nav >> text="系统设置"').click();
    await expect(page.getByText('数据备份', { exact: true })).toBeVisible();
    await expect(page.getByText('一键备份')).toBeVisible();
    await expect(page.getByText('从备份恢复')).toBeVisible();
  });
});
