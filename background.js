import { buildIndex, search } from './search.js';

const t = (k, ...a) => chrome.i18n.getMessage(k, a);
let index = [];
let ready = null;

function rebuild() {
  ready = chrome.bookmarks.getTree().then((tree) => { index = buildIndex(tree); }).catch(() => {});
  return ready;
}
rebuild();
for (const ev of ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onImportEnded']) {
  chrome.bookmarks[ev]?.addListener(rebuild);
}

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const shortUrl = (url) => url.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 80);
const resultsUrl = (q) => chrome.runtime.getURL('results.html') + '?q=' + encodeURIComponent(q);

chrome.omnibox.setDefaultSuggestion({ description: t('omniDefault') });

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  if (!text.trim()) { suggest([]); return; }
  await ready;
  const hits = search(index, text, 8);
  suggest(hits.map((h) => ({
    content: h.url,
    description:
      xmlEscape(h.bare || t('untitled')) +
      (h.tags.length ? ' <dim>' + xmlEscape(h.tags.map((x) => '#' + x).join(' ')) + '</dim>' : '') +
      ' - <url>' + xmlEscape(shortUrl(h.url)) + '</url>',
  })));
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const query = text.trim();
  let url;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(query)) {
    url = query; // 選了某筆建議（content 就是網址）
  } else {
    await ready;
    const hits = search(index, query, 1);
    // 直接 Enter 開第一筆；沒有命中就開完整結果頁
    url = hits.length ? hits[0].url : resultsUrl(query);
  }
  if (disposition === 'newForegroundTab') chrome.tabs.create({ url, active: true });
  else if (disposition === 'newBackgroundTab') chrome.tabs.create({ url, active: false });
  else chrome.tabs.update({ url });
});
