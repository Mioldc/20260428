import { test, expect, expectCellVisible } from './fixtures';

test.describe('工人管理', () => {
  test('初始空状态显示提示', async ({ appPage: page }) => {
    await page.locator('nav >> text="工人工资"').click();
    await expect(page.getByRole('heading', { name: '工人工资' })).toBeVisible();
    await expect(page.getByText('暂无工人')).toBeVisible();
  });

  test('添加长工', async ({ appPage: page }) => {
    await page.locator('nav >> text="工人工资"').click();

    await page.getByRole('button', { name: '添加工人' }).click();
    await expect(page.getByText('填写工人基本信息')).toBeVisible();

    await page.locator('#wName').fill('张师傅');
    await page.locator('#wSalary').fill('5000');
    await page.locator('#wPhone').fill('13900139000');

    await page.getByRole('button', { name: '保存' }).click();

    await expectCellVisible(page, '张师傅');
  });

  test('添加临时工', async ({ appPage: page }) => {
    await page.locator('nav >> text="工人工资"').click();

    await page.getByRole('button', { name: '添加工人' }).click();
    await page.locator('#wName').fill('李临时');
    await page.locator('#wType').selectOption('临时工');

    await page.locator('#wDayRate').fill('200');
    await page.locator('#wNightRate').fill('250');

    await page.getByRole('button', { name: '保存' }).click();

    await expectCellVisible(page, '李临时');
  });

  test('编辑工人信息', async ({ appPage: page }) => {
    await page.locator('nav >> text="工人工资"').click();

    await page.getByRole('button', { name: '添加工人' }).click();
    await page.locator('#wName').fill('编辑工人');
    await page.getByRole('button', { name: '保存' }).click();
    await expectCellVisible(page, '编辑工人');

    await page.getByTitle('编辑').click();
    await expect(page.getByText('修改工人信息')).toBeVisible();
    await page.locator('#wName').fill('已修改工人');
    await page.getByRole('button', { name: '保存' }).click();

    await expectCellVisible(page, '已修改工人');
  });

  test('删除工人', async ({ appPage: page }) => {
    await page.locator('nav >> text="工人工资"').click();

    await page.getByRole('button', { name: '添加工人' }).click();
    await page.locator('#wName').fill('将删除工人');
    await page.getByRole('button', { name: '保存' }).click();
    await expectCellVisible(page, '将删除工人');

    await page.getByTitle('删除').click();
    await expect(page.getByText('确定要删除此工人吗')).toBeVisible();
    await page.getByRole('button', { name: '删除' }).click();

    await expect(page.getByText('暂无工人')).toBeVisible({ timeout: 10_000 });
  });

  test('工人姓名为空显示错误', async ({ appPage: page }) => {
    await page.locator('nav >> text="工人工资"').click();
    await page.getByRole('button', { name: '添加工人' }).click();
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('请输入工人姓名')).toBeVisible();
  });

  test('标签页切换 - 长工工资和临时工汇总', async ({ appPage: page }) => {
    await page.locator('nav >> text="工人工资"').click();

    await page.getByRole('button', { name: '长工工资' }).click();
    await expect(page.getByText('应发总额')).toBeVisible();
    await expect(page.getByRole('button', { name: '生成本月工资' })).toBeVisible();

    await page.getByRole('button', { name: '临时工汇总' }).click();
    await expect(page.getByText('应付总额')).toBeVisible();
  });

  test('出勤录入链接可用', async ({ appPage: page }) => {
    await page.locator('nav >> text="工人工资"').click();
    await page.getByRole('link', { name: '出勤录入' }).click();
    await expect(page).toHaveURL(/\/workers\/attendance/);
  });
});
