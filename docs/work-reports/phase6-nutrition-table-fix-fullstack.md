# Phase 6 — 營養表示警邏輯修正（全端）

## 背景
全域綜合飲食分析報告（`IngredientAnalysis` 的「營養表」分頁）在重用時，營養素門檻用了**閹割版**：
只列 5 種、只判「偏高」、建議範圍是寫死字串、且不分犬貓。frank 明確要求「**該示警的要示警出來**」。
本次把舊 `/analysis`（`src/app/analysis/page.tsx` 的 `NUTRIENT_THRESHOLDS`）的完整規則搬回來。

## 改動檔
- `src/components/home/IngredientAnalysis.tsx`（唯一程式變更檔）
- `docs/待辦清單.md`（6-7 補一條 `[V]` 已修記錄）
- 本 work-report

未碰：demo 分流（`demoAnalysis.ts`、`/api/analysis` gating）、已隱藏的 `AlternativeRecommendations`、三份系統文件。未 commit。

## 1. 新門檻表（模組常數 `NUTRIENT_THRESHOLDS`）
每 100g 乾物質（%）。`min`=AAFCO 最低需求（低於=不足）；`warn`=超過此值=偏高。犬貓各自一組。

| 營養素 | dog min | dog warn | cat min | cat warn |
|--------|---------|----------|---------|----------|
| 粗蛋白 | 18 | 40 | 26 | 55 |
| 粗脂肪 | 5.5 | 25 | 9 | 35 |
| 粗纖維 | — | 8 | — | 8 |
| 水分   | — | 78 | — | 78 |
| 鈉     | 0.08 | 0.5 | 0.2 | 0.8 |
| 鈣     | 0.5 | 2.5 | 0.3 | 2.0 |
| 磷     | 0.4 | 1.6 | 0.5 | 2.0 |

與 `src/app/analysis/page.tsx` 第 60–68 行逐欄一致。缺 `min` 表無下限參考、缺 `warn` 表無上限參考。

## 2. 犬貓對應
`resolveSpecies(species)`：中文 species 含「貓」→ `cat`；其餘（含「狗」「犬」與空值）→ `dog`（穩健預設）。
species 來源 `data.pet.species`，營養表內以 `resolveSpecies(pet.species)` 取得 `speciesKey`，再用 `NUTRIENT_THRESHOLDS[name][speciesKey]` 取門檻。
demo 同套：demo pet species 為「狗」→ dog（`demoAnalysis.ts` 形狀不變）。

## 3. 雙向示警（關鍵）
每個營養素合計值對該物種門檻：
- **偏高**：`> warn` → 狀態「警示」，badge `warn`（橘 `#FFEDD5`/`#C2410C`），合計值橘字 + ⚠️。
- **不足**：`< min`（且未偏高）→ 狀態「不足」，badge **新增的 `low`**（藍 `#DBEAFE`/`#1D4ED8`），合計值藍字 + ▾。
- **正常**：介於之間 → 狀態「正常」，badge `safe`（綠），合計值深色。
- **無門檻**：`hasThreshold=false` → AI 狀態欄顯示灰色「—」，合計值正常深色、不加任何符號，**不誤判**。

## 4. 視覺呈現
- `ABadge` 新增 `low` kind：藍底藍字膠囊，與橘色 `warn`、黃色 `note`、綠色 `safe` 明顯區分，沿用既有膠囊樣式。
- 「建議範圍」欄改由 `formatRange(t)` 動態組：`≥{min}% <{warn}%`（如粗蛋白犬「≥18% <40%」、粗纖維「<8%」），不再寫死字串。
- 合計欄符號：偏高 `⚠️`、不足 `▾`，正常無符號。
- 表格下方註解改為動態：「門檻依{犬/貓}的 AAFCO 標準對照；無對照標準的營養素僅顯示合計值（狀態『—』）…」。
- 「說明」區保留免責（合計=最高負荷上限估算、實際依產品說明為準），並補上「藍色/不足：標示加總低於 AAFCO 最低需求，僅供參考」與「門檻依當前寵物物種（犬/貓）分別對照」。

## 5. 驗證
- `npx tsc --noEmit`：**0 error**。
- `npx eslint src/components/home/IngredientAnalysis.tsx`：**0 error**，僅 1 個既有 `<img>` warning（line 483，非本次改動引入）。
- `npm run build`：**成功**（exit 0）。
- 實機由 frank 驗收。

## 邊界確認
- demo 分流邏輯與 `nutritionByProduct` 形狀未動。
- 已隱藏的 `AlternativeRecommendations` 未碰。
- 未 commit、未動三份系統文件。
