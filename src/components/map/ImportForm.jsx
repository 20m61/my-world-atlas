import React, { useRef } from 'react';
import './ImportForm.css';

const ImportForm = ({ isOpen, onClose, onSubmit }) => {
  const fileInputRef = useRef(null);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const file = fileInputRef.current.files[0];
    onSubmit(file);
  };
  
  // Escキーでモーダルを閉じる
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  // モーダル外クリックで閉じる
  const handleOverlayClick = (e) => {
    if (e.target.className === 'import-overlay') {
      onClose();
    }
  };
  
  return (
    <div 
      className="import-overlay" 
      onClick={handleOverlayClick} 
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-title"
    >
      <div className="import-container">
        <h3 id="import-title">CSVファイルをインポート</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="csvFile">CSVファイルを選択</label>
            <input 
              type="file" 
              id="csvFile" 
              name="csvFile"
              ref={fileInputRef}
              accept=".csv" 
              required
              aria-required="true"
              aria-describedby="file-format-help"
            />
            <small id="file-format-help" className="form-text text-muted">
              My World Atlasのエクスポート形式に合わせたCSVファイルを選択してください
            </small>
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
            >
              インポート
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportForm;