import { buildIndex, search, tagCounts } from './search.js';
import { t, localize } from './i18n.js';

localize();
const $ = (id) => document.getElementById(id);
const qEl = $('q'), list = $('list'), empty = $('empty'), countEl = $('count'), tagsEl = $('tags');

let index = [];
let hits = [];
let selected = -1;

async function load() {
  index = buildIndex(await chrome.bookmarks.getTree());
}

function setSelected(i) {
  if (!hits.length) return;
  selected = Math.max(0, Math.min(hits.length - 1, i));
  [...list.children].forEach((el, j) => el.classList.toggle('selected', j === selected));
  list.children[selected]?.scrollIntoView({ block: 'nearest' });
}

function toggleTag(tag) {
  const term = '#' + tag.toLowerCase();
  const parts = qEl.value.trim().split(/\s+/).filter(Boolean);
  const has = parts.some((p) => p.toLowerCase() === term);
  qEl.value = (has ? parts.filter((p) => p.toLowerCase() !== term) : [...parts, '#' + tag]).join(' ') + ' ';
  qEl.focus();
  render();
}

function chip(tag, extra) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'chip';
  b.textContent = '#' + tag;
  if (extra != null) { const n = document.createElement('span'); n.className = 'n'; n.textContent = extra; b.appendChild(n); }
  b.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); toggleTag(tag); });
  return b;
}

function render() {
  const q = qEl.value.trim();
  const active = new Set(q.toLowerCase().split(/\s+/).filter((p) => p.startsWith('#')).map((p) => p.slice(1)));
  document.title = q ? t('searchTitle') + ': ' + q : t('searchTitle');
  history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname);

  hits = q ? search(index, q, 200) : [...index].reverse().slice(0, 200).map((x) => ({ ...x }));
  countEl.textContent = t('resultCount', String(q ? hits.length : index.length));

  // 標籤雲：沒查詢時列全部，有查詢時列結果裡的標籤
  tagsEl.replaceChildren(...tagCounts(q ? hits : index).slice(0, 30).map((e) => {
    const c = chip(e.tag, e.count);
    if (active.has(e.tag.toLowerCase())) c.classList.add('active');
    return c;
  }));

  list.replaceChildren(...hits.map((h, i) => {
    const li = document.createElement('li');
    const row = document.createElement('div'); row.className = 'row1';
    const a = document.createElement('a'); a.href = h.url; a.textContent = h.bare || t('untitled');
    row.appendChild(a);
    h.tags.forEach((tag) => row.appendChild(chip(tag)));
    const url = document.createElement('div'); url.className = 'url'; url.textContent = h.url;
    li.append(row, url);
    li.addEventListener('mouseenter', () => setSelected(i));
    li.addEventListener('click', (e) => { if (e.target === li || e.target === url) location.href = h.url; });
    return li;
  }));
  empty.classList.toggle('hidden', hits.length > 0);
  selected = -1;
  if (hits.length) setSelected(0);
}

qEl.addEventListener('input', render);
document.addEventListener('keydown', (e) => {
  if (e.isComposing) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(selected + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(selected - 1); }
  else if (e.key === 'Enter' && hits[selected]) {
    e.preventDefault();
    const url = hits[selected].url;
    if (e.ctrlKey || e.metaKey || e.altKey) chrome.tabs.create({ url, active: false });
    else location.href = url;
  }
});

await load();
qEl.value = new URLSearchParams(location.search).get('q') || '';
render();
for (const ev of ['onCreated', 'onRemoved', 'onChanged']) chrome.bookmarks[ev].addListener(async () => { await load(); render(); });
