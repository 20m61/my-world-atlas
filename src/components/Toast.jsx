import { useEffect } from 'react';
import './Toast.css';

function Toast({ show, message, type = 'info', onClose }) {
  useEffect(() => {
    if (show) {
      // 3秒後に自動で閉じる
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className={`toast ${type} ${show ? 'show' : ''}`}>
      <p>{message}</p>
    </div>
  );
}

export default Toast;
