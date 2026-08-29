import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AccountExperience from './AccountExperience.jsx';
import ConversationExperience from './ConversationExperience.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import UpdateBanner from './UpdateBanner.jsx';
import { initAttribution } from './lib/attribution.js';
import { initLanguageSwitch } from './lib/i18n.js';
import { initI18nOverrides } from './lib/i18n-overrides.js';
import { initI18nRuntimeHardening } from './lib/i18n-runtime-hardening.js';
import './styles.css';
import './premium-ui.css';
import './feature-ui.css';
import './command-palette.css';
import './i18n.css';
import './account-experience.css';
import './conversation-experience.css';
import './chat-experience.css';

function initLanguageEventBridge() {
  const body = document.body;
  if (!body) return;
  let lastLanguage = body.dataset.language === 'en' ? 'en' : 'ar';
  const announce = () => {
    const language = body.dataset.language === 'en' ? 'en' : 'ar';
    if (language === lastLanguage) return;
    lastLanguage = language;
    window.dispatchEvent(new CustomEvent('pathpilot:language-changed', { detail: { language } }));
  };
  const observer = new MutationObserver(announce);
  observer.observe(body, { attributes: true, attributeFilter: ['data-language'] });
}

initLanguageEventBridge();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <AccountExperience />
      <ConversationExperience />
      <UpdateBanner />
    </ErrorBoundary>
  </StrictMode>,
);

initLanguageSwitch();
initI18nOverrides();
initI18nRuntimeHardening();
initAttribution();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const announceWaitingWorker = (worker) => {
      if (!worker) return;
      window.dispatchEvent(new CustomEvent('pathpilot:update-ready', { detail: { worker } }));
    };

    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        registration.update();
        announceWaitingWorker(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) announceWaitingWorker(worker);
          });
        });
      })
      .catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
  });
}
