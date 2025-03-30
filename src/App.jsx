import { Routes, Route, Navigate } from 'react-router-dom'
import MapView from './pages/MapView'
import ListView from './pages/ListView'
import Header from './components/Header'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

/**
 * アプリケーションルートコンポーネント
 * ルーティングとレイアウトの管理
 */
function App() {
  // 開発環境ではエラー詳細を表示、本番環境では非表示に設定
  const showErrorDetails = process.env.NODE_ENV === 'development';
  
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <ErrorBoundary showDetails={showErrorDetails}>
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/list" element={<ListView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default App
