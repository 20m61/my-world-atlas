import { test, expect } from '@jest/globals';

test('ナビゲーションメニューが機能すること', async ({ page }) => {
  await page.goto('/');

  // Aboutリンクが表示されるのを待機
  await page.waitForSelector('a', { hasText: /about/i });
  const aboutLink = page.getByRole('link', { name: /about/i });
  await aboutLink.click();

  // URLが変更されたことを確認
  await expect(page).toHaveURL(/.*about/);

  // ページ内容が変更されたことを確認
  const aboutContent = page.locator('main');
  await expect(aboutContent).toBeVisible();
});

test('モバイルでハンバーガーメニューが機能すること', async ({ page }) => {
  // モバイルサイズに設定
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  // ハンバーガーメニューが表示されるのを待機
  await page.waitForSelector('button.hamburger-menu');
  const menuButton = page.locator('button.hamburger-menu');
  await menuButton.click();

  // メニューが表示されることを確認
  await page.waitForSelector('nav.mobile-menu');
  const mobileMenu = page.locator('nav.mobile-menu');
  await expect(mobileMenu).toBeVisible();

  // メニュー内のリンクをクリック
  const mobileAboutLink = mobileMenu.getByRole('link', { name: /about/i });
  await mobileAboutLink.click();

  // URLが変更されたことを確認
  await expect(page).toHaveURL(/.*about/);
});
