import React from 'react';
import './ConfirmDialog.css';

/**
 * 確認ダイアログコンポーネント
 * @param {boolean} isOpen - ダイアログを表示するかどうか
 * @param {string} title - ダイアログのタイトル
 * @param {string} message - 確認メッセージの内容
 * @param {string} confirmText - 確認ボタンのテキスト
 * @param {string} cancelText - キャンセルボタンのテキスト
 * @param {Function} onConfirm - 確認時のコールバック
 * @param {Function} onCancel - キャンセル時のコールバック
 */
const ConfirmDialog = ({ 
  isOpen, 
  title = '確認', 
  message, 
  confirmText = '確認', 
  cancelText = 'キャンセル',
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;
  
  // 背景クリックでのキャンセルを防止
  const handleDialogClick = (e) => {
    e.stopPropagation();
  };
  
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={handleDialogClick}>
        <div className="confirm-header">
          <h3>{title}</h3>
        </div>
        
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        
        <div className="confirm-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className="btn btn-danger" 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
