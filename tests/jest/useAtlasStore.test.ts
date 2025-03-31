import useAtlasStore from '../../../src/store/useAtlasStore';

describe('useAtlasStore', () => {
  beforeEach(() => {
    // 必要に応じてストアのリセット
    useAtlasStore.setState({ error: null });
  });

  test('clearError アクションでエラーがクリアされる', () => {
    // エラー状態を設定
    useAtlasStore.setState({ error: 'テストエラー' });
    expect(useAtlasStore.getState().error).toBe('テストエラー');

    // clearError 呼び出し
    useAtlasStore.getState().clearError();
    expect(useAtlasStore.getState().error).toBeNull();
  });
});
