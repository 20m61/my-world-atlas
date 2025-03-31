import { test, expect } from '@playwright/test';

test('ホームページが正しく表示されること', async ({ page }) => {
  await page.goto('/');

  // タイトルを確認
  await expect(page).toHaveTitle(/World Atlas/);

  // ヘッダーが存在することを確認
  const header = page.locator('header');
  await expect(header).toBeVisible();
});

test('地図検索機能が動作すること', async ({ page }) => {
  await page.goto('/');

  // 検索ボックスが表示されるのを待機
  await page.waitForSelector('input[placeholder="国名を入力"]');
  await page.fill('input[placeholder="国名を入力"]', '日本');
  await page.click('button[type="submit"]');

  // 検索結果が表示されることを確認
  const results = page.locator('.search-results');
  await expect(results).toBeVisible();
  await expect(results).toContainText('日本');
});
