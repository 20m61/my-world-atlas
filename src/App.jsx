import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MapView from './pages/MapView'
import ListView from './pages/ListView'
import Header from './components/Header'
import './App.css'

function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/list" element={<ListView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
