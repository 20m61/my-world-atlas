import React from 'react';
import useAtlasStore from '../../store/useAtlasStore';
import './MapPopup.css'; // ポップアップ用のCSSをインポート

function MapPopup({ placeInfo, onClose }) {
  const { markPlaceAsVisited } = useAtlasStore();

  const handleVisitClick = () => {
    if (!placeInfo) return;
    markPlaceAsVisited(placeInfo);
    if (onClose) {
      onClose(); // ポップアップを閉じる
    }
  };

  if (!placeInfo) return null;

  return (
    <div className="map-popup">
      <h3>{placeInfo.placeName}</h3>
      <button className="mark-visited-btn" onClick={handleVisitClick}>
        訪問済みにする
      </button>
    </div>
  );
}

export default MapPopup;