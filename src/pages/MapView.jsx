import { useRef, useState, useEffect } from 'react';
import useAtlasStore from '../store/useAtlasStore';
import useMapInteraction from '../hooks/useMapInteraction';
import MapControls from '../components/map/MapControls';
import ImportForm from '../components/map/ImportForm';
import Toast from '../components/Toast';
import './MapView.css';

/**
 * 地図表示画面のコンポーネント
 * ユーザーが訪れた国を視覚的に表示し、新しい訪問を記録できる
 */
function MapView() {
  const mapContainer = useRef(null);
  const [importOpen, setImportOpen] = useState(false);
  
  const { 
    toast,
    showToast,
    exportToCSV,
    importFromCSV
  } = useAtlasStore();
  
  // 地図操作のカスタムフック
  const { userLocation, flyToUserLocation } = useMapInteraction(mapContainer);
  
  // インポートフォーム送信処理
  const handleImportSubmit = (file) => {
    if (!file) {
      showToast('ファイルを選択してください', 'warning');
      return;
    }
    
    importFromCSV(file);
    setImportOpen(false);
  };
  
  // MapViewが表示されている間だけbodyにクラスを追加
  useEffect(() => {
    document.body.classList.add('map-view-active');
    // クリーンアップ関数：コンポーネントがアンマウントされた時にクラスを削除
    return () => {
      document.body.classList.remove('map-view-active');
    };
  }, []); // 空の依存配列で、マウント時とアンマウント時にのみ実行

  return (
    <div className="map-view">
      <div ref={mapContainer} className="map-container" />
      
      {/* 地図コントロール */}
      <MapControls
        onExportClick={exportToCSV}
        onImportClick={() => setImportOpen(true)}
        userLocation={userLocation}
        onLocationClick={flyToUserLocation}
      />
      
      {/* インポートフォーム */}
      <ImportForm
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSubmit={handleImportSubmit}
      />
      
      {/* トースト通知 */}
      <Toast 
        show={toast.show} 
        message={toast.message} 
        type={toast.type} 
      />
    </div>
  );
}

export default MapView;
