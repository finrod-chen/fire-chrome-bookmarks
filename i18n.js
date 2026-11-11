// 把 data-i18n / data-i18n-placeholder / data-i18n-title 套上目前語系的字串
export const t = (k, ...a) => chrome.i18n.getMessage(k, a) || k;
export function localize(root = document) {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}
