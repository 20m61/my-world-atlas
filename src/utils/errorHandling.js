/**
 * エラー処理のユーティリティ関数
 */

/**
 * エラーをフォーマットしてユーザーに表示するためのメッセージを生成
 * @param {Error} error - 発生したエラーオブジェクト
 * @param {string} defaultMessage - デフォルトのメッセージ
 * @returns {string} - ユーザーに表示するエラーメッセージ
 */
export const formatErrorMessage = (error, defaultMessage = 'エラーが発生しました') => {
  if (!error) return defaultMessage;
  
  // エラーの種類によって適切なメッセージを返す
  if (error.name === 'TypeError') {
    return '値の型に問題があります。入力内容を確認してください。';
  }
  
  if (error.name === 'SyntaxError') {
    return 'データの形式が正しくありません。';
  }
  
  if (error.name === 'NetworkError' || error.message.includes('network')) {
    return 'ネットワークに接続できませんでした。インターネット接続を確認してください。';
  }
  
  if (error.message.includes('permission') || error.message.includes('denied')) {
    return 'アクセス権限がありません。';
  }
  
  // IndexedDBエラー
  if (error.name === 'QuotaExceededError') {
    return 'ストレージの容量が不足しています。不要なデータを削除してください。';
  }
  
  if (error.name === 'VersionError') {
    return 'アプリケーションのバージョンに問題があります。ページをリロードしてください。';
  }
  
  // その他のエラー
  return error.message || defaultMessage;
};

/**
 * アプリケーションで発生したエラーをログに記録
 * @param {Error} error - 発生したエラー
 * @param {Object} contextData - エラー発生時のコンテキスト情報
 */
export const logError = (error, contextData = {}) => {
  // 開発環境では詳細なエラー情報をコンソールに出力
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.name,
      context: contextData
    });
  } else {
    // 本番環境では最小限の情報だけをコンソールに出力
    console.error(`Error: ${error.message || 'Unknown error'}`);
    
    // TODO: 本番環境では実際のエラー監視サービスに送信する実装を追加
    // 例: Sentry, LogRocket, Google Analytics などのエラー監視サービス
  }
};

/**
 * 安全に関数を実行するためのラッパー
 * @param {Function} fn - 実行する関数
 * @param {Function} onError - エラー発生時のコールバック関数
 * @returns {Function} - エラーハンドリングされた関数
 */
export const withErrorHandling = (fn, onError) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, { arguments: args });
      
      if (typeof onError === 'function') {
        onError(error);
      }
      
      return null;
    }
  };
};
