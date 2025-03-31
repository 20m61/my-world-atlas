import { trackMapReload } from '../utils/debugUtils';

// マップが読み込まれる直前に追加
useEffect(() => {
  trackMapReload();
  // cleanup関数
  return () => {
    console.log('Map component unmounted');
  };
}, []); // 空の依存配列でマウント時のみ実行

// データ依存の効果がある場合は、その依存関係をログに残す
useEffect(() => {
  console.log('Map data dependencies changed:', {
    // 依存するデータをここに列挙
    // 例: mapId, dataVersion, selectedRegion など
  });
}, [/* 依存配列をここに記載 */]);

// イベントリスナーの登録と削除を適切に管理
useEffect(() => {
  const handleEvent = () => {
    // イベントハンドラーの内容
    console.log('Map event triggered');
  };
  
  // イベントリスナーを一度だけ登録
  console.log('Registering map event listeners');
  mapElement.addEventListener('someEvent', handleEvent);
  
  // クリーンアップ関数でリスナーを削除
  return () => {
    console.log('Removing map event listeners');
    mapElement.removeEventListener('someEvent', handleEvent);
  };
}, [/* 依存配列 */]);
