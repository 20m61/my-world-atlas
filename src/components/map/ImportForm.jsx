import React from 'react';

const ImportForm = ({ isOpen, onClose, onSubmit }) => {
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const file = e.target.csvFile.files[0];
    onSubmit(file);
  };
  
  return (
    <div className="import-overlay">
      <div className="import-container">
        <h3>CSVファイルをインポート</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="csvFile">CSVファイルを選択</label>
            <input 
              type="file" 
              id="csvFile" 
              name="csvFile"
              accept=".csv" 
              required
            />
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
