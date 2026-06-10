# Phase 4 — Code Review 三項修正（全端）

> 註：指示中提到的 `docs/work-reports/phase4-codereview.md` 在本機不存在（現有的是
> `phase4-4-add-item-ai-fullstack.md` 等分項報告）。三項修正皆依任務描述指定的檔案與行號處理。

## 摘要
- **#4（最重要）** 加入產品時不再把 `mockDetail` 的示意值寫進真實 `Product`，只存 AI 真實回傳欄位（缺漏留空/不存）。
- **#2** `switch-plan-ai` 對 AI 回傳的 `schedule` / `bodyMetric` / `verdict` 做型別與數值驗證，髒值走正規化或既有降級。
- **#1** `month-summary` 的程序內快取 `summaryCache` 加上限（200 筆，近 LRU 淘汰），避免無界成長。
- `npx tsc --noEmit` 通過（exit 0）；`npm run build` 通過，無 error / warning。
- 未 commit、未動三份系統文件、未碰正式庫、未改 seed。

---

## #4 — 別把 mock 假資料寫進真實 Product
檔案：`src/components/diary/AddItemModal.tsx`

### 問題
搜尋結果在 `runSearch` 中對每筆都 `detail: mockDetail(p)`，把示意的規格/營養表/標章/出處覆蓋上去；
`handleAdd` 再把 `product.detail.*`（已被 mock 補值）寫進 `POST /api/products` 的 `ingredientJson` /
`ingredientText` / `variant`，導致假資料落地、污染後續營養/成分分析。

### 作法（保留一份未經 mock 補值的 raw detail）
1. 新增顯示用型別 `DisplayProduct = WebProductDetailed & { rawDetail: detail }`。
2. `runSearch`：保留 AI 真實回傳的 detail 到 `rawDetail`，另把 mock 補值結果放 `detail` 供**畫面顯示降級**：
   ```ts
   const filled: DisplayProduct[] = (data.products ?? []).map(p => ({
     ...p, rawDetail: p.detail, detail: mockDetail(p),
   }))
   ```
   server 端（`handleDetailedSearch`）對 AI 缺漏欄位填的是 `EMPTY_DETAIL`（null / 空陣列），
   所以 `rawDetail` 即為「AI 真實有值才有值」的乾淨資料。
3. `handleAdd(product: DisplayProduct)`：寫 DB 時改用 `product.rawDetail`，且 `ingredientJson` **只放真實有值的欄位**
   （空陣列 / 空字串不落地）：
   ```ts
   const raw = product.rawDetail
   const ingredientJson: Record<string, unknown> = {}
   if (product.ingredients.length > 0) ingredientJson.ingredients = product.ingredients
   if (raw.certifications.length > 0) ingredientJson.certifications = raw.certifications
   if (raw.nutritionFacts.length > 0) ingredientJson.nutritionFacts = raw.nutritionFacts
   if (raw.dataSources.length > 0) ingredientJson.dataSources = raw.dataSources
   // variant / ingredientText 也改讀 raw（缺漏即 null）
   ```
- `mockDetail` 與 `ProductCard` / `DetailSections` 維持不變，畫面降級行為一致；
  只有「寫入 DB 的資料來源」從 mock-filled `detail` 換成 raw `rawDetail`。

---

## #2 — switch-plan-ai 驗證 AI 數值
檔案：`src/app/api/switch-plan-ai/route.ts`

新增三個驗證函式（在組裝 `result` 前套用），髒值不直接塞給前端：
- `validateSchedule(raw, dayCount)`：`newPct` / `oldPct` 非有限數字 → 走既有 `fallbackSchedule(dayCount)` 線性降級；
  否則以 `newPct` 夾擠到 0–100 並四捨五入，`oldPct = 100 - newPct`（自然修正「和不為 100」），label 缺漏時自動生成。
- `validateBodyMetric(raw)`：`stoolScore`（夾 0–7）、`scratchPerDay`（≥0）非數字補 0；`scratchWorsening` 非布林補 false；
  狀態字串缺漏補佔位文字。
- `validateVerdict(raw)`：`status` 限 `suitable | monitor | discard` 三個合法 enum，否則降級為 `monitor`；message 缺漏補佔位文字。
- `parsed` 型別放寬為 `{ schedule?: unknown; ... }`，由驗證函式收斂型別，避免「直接信任 AI 回傳結構」。

---

## #1 — month-summary 快取加上限
檔案：`src/app/api/month-summary/route.ts`

- 新增 `SUMMARY_CACHE_MAX = 200` 與 `setSummaryCache(key, summary)`：插入時若超過上限，刪除 Map 最舊一筆（插入序近似 LRU）；
  重新插入既有鍵以更新近因。
- 寫入點 `summaryCache.set(...)` → `setSummaryCache(...)`。
- 命中讀取點也呼叫 `setSummaryCache(cacheKey, cached)` 更新近因，避免熱門月份被當最舊淘汰。

---

## 驗證
- `npx tsc --noEmit`：通過（exit 0）。
- `npm run build`：通過，無 error / warning。

## 動到的檔案
1. `src/components/diary/AddItemModal.tsx`
2. `src/app/api/switch-plan-ai/route.ts`
3. `src/app/api/month-summary/route.ts`

## 未完 / 待驗證
- 端對端真機驗證（需 `ANTHROPIC_API_KEY` 有額度）未跑，AI 實際回傳品質待 QA 實測。
- 未 commit、未動三份系統文件、未碰正式庫、未改 seed（依任務指示）。
