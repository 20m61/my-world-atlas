import React from 'react';

const MapControls = ({ onExportClick, onImportClick, userLocation, onLocationClick }) => {
  return (
    <div className="map-controls">
      <button 
        className="map-control-button"
        onClick={onExportClick}
        title="CSVエクスポート"
      >
        <span className="material-icons">file_download</span>
      </button>
      
      <button 
        className="map-control-button"
        onClick={onImportClick}
        title="CSVインポート"
      >
        <span className="material-icons">file_upload</span>
      </button>
      
      {userLocation && (
        <button 
          className="map-control-button"
          onClick={onLocationClick}
          title="現在地へ移動"
        >
          <span className="material-icons">my_location</span>
        </button>
      )}
    </div>
  );
};

export default MapControls;
