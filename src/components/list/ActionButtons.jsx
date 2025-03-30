import React from 'react';

/**
 * アクションボタンコンポーネント
 * @param {Function} onExportClick - エクスポートボタンクリック時のコールバック
 * @param {Function} onImportClick - インポートボタンクリック時のコールバック
 */
const ActionButtons = ({ onExportClick, onImportClick }) => {
  return (
    <div className="action-buttons">
      <button 
        className="btn btn-sm"
        onClick={onExportClick}
        aria-label="CSVエクスポート"
      >
        エクスポート
      </button>
      <button 
        className="btn btn-sm"
        onClick={onImportClick}
        aria-label="CSVインポート"
      >
        インポート
      </button>
    </div>
  );
};

export default ActionButtons;
