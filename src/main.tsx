import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { refreshOfflineAuthorization, synchronizeOffline } from './services/offline/offline-sync.service'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('No se pudo registrar el modo PWA:', error)))
}

window.addEventListener('online', () => {
  void refreshOfflineAuthorization().then(() => synchronizeOffline()).catch(() => undefined)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
