import { parseTitle, buildIndex, tagCounts, splitTags, composeTitle } from './search.js';
import { t, localize } from './i18n.js';

localize();
const $ = (id) => document.getElementById(id);
const titleEl = $('title'), input = $('tag-input'), box = $('tagbox'), suggestEl = $('suggest');
const statusEl = $('status'), hintEl = $('hint'), saveBtn = $('save'), removeBtn = $('remove');

let tags = [];
let allTags = [];

function setStatus(msg, err = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle('err', err);
  hintEl.classList.toggle('hidden', !!msg);
}

function renderChips() {
  box.querySelectorAll('.chip').forEach((c) => c.remove());
  for (const tag of tags) {
    const c = document.createElement('span');
    c.className = 'chip';
    c.textContent = '#' + tag;
    const x = document.createElement('button');
    x.className = 'x'; x.type = 'button'; x.textContent = '×'; x.title = t('remove');
    x.addEventListener('click', () => { tags = tags.filter((v) => v !== tag); renderChips(); renderSuggest(); input.focus(); });
    c.appendChild(x);
    box.insertBefore(c, input);
  }
}

function renderSuggest() {
  const q = input.value.replace(/^#/, '').trim().toLowerCase();
  const have = new Set(tags.map((x) => x.toLowerCase()));
  const list = allTags
    .filter((e) => !have.has(e.tag.toLowerCase()) && (!q || e.tag.toLowerCase().includes(q)))
    .slice(0, 8);
  suggestEl.querySelectorAll('button').forEach((b) => b.remove());
  suggestEl.classList.toggle('hidden', !list.length);
  for (const e of list) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip';
    b.textContent = '#' + e.tag;
    b.addEventListener('click', () => { addTags([e.tag]); input.value = ''; renderSuggest(); input.focus(); });
    suggestEl.appendChild(b);
  }
  return list;
}

function addTags(list) {
  for (const tag of list) if (!tags.some((v) => v.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  renderChips();
}

function commitInput() {
  const parts = splitTags(input.value);
  if (parts.length) addTags(parts);
  input.value = '';
  renderSuggest();
}

box.addEventListener('click', () => input.focus());
input.addEventListener('input', () => {
  if (/[\s,，、;；]$/.test(input.value)) commitInput(); else renderSuggest();
});

// 取得要存的分頁（點圖示或 Alt+Shift+B 都會授與 activeTab）
// ?tabId= 讓獨立視窗（或自動化測試）指定分頁
const tabIdParam = new URLSearchParams(location.search).get('tabId');
let tab = tabIdParam ? await chrome.tabs.get(Number(tabIdParam)).catch(() => null) : null;
if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (!tab || !tab.url) {
  $('host').textContent = t('noTab');
  [saveBtn, titleEl, input].forEach((el) => { el.disabled = true; });
} else {
  let host = tab.url;
  try { host = new URL(tab.url).host || tab.url; } catch (e) { /* keep raw */ }
  $('host').textContent = host;
  $('fav').textContent = (host.replace(/^www\./, '')[0] || '#').toUpperCase();

  const [tree, found] = await Promise.all([chrome.bookmarks.getTree(), chrome.bookmarks.search({ url: tab.url }).catch(() => [])]);
  allTags = tagCounts(buildIndex(tree));
  // 同網址已有書籤時，編輯它的 tag 而不是重複新增
  const existing = found[0];
  const parsed = existing ? parseTitle(existing.title) : { bare: tab.title || '', tags: [] };
  if (existing) {
    $('note').classList.remove('hidden');
    saveBtn.textContent = t('update');
    removeBtn.classList.remove('hidden');
  }
  titleEl.value = parsed.bare;
  tags = [...parsed.tags];
  renderChips();
  renderSuggest();
  input.focus();

  async function save() {
    commitInput();
    const title = composeTitle(titleEl.value || parsed.bare || tab.title || tab.url, tags);
    try {
      if (existing) await chrome.bookmarks.update(existing.id, { title });
      else await chrome.bookmarks.create({ title, url: tab.url }); // 預設存到「其他書籤」
      setStatus(t('saved'));
      setTimeout(() => window.close(), 600);
    } catch (e) {
      setStatus(t('saveFailed', e.message), true);
    }
  }

  saveBtn.addEventListener('click', save);
  removeBtn.addEventListener('click', async () => {
    if (!existing) return;
    await chrome.bookmarks.remove(existing.id);
    setStatus(t('removed'));
    setTimeout(() => window.close(), 600);
  });
  input.addEventListener('keydown', (e) => {
    if (e.isComposing) return; // 中文輸入法選字中，不要攔 Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      save(); // 打完標籤直接 Enter 就存
    } else if (e.key === 'Tab' && input.value.trim()) {
      const first = renderSuggest()[0];
      if (first) { e.preventDefault(); addTags([first.tag]); input.value = ''; renderSuggest(); }
    } else if (e.key === 'Backspace' && !input.value && tags.length) {
      tags.pop(); renderChips(); renderSuggest();
    }
  });
  titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); save(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save(); });
}
