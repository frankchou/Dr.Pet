# Phase 4 Code Review 改善 #13 / #14 — 全端工程師工作報告

日期：2026-06-10
角色：全端工程師
範圍：Phase 4 code review 兩項改善（#13 飲食 AI 搜尋 mock 補值欄位標「示意」、#14 快訊 AI 去重升級）

---

## #13：飲食 AI 搜尋 mock 補值欄位標「示意」

### 問題
`AddItemModal.tsx` 在 AI 未回傳欄位時用 `mockDetail()` 補示意值供畫面顯示（不落地 DB，既有行為已正確）。
但畫面上 AI 真實資料與 mock 補值混在一起，使用者無從分辨。

### 作法
利用既有的 `DisplayProduct.rawDetail`（AI 真實回傳，未補值）作為判定依據，逐欄位比對哪些是補值：

- 新增 `computeMockFlags(raw)`：對 `rawDetail` 每個欄位判定是否為空（字串 null/空白、陣列長度 0），
  為空即代表畫面上顯示的 `detail` 對應欄位是 mock 補值，回傳 `MockFlags`（型別為 `Record<keyof ProductDetail, boolean>`）。
- 新增 `hasAnyMock(flags)`：任一欄位為補值時於展開區頂部顯示一句灰色提示
  「標示『示意』的欄位 AI 尚未取得，為示意資料、不會存入紀錄，請以實際包裝為準。」
- 新增 `MockBadge` 元件：灰色小標籤「示意」，貼在「該欄位本身有值且為補值」的欄位標題旁。
- 標示的欄位涵蓋收合卡片與展開細節：
  規格(variant)、成分摘要(ingredientSummary)、驗證標章(certifications)、
  完整成分(fullIngredients)、營養添加物(nutritionalAdditives)、營養成分表(nutritionFacts)、
  熱量(caloriePerKg)、商品規格(spec)、製造代理(manufacturing)、餵食量(feedingGuide)、
  數據出處(dataSources)、數據更新日期(dataUpdatedAt)。
- 標籤只在「欄位有值且為補值」時顯示（`detail.x && mockFlags.x`），AI 真實欄位不標。

### 既有行為保證（未更動）
- 仍只把 `rawDetail`（AI 真實資料）寫入 DB，`mockDetail` 的示意值不落地。`handleAdd` 的
  `ingredientJson` / `ingredientText` 組裝邏輯一字未改。
- `ProductCard` 的 props 型別由 `WebProductDetailed` 收斂為 `DisplayProduct`（本就傳入 `DisplayProduct`，
  僅讓型別精確以取用 `rawDetail`，無行為變化）。

### 注意點
`dataUpdatedAt` 在 mock 時固定補今天日期，故 AI 未回傳時該日期會帶「示意」標籤——這正是預期，
避免使用者誤以為是真實更新日。

---

## #14：快訊 AI 去重升級

### 問題（原本）
`api/news/crawl/route.ts` 僅以「近 7 天 + 同分類 + 完全相同標題」判重，
同主題不同措辭（如「貓咪誤食百合中毒」vs「家中百合恐致貓腎衰竭」）會重複塞入。

### 作法
採「AI 主題關鍵詞 + 標題正規化相似度」雙軌去重，且涵蓋跨批（DB 既有）與同批兩種來源：

1. **AI 一併輸出 `topicKey`**：prompt 要求每篇給 4-12 字精簡主題關鍵詞，同主題不同措辭給相同 topicKey；
   `GeneratedArticle` 介面新增 `topicKey` 欄位。
2. **標題 / 主題正規化** `normalizeForCompare()`：`NFKC` 正規化 + 轉小寫 + 移除標點/符號/空白（Unicode property escapes），
   留中英數字，供措辭差異比對。
3. **高度相似判定** `isHighlySimilar()`：正規化後完全相同、或其一為另一子字串即視為相似；
   設長度下限 6 避免極短字串的偶然包含造成誤殺。
4. **去重比對**：
   - 對「近 N 天既有 DB 文章」：同分類且標題正規化後高度相似 → 重複。
     （一次撈出近 N 天文章在記憶體比對，取代原本逐篇 `findFirst` 查 DB。）
   - 對「同一批次已採用文章」：同分類且（topicKey 相同 或 標題高度相似）→ 重複，
     擋掉 AI 同次回多篇同主題不同措辭。

