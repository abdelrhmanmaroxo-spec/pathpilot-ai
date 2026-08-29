function ensureAttribution() {
  const footerMeta = document.querySelector('.site-footer .footer-meta');
  if (!footerMeta || footerMeta.querySelector('[data-pathpilot-attribution="true"]')) return;

  const attribution = document.createElement('span');
  attribution.dataset.pathpilotAttribution = 'true';
  attribution.textContent = 'Built by Abdelrhman Essam';
  attribution.setAttribute('aria-label', 'Built by Abdelrhman Essam');
  footerMeta.prepend(attribution);
}

export function initAttribution() {
  ensureAttribution();

  const observer = new MutationObserver(() => ensureAttribution());
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('hashchange', () => {
    queueMicrotask(ensureAttribution);
  });
}
