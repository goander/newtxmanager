import { registerSW } from 'virtual:pwa-register';

registerSW({
  onNeedRefresh() {
    if (confirm('A new version is available. Reload now?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// at top of a module loaded on every page
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar on mobile
  e.preventDefault();
  deferredPrompt = e;
  // Expose a global (or state) flag to show your Install button
  window.dispatchEvent(new Event('pwa-install-available'));
});

// Helper to trigger prompt
export async function promptPWAInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null; // one-time use
  return outcome; // 'accepted' | 'dismissed'
}
