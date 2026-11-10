import { parseTitle, buildIndex, search } from './search.js';

const params = new URLSearchParams(location.search);
const q = params.get('q');
const list = document.getElementById('list');
const searchMode = document.getElementById('search-mode');
const addMode = document.getElementById('add-mode');

if (q != null) {
  // 完整結果模式：由 omnibox 按 Enter 開啟
  addMode.classList.add('hidden');
  searchMode.classList.remove('hidden');
  document.title = '書籤：' + q;
  document.getElementById('q').textContent = q;
  const index = buildIndex(await chrome.bookmarks.getTree());
  const hits = search(index, q, 50);
  if (!hits.length) {
    list.innerHTML = '<p class="empty">沒有符合的書籤。換個關鍵字，或先用 Alt+Shift+B 幫頁面加上 tag？</p>';
  }
  let selected = -1;
  hits.forEach((h) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = h.url;
    a.textContent = h.bare || '(無標題)';
    li.appendChild(a);
    if (h.tags.length) {
      const tags = document.createElement('span');
      tags.className = 'tags';
      tags.textContent = h.tags.map((t) => '#' + t).join(' ');
      li.appendChild(tags);
    }
    const url = document.createElement('div');
    url.className = 'url';
    url.textContent = h.url;
    li.appendChild(url);
    list.appendChild(li);
  });
  function setSelected(i) {
    selected = Math.max(0, Math.min(hits.length - 1, i));
    [...list.children].forEach((el, j) => el.classList.toggle('selected', j === selected));
    list.children[selected]?.scrollIntoView({ block: 'nearest' });
  }
  if (hits.length) setSelected(0);
  document.addEventListener('keydown', (e) => {
    if (!hits.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(selected + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(selected - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[selected];
      if (e.altKey || e.metaKey) window.open(hit.url, '_blank');
      else location.href = hit.url;
    }
  });
} else {
  // 新增書籤模式
  const titleEl = document.getElementById('page-title');
  const tagsEl = document.getElementById('tags');
  const statusEl = document.getElementById('status');
  const saveBtn = document.getElementById('save');

  // 快捷鍵/視窗模式會帶 tabId；一般彈出視窗直接抓作用中分頁
  let tab = null;
  const tabId = params.has('tabId') ? Number(params.get('tabId')) : null;
  if (tabId != null) {
    try { tab = await chrome.tabs.get(tabId); } catch (e) { /* 分頁已關閉 */ }
  }
  if (!tab) {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  }

  if (!tab) {
    titleEl.textContent = '找不到作用中的分頁';
    saveBtn.disabled = true;
  } else {
    // 同網址已有書籤時，編輯它的 tag 而不是重複新增
    const existing = (await chrome.bookmarks.search({ url: tab.url }))[0];
    const parsed = existing ? parseTitle(existing.title) : { bare: tab.title || '', tags: [] };

    titleEl.textContent = parsed.bare || tab.url;
    tagsEl.value = parsed.tags.join(' ');
    tagsEl.focus();
    tagsEl.select();

    async function save() {
      const tags = [...new Set(
        tagsEl.value
          .split(/[\s,，、;；]+/)
          .map((t) => t.replace(/^#/, '').trim())
          .filter(Boolean)
      )];
      const title = tags.length
        ? parsed.bare + ' ' + tags.map((t) => '#' + t).join(' ')
        : parsed.bare;
      try {
        if (existing) {
          await chrome.bookmarks.update(existing.id, { title: title.trim() });
        } else {
          await chrome.bookmarks.create({ parentId: '2', title: title.trim(), url: tab.url }); // 2 = 其他書籤
        }
        statusEl.textContent = '已儲存 ✓';
        setTimeout(() => window.close(), 500);
      } catch (e) {
        statusEl.textContent = '儲存失敗：' + e.message;
      }
    }
    saveBtn.addEventListener('click', save);
    tagsEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  }
}
