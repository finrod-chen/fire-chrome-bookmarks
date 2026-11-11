// 共用的書籤 tag 解析與搜尋邏輯。
// 設計原則：tag 以 "#tag" 形式存在書籤標題後綴，因此資料跟著
// Chrome 書籤同步與 HTML 匯出一起走，不需要另外的儲存空間。

// 標題中的 tag：以空白分隔、以 # 開頭的詞，例如 "模型工具 #model #gear"
const TAG_RE = /(^|\s)#([^\s#]+)/g;

export function parseTitle(raw = '') {
  const tags = [];
  let bare = '';
  let last = 0;
  raw.replace(TAG_RE, (m, sp, tag, offset) => {
    tags.push(tag);
    bare += raw.slice(last, offset);
    last = offset + m.length;
    return m;
  });
  bare += raw.slice(last);
  return { bare: bare.replace(/\s+/g, ' ').trim(), tags };
}

// 把書籤樹攤平成搜尋索引
export function buildIndex(nodes) {
  const out = [];
  const walk = (node) => {
    if (node.url) {
      const { bare, tags } = parseTitle(node.title || '');
      out.push({
        id: node.id,
        title: node.title || '',
        url: node.url,
        bare,
        tags,
        bareLower: bare.toLowerCase(),
        urlLower: (node.url || '').toLowerCase(),
        tagsLower: tags.map((t) => t.toLowerCase()),
      });
    }
    (node.children || []).forEach(walk);
  };
  (Array.isArray(nodes) ? nodes : [nodes]).forEach(walk);
  return out;
}

// 多關鍵字 AND 過濾：每個關鍵字都必須命中。
// "#abc" 開頭的詞只比對 tag；其他詞比對標題、tag 或網址。
export function search(index, query, limit = 20) {
  const terms = (query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const tagTerms = [];
  const wordTerms = [];
  for (const t of terms) {
    if (t === '#' || t === '*') continue; // Firefox 的 "*" 在這裡由觸發字取代
    if (t.startsWith('#') && t.length > 1) tagTerms.push(t.slice(1));
    else wordTerms.push(t);
  }
  const hits = [];
  for (const it of index) {
    let score = 0;
    let ok = true;
    for (const t of tagTerms) {
      const hit = it.tagsLower.find((tag) => tag.startsWith(t) || tag.includes(t));
      if (!hit) { ok = false; break; }
      score += hit === t ? 3 : 1;
    }
    if (!ok) continue;
    for (const t of wordTerms) {
      const inTags = it.tagsLower.some((tag) => tag.includes(t));
      const inTitle = it.bareLower.includes(t);
      const inUrl = it.urlLower.includes(t);
      if (!inTags && !inTitle && !inUrl) { ok = false; break; }
      score += (inTitle ? 2 : 0) + (inTags ? 2 : 0) + (inUrl ? 1 : 0);
      if (it.bareLower.startsWith(t)) score += 2;
    }
    if (ok) hits.push({ ...it, score });
  }
  hits.sort(
    (a, b) => b.score - a.score || a.bare.length - b.bare.length || a.urlLower.localeCompare(b.urlLower)
  );
  return limit ? hits.slice(0, limit) : hits;
}

// 統計每個 tag 出現次數，常用的排前面（給標籤建議與結果頁篩選用）
export function tagCounts(index) {
  const m = new Map();
  for (const it of index) {
    for (const t of it.tags) {
      const k = t.toLowerCase();
      const e = m.get(k) || { tag: t, count: 0 };
      e.count++;
      m.set(k, e);
    }
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// 把使用者輸入拆成 tag：空白、逗號（含全形）、頓號、分號都算分隔
export function splitTags(text = '') {
  return [...new Set(
    text.split(/[\s,，、;；]+/).map((t) => t.replace(/^#+/, '').trim()).filter(Boolean)
  )];
}

// 組回書籤標題：「標題 #tag1 #tag2」
export function composeTitle(bare, tags) {
  const b = (bare || '').trim();
  return (tags.length ? (b + ' ' + tags.map((t) => '#' + t).join(' ')) : b).trim();
}
