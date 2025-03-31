import { test, expect } from '@playwright/test';

test('地図がズームイン・アウトできること', async ({ page }) => {
  await page.goto('/');

  // 地図が表示されるのを待つ
  const mapContainer = page.locator('.maplibregl-map');
  await expect(mapContainer).toBeVisible();

  // ズームインボタンが表示されるのを待機
  await page.waitForSelector('.maplibregl-ctrl-zoom-in');
  const zoomInButton = page.locator('.maplibregl-ctrl-zoom-in');
  await zoomInButton.click();

  // ズームアウトボタンが表示されるのを待機
  await page.waitForSelector('.maplibregl-ctrl-zoom-out');
  const zoomOutButton = page.locator('.maplibregl-ctrl-zoom-out');
  await zoomOutButton.click();
});

test('地図上のマーカーをクリックすると情報が表示されること', async ({
  page,
}) => {
  await page.goto('/');

  // 地図が表示されるのを待つ
  const mapContainer = page.locator('.maplibregl-map');
  await expect(mapContainer).toBeVisible();

  // マーカーの待機処理（必要に応じてタイムアウトを延長）
  await page.waitForSelector('.map-marker', { timeout: 10000 });
  const marker = page.locator('.map-marker').first();
  await expect(marker).toBeVisible({ timeout: 10000 });

  // マーカーをクリック
  await marker.click();

  // ポップアップが表示されることを確認
  const popup = page.locator('.maplibregl-popup');
  await expect(popup).toBeVisible();

  // ポップアップに情報が含まれていることを確認
  await expect(popup).toContainText(/[情報|名称|詳細]/);
});
