import { buildIndex, search } from './search.js';

let index = [];

async function rebuild() {
  try {
    index = buildIndex(await chrome.bookmarks.getTree());
  } catch (e) {
    // 書籤 API 偶爾在 service worker 喚起初期尚未就緒，下一個事件會再補
  }
}
rebuild();
chrome.bookmarks.onCreated.addListener(rebuild);
chrome.bookmarks.onRemoved.addListener(rebuild);
chrome.bookmarks.onChanged.addListener(rebuild);
chrome.bookmarks.onMoved.addListener(rebuild);

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function shortUrl(url) {
  return url.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 80);
}

chrome.omnibox.setDefaultSuggestion({
  description:
    '<match>bm</match> 搜尋書籤 tag：輸入多個關鍵字（AND），' +
    '<dim>#開頭 只比對標籤，Enter 看完整結果</dim>',
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  if (!text.trim()) { suggest([]); return; }
  const hits = search(index, text, 10);
  suggest(
    hits.map((h) => ({
      content: h.url,
      description:
        xmlEscape(h.bare || '(無標題)') + ' ' +
        '<dim>' + h.tags.map((t) => '#' + t).join(' ') + '</dim> ' +
        '<url>' + xmlEscape(shortUrl(h.url)) + '</url>',
    }))
  );
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const query = text.trim();
  let url;
  if (/^https?:\/\//i.test(query)) {
    url = query; // 使用者選了某筆建議
  } else {
    const hits = search(index, query, 1);
    url = hits.length
      ? hits[0].url
      : chrome.runtime.getURL('popup.html') + '?q=' + encodeURIComponent(query);
  }
  const options = { url };
  if (disposition === 'newForegroundTab') {
    chrome.tabs.create({ ...options, active: true });
  } else if (disposition === 'newBackgroundTab') {
    chrome.tabs.create({ ...options, active: false });
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && /^https?:\/\//i.test(tab.url || '')) {
      chrome.tabs.update(tab.id, options);
    } else {
      chrome.tabs.create(options);
    }
  }
});

// Alt+Shift+B：開啟「存 tag」彈出視窗
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-with-tags') {
    try {
      await chrome.action.openPopup();
    } catch (e) {
      // 舊版 Chrome 沒有 openPopup；退而求其次開視窗
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.windows.create({
          url: chrome.runtime.getURL('popup.html') + '?tabId=' + tab.id,
          type: 'popup',
          width: 380,
          height: 220,
        });
      }
    }
  }
});