### 為何不為 DB 既有文章比對 topicKey
`NewsArticle` 無 `topicKey` 欄位，且既有 `subCategory` 是顯示用標籤（「食安通報」「地雷食物」），
語意與 topicKey 不同，借用會過度合併造成誤殺。為避免為去重變動 schema / 動正式庫，
跨執行（DB 既有）以標題相似度為準；topicKey 主要在同一批次內發揮跨措辭去重效果。
此選擇刻意保守，優先避免誤殺正常的不同主題新聞。

### 避免誤殺的設計
- 一律先比對 `category`，不同分類不去重。
- 相似度僅「完全相同 / 子字串包含」，不做模糊編輯距離，避免把僅關鍵詞重疊的不同新聞當成同篇。
- 子字串比對加長度下限 6。

---

## 驗證
- `npx tsc --noEmit`：通過，無型別錯誤。
- `npm run build`：✓ Compiled successfully in ~19s。

## 動到的檔案
- `/workspaces/Dr.Pet/src/components/diary/AddItemModal.tsx`
- `/workspaces/Dr.Pet/src/app/api/news/crawl/route.ts`

## 未做 / 邊界
- 未 commit、未動三份系統文件、未碰正式庫、未改 seed。
- 未為去重新增 DB 欄位（見 #14 說明）；若日後要對 DB 既有文章也做 topicKey 比對，
  需新增 `NewsArticle.topicKey` 欄位 + migration，屬架構決策，留待總指揮裁量。

---

## 追加（2026-06-10）：#13 改採方案 B — 移除造假補值

### 決策
frank 決策：飲食「添加項目」AI 搜尋結果**不造假**。AI 沒回的欄位就不顯示（或顯示「無資料」），
完全不填示意值；因此也不再需要「示意」標示。原 #13 的「標示示意」方案作廢，改為方案 B。

### 改動（只動 `AddItemModal.tsx`）
- **移除造假補值**：刪除 `mockDetail()` 函式及其對缺漏欄位的補值邏輯。
  搜尋結果直接使用 AI 真實回傳的 `detail`（`setResults(data.products ?? [])`），不再 map 補 mock。
- **產品卡片只顯示真實有值欄位**：
  - 收合區：成分摘要 / 驗證標章 → 維持「有值才顯示」。
  - 展開區 `DetailSections`：完整成分 / 營養添加物 / 營養成分表 / 熱量 / 商品規格 /
    製造代理 / 餵食量，全部 AI 沒回（null / 空陣列）就**整段隱藏**，不顯示示意值。
  - 規格 `variant` 缺漏改顯示「無資料」（取代原本的示意值 `1.5kg`）。
- **移除「示意」相關 UI 與型別**：刪除 `MockBadge` 元件、`computeMockFlags()`、`hasAnyMock()`、
  `MockFlags` 型別、`DisplayProduct.rawDetail` 欄位（`DisplayProduct` 收斂為 `WebProductDetailed`），
  以及「以下部分為示意資料 / 標示示意…」的頂部提示句。
- **空 / 精簡狀態不破版**：
  - 展開區若 AI 完全沒回任何詳細欄位 → 顯示一行「AI 尚未取得此產品的詳細成分資料，請以實際包裝為準。」。
  - 數據出處區塊改為「有 dataSources 才顯示出處子區塊」，避免只有更新日期時出現空行。
  - 既有空搜尋結果 / 手動自訂備援畫面未動，仍正常。

### 寫 DB 行為（維持，未動壞）
`handleAdd` 仍只寫 AI 真實資料：原本讀 `product.rawDetail`，現改讀 `product.detail`
（兩者在方案 B 下皆為 AI 真實回傳，語意一致）。`ingredientJson` / `ingredientText` 組裝邏輯一字未改，
空陣列 / 空字串一律不落地。

### 影響說明（frank 已接受）
移除 mock 後，無 AI 金鑰 / AI 回空時，搜尋結果會很精簡或空白——這是預期且可接受：真實使用者只看真資料。
畫面在精簡 / 空狀態下已確認不破版。

### 驗證
- `npx tsc --noEmit`：通過，無型別錯誤。
- `npm run build`：✓ Compiled successfully in ~18.7s。

### 動到的檔案
- `/workspaces/Dr.Pet/src/components/diary/AddItemModal.tsx`（僅此檔；`diet/page.tsx` 無需改型別，僅 default import）

### 邊界
- 未 commit、未動三份系統文件、未碰正式庫。
