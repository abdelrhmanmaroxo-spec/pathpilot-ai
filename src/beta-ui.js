const BETA_STYLE_ID = 'pathpilot-beta-style';

function language() {
  return document.body?.dataset?.language === 'en' ? 'en' : 'ar';
}

function ensureStyles() {
  if (document.getElementById(BETA_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BETA_STYLE_ID;
  style.textContent = `
    .pathpilot-beta-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-inline-start: .45rem;
      padding: .14rem .46rem;
      border: 1px solid rgba(76, 201, 240, .38);
      border-radius: 999px;
      background: rgba(76, 201, 240, .10);
      color: #8ee8ff;
      font-size: .62rem;
      font-weight: 800;
      letter-spacing: .08em;
      vertical-align: middle;
    }
    .pathpilot-beta-note {
      opacity: .86;
    }
  `;
  document.head.appendChild(style);
}

function addBetaBadges() {
  const targetLanguage = language();
  document.querySelectorAll('.brand strong').forEach((brand) => {
    let badge = brand.parentElement?.querySelector('.pathpilot-beta-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'pathpilot-beta-badge';
      badge.textContent = 'BETA';
      brand.insertAdjacentElement('afterend', badge);
    }
    badge.title = targetLanguage === 'en'
      ? 'PathPilot is a beta product under active development and continuous improvement.'
      : 'PathPilot نسخة تجريبية قيد التطوير والتحسين المستمر';
  });
}

function updateLandingNote() {
  const targetLanguage = language();
  document.querySelectorAll('.local-ai-note').forEach((note) => {
    note.classList.add('pathpilot-beta-note');
    note.textContent = targetLanguage === 'en'
      ? '🧪 PathPilot Beta: uses web research and live AI when available, with resilient local fallback when services are unavailable.'
      : '🧪 PathPilot Beta: يستخدم بحث ويب وذكاء AI حي عندما تكون الخدمات متاحة، مع وضع احتياطي عند التعطل.';
  });
}

function updateResultLabels() {
  document.querySelectorAll('.result-card').forEach((card) => {
    const label = card.querySelector('.result-head small');
    if (!label) return;
    const text = card.textContent || '';
    if (/PathPilot Research Beta|نتيجة مدعومة ببحث ويب/.test(text)) {
      label.textContent = /تم تركيب الإجابة بواسطة|تم تحليل الأدلة/.test(text)
        ? 'Web Research + AI · Beta'
        : 'Web Research · Beta';
      return;
    }
    if (/AI مباشر|AI احتياطي|رد AI/.test(text)) {
      label.textContent = 'Live AI fallback · Beta';
      return;
    }
    if (/وضع احتياطي|تعذر الوصول إلى البحث والذكاء/.test(text)) {
      label.textContent = 'Local fallback · Beta';
    }
  });
}

function refreshBetaUi() {
  ensureStyles();
  addBetaBadges();
  updateLandingNote();
  updateResultLabels();
}

let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    refreshBetaUi();
  });
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    refreshBetaUi();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-language'],
    });
  }, { once: true });
} else {
  refreshBetaUi();
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-language'],
  });
}
