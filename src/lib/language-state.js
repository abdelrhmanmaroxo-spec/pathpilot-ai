export const LANGUAGE_CHANGED_EVENT = 'pathpilot:language-changed';

export function normalizeLanguage(value) {
  return value === 'en' ? 'en' : 'ar';
}

export function getDocumentLanguage(documentRef = globalThis.document) {
  return normalizeLanguage(documentRef?.body?.dataset?.language);
}

export function subscribeLanguageChanges(
  onChange,
  target = globalThis.window,
  documentRef = globalThis.document,
) {
  if (typeof onChange !== 'function') {
    throw new TypeError('Language change subscriber must be a function.');
  }
  if (!target?.addEventListener || !target?.removeEventListener) return () => {};

  const handleLanguageChange = () => {
    onChange(getDocumentLanguage(documentRef));
  };

  target.addEventListener(LANGUAGE_CHANGED_EVENT, handleLanguageChange);
  return () => target.removeEventListener(LANGUAGE_CHANGED_EVENT, handleLanguageChange);
}
