import { test, expect } from './fixtures';

test.describe('侧边栏导航', () => {
  test('应用加载后显示侧边栏和订单管理页', async ({ appPage: page }) => {
    await expect(page.locator('text=绣花厂订单管理')).toBeVisible();
    await expect(page.locator('h2:text("订单管理")')).toBeVisible();
    await expect(page.locator('text=管理所有绣花订单')).toBeVisible();
  });

  test('点击各导航菜单跳转正确页面', async ({ appPage: page }) => {
    const navTests = [
      { label: '客户管理', heading: '客户管理' },
      { label: '生产管理', heading: '生产管理' },
      { label: '线材库存', heading: '线材库存' },
      { label: '收款对账', heading: '收款对账' },
      { label: '工人工资', heading: '工人工资' },
      { label: '系统设置', heading: '系统设置' },
      { label: '订单管理', heading: '订单管理' },
    ];

    for (const { label, heading } of navTests) {
      await page.locator(`nav >> text="${label}"`).click();
      await expect(page.locator(`h2:text("${heading}")`)).toBeVisible();
    }
  });

  test('侧边栏高亮当前活跃路由', async ({ appPage: page }) => {
    const orderLink = page.locator('nav a', { hasText: '订单管理' });
    await expect(orderLink).toHaveClass(/bg-sidebar-accent/);

    await page.locator('nav >> text="客户管理"').click();
    const customerLink = page.locator('nav a', { hasText: '客户管理' });
    await expect(customerLink).toHaveClass(/bg-sidebar-accent/);

    await page.locator('nav >> text="线材库存"').click();
    const threadLink = page.locator('nav a', { hasText: '线材库存' });
    await expect(threadLink).toHaveClass(/bg-sidebar-accent/);
  });

  test('页面底部显示版本号', async ({ appPage: page }) => {
    await expect(page.locator('text=v0.1.0')).toBeVisible();
  });
});
