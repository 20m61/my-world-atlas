/**
 * Mapの再読み込み回数を追跡するデバッグユーティリティ
 */
let reloadCount = 0;
let lastReloadTime = null;

export const trackMapReload = () => {
  reloadCount++;
  const now = new Date();
  const timeSinceLastReload = lastReloadTime ? now - lastReloadTime : null;

  console.log(`Map reload #${reloadCount} at ${now.toISOString()}`);
  if (lastReloadTime) {
    console.log(`Time since last reload: ${timeSinceLastReload}ms`);
  }

  // スタックトレースを表示してどこから呼ばれたかを確認
  console.log(new Error().stack);

  lastReloadTime = now;
};

export const resetTracker = () => {
  reloadCount = 0;
  lastReloadTime = null;
};
