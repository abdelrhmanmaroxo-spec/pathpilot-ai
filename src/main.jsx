import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AccountExperience from './AccountExperience.jsx';
import ConversationExperience from './ConversationExperience.jsx';
import { initAttribution } from './lib/attribution.js';
import { initLanguageSwitch } from './lib/i18n.js';
import { initI18nOverrides } from './lib/i18n-overrides.js';
import './styles.css';
import './i18n.css';
import './account-experience.css';
import './conversation-experience.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <AccountExperience />
    <ConversationExperience />
  </StrictMode>,
);

initLanguageSwitch();
initI18nOverrides();
initAttribution();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        registration.update();
        if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
  });
}
