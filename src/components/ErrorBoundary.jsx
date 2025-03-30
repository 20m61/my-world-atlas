import React from 'react';

/**
 * エラーバウンダリコンポーネント
 * 子コンポーネントで発生したエラーをキャッチし、フォールバックUIを表示する
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // エラーが発生したらhasErrorをtrueに更新
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // エラー情報を状態に保存
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // エラーログを出力
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // カスタムのフォールバックUI
      return (
        <div className="error-boundary">
          <h2>問題が発生しました</h2>
          <p>申し訳ありませんが、何か問題が発生しています。</p>
          <p>ページの再読み込みをお試しください。</p>
          
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            ページを再読み込み
          </button>
          
          {this.props.showDetails && (
            <details className="error-details">
              <summary>エラーの詳細</summary>
              <p>{this.state.error && this.state.error.toString()}</p>
              <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }

    // エラーがなければ、子コンポーネントを描画
    return this.props.children;
  }
}

export default ErrorBoundary;
