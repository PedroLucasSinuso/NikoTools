import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/figtree'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Cache offline simples: depois da 1ª visita o leitor de PDF abre sem baixar tudo de novo.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
}
