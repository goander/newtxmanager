// src/pwa.js
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // stop Chrome’s mini-infobar
  e.preventDefault();
  deferredPrompt = e;
  // let the app know the prompt is available
  window.dispatchEvent(new Event('pwa-install-available'));
});

// Call this from your UI to show the native install prompt
export async function promptPWAInstall() {
  if (!deferredPrompt) return null;
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice; // { outcome: 'accepted' | 'dismissed' }
  deferredPrompt = null; // can only be used once
  return result?.outcome;
}
