# Bookmark Tags

**English** · [繁體中文](#繁體中文)

Firefox-style bookmark tags for Chrome. Add `#tags` to a bookmark, then find it from the address bar with a few keywords.

Tags are stored in the bookmark title itself (`Title #tag1 #tag2`), so they sync with your Chrome account, survive HTML export, and stay editable in any bookmark manager. No extra storage, no sync quota.

## How to use

1. **Tag a page**: press `Alt+Shift+B` (or click the toolbar icon). Type tags (space or comma adds one, `Tab` completes one you already use), then press `Enter`.
2. **Search from the address bar**: type `bm`, a space, then keywords.
   - `bm model gear`: every keyword must match the title, a tag, or the URL.
   - `bm #model #gear`: words starting with `#` match tags only.
   - `Enter` opens the top match; arrow keys pick another.
3. **Browse everything**: click **Search all** in the popup for a full-page search with a tag cloud and keyboard navigation.
4. **Edit or remove**: open the popup on a bookmarked page to change its title or tags, or delete it.

## Permissions

- `bookmarks`: read, create, update and delete bookmarks.
- `activeTab`: read the title and URL of the current tab, only when you click the icon or press the shortcut.

No data is collected and the extension makes no network requests. See [PRIVACY.md](PRIVACY.md).

## Development

Load the folder at `chrome://extensions` with Developer mode on (**Load unpacked**). There is no build step.

---

## 繁體中文

把 Firefox 的書籤標籤搬到 Chrome。幫書籤加上 `#標籤`，之後在網址列打幾個關鍵字就能找回頁面。

標籤直接寫在書籤標題裡（`標題 #tag1 #tag2`），會跟著 Chrome 帳號同步、匯出 HTML 也不會遺失，任何書籤管理器都能編輯。不佔額外空間，沒有同步配額問題。

靈感來自〈[上網的小技巧(1): Bookmark](https://topo.tw/posts/browser-tips.html)〉。

### 使用方式

1. **幫頁面加標籤**：按 `Alt+Shift+B`（或點工具列圖示），輸入標籤（空白或逗號新增一個，`Tab` 補完常用標籤），按 `Enter` 儲存。
2. **網址列搜尋**：輸入 `bm` 加空白，再打關鍵字。
   - `bm model gear`：每個關鍵字都要命中標題、標籤或網址。
   - `bm #model #gear`：`#` 開頭的詞只比對標籤。
   - `Enter` 開啟第一筆，上下鍵選其他筆。
3. **瀏覽全部**：在小視窗點「搜尋全部」，開啟整頁搜尋，含標籤雲與鍵盤操作。
4. **編輯或刪除**：在已加入書籤的頁面開啟小視窗，即可改標題、標籤或刪除書籤。

### 權限

- `bookmarks`：讀取、建立、更新與刪除書籤。
- `activeTab`：只在你點圖示或按快捷鍵時，讀取目前分頁的標題與網址。

不收集任何資料，也沒有任何網路請求。詳見 [PRIVACY.md](PRIVACY.md)。
