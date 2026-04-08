import { test, expect, expectCellVisible, expectCellHidden } from './fixtures';

test.describe('客户管理', () => {
  test('初始空状态显示提示', async ({ appPage: page }) => {
    await page.locator('nav >> text="客户管理"').click();
    await expect(page.getByRole('heading', { name: '客户管理' })).toBeVisible();
    await expect(page.getByText('暂无客户数据')).toBeVisible();
  });

  test('新建客户完整流程', async ({ appPage: page }) => {
    await page.locator('nav >> text="客户管理"').click();

    await page.getByRole('button', { name: '新建客户' }).click();
    await expect(page.getByText('填写客户基本信息')).toBeVisible();

    await page.locator('#name').fill('测试服装厂');
    await page.locator('#contactPerson').fill('张三');
    await page.locator('#phone').fill('13800138000');
    await page.locator('#address').fill('广东省广州市');

    await page.getByRole('button', { name: '保存' }).click();

    await expectCellVisible(page, '测试服装厂');
    await expectCellVisible(page, '张三');
    await expectCellVisible(page, '13800138000');
  });

  test('编辑客户信息', async ({ appPage: page }) => {
    await page.locator('nav >> text="客户管理"').click();

    await page.getByRole('button', { name: '新建客户' }).click();
    await page.locator('#name').fill('编辑测试厂');
    await page.getByRole('button', { name: '保存' }).click();
    await expectCellVisible(page, '编辑测试厂');

    await page.getByTitle('编辑').click();
    await expect(page.getByText('修改客户信息')).toBeVisible();
    await page.locator('#name').fill('已修改服装厂');
    await page.getByRole('button', { name: '保存' }).click();

    await expectCellVisible(page, '已修改服装厂');
  });

  test('删除客户', async ({ appPage: page }) => {
    await page.locator('nav >> text="客户管理"').click();

    await page.getByRole('button', { name: '新建客户' }).click();
    await page.locator('#name').fill('将删除客户');
    await page.getByRole('button', { name: '保存' }).click();
    await expectCellVisible(page, '将删除客户');

    await page.getByTitle('删除').click();
    await expect(page.getByText('确定要删除此客户吗')).toBeVisible();
    await page.getByRole('button', { name: '删除' }).click();

    await expect(page.getByText('暂无客户数据')).toBeVisible({ timeout: 10_000 });
  });

  test('搜索客户', async ({ appPage: page }) => {
    await page.locator('nav >> text="客户管理"').click();

    await page.getByRole('button', { name: '新建客户' }).click();
    await page.locator('#name').fill('苹果服装');
    await page.getByRole('button', { name: '保存' }).click();
    await expectCellVisible(page, '苹果服装');

    await page.getByRole('button', { name: '新建客户' }).click();
    await page.locator('#name').fill('橘子纺织');
    await page.getByRole('button', { name: '保存' }).click();
    await expectCellVisible(page, '橘子纺织');

    await page.getByPlaceholder('搜索客户名称/电话...').fill('苹果');
    await expectCellVisible(page, '苹果服装');
    await expectCellHidden(page, '橘子纺织');

    await page.getByPlaceholder('搜索客户名称/电话...').fill('');
    await expectCellVisible(page, '橘子纺织');
  });

  test('新建客户时名称为空显示错误', async ({ appPage: page }) => {
    await page.locator('nav >> text="客户管理"').click();
    await page.getByRole('button', { name: '新建客户' }).click();
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('请输入客户名称')).toBeVisible();
  });
});
