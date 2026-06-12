import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  try {
    const registration = await navigator.serviceWorker.register(`/sw.js?v=${__APP_VERSION__}`);

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      });
    });

    if (registration.waiting && navigator.serviceWorker.controller) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) registration.update();
    });
  } catch {
    // Service worker optional — app tetap jalan tanpa PWA cache
  }
};

window.addEventListener('load', registerServiceWorker);
