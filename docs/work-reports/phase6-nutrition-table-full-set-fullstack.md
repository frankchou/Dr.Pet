# Phase 6 — 營養綜合分析表「固定完整標準營養素參照集」

角色：全端工程師
日期：2026-06-10
狀態：完成（tsc / build 綠燈，改動檔單獨 lint 無新增 error）

## 問題

營養表分頁（`tab === 'nutri'`）的列只從產品實際有的 `nutritional_facts` 撈（merged from data）。
產品成分標示少 → 列就少（demo 只有 5 種）。門檻 / 示警只作用在現有列，不會新增列，
導致「全域綜合飲食分析報告 / 營養表」顯示太少、看起來不完整。

## 改法

### 1. 基準列怎麼組（`src/components/home/IngredientAnalysis.tsx`，`tab === 'nutri'`）

- **基準列 = `NUTRIENT_THRESHOLDS` 的全部鍵**（粗蛋白·粗脂肪·粗纖維·水分·鈉·鈣·磷），
  以 `Object.keys(NUTRIENT_THRESHOLDS)` 取出，**一律全部列出**。
- 再 **union** 產品 facts 內出現、但不在標準集內的額外營養素（如粗灰分）：
  `extraNames = Object.keys(merged).filter(n => !standardSet.has(n))`，附加在標準列之後。
- 列順序：`[...standardNames, ...extraNames].map(buildRow)`，標準 7 項固定在前、額外營養素接續。
- 新增型別 `NutriRow`（含 `hasData` 旗標），以 `buildRow(name)` 統一組列：
  - 有資料：填合計值 + 單位，依犬貓門檻雙向示警（偏高 ⚠️ / 偏低 ▾ 不足 / 正常），`range` 照 `formatRange` 動態算。
  - **沒資料的標準營養素**：`hasData = false`，`total` 不參與任何運算（不當 0），`high/low` 一律 false。

雙向示警、犬貓區分（`resolveSpecies` / `speciesKey`）、範圍動態產生、空狀態防護皆維持不變。

### 2. 未提供列怎麼呈現

`buildRow` 回傳 `hasData = false` 的列：

- 合計欄：顯示 **「未提供」**（灰字 `text-slate-300`），不顯示數值、不顯示 ⚠️/▾。
- AI 狀態欄：顯示中性 **「未提供」**（灰字），不渲染任何示警 badge —— 不可示警、不可當不足。
- 來源欄為空、建議範圍欄仍顯示該營養素的門檻範圍字串（供參考）。

判斷優先序：`!hasData` →「未提供」；其次 `!hasThreshold` →「—」；否則照警示 / 不足 / 正常 badge。

### 3. demo 補了哪些（`src/lib/demoAnalysis.ts`）

demo 兩款產品的 facts 原本缺粗纖維、水分，補上示意值（mock，已於註解標清楚是 demo 示意值）：

- `黃金牧場 雞肉鮮蔬成犬糧`：新增 `粗纖維 3%`、`水分 10%`（乾糧）。
- `海岸鮮燉 鮪魚白身罐 80g`：新增 `粗纖維 1%`、`水分 72%`（罐頭水分高，示意）。

補後 demo 營養表 7 項標準營養素皆有資料，看起來完整。
（注：兩款合計水分 82% > 門檻 78%，會正常觸發「警示 ⚠️」，符合雙向示警邏輯。）

### 4. 文案微調

- 表格下方註解新增說明：「表格固定列出標準營養素參照集；『未提供』＝該產品標示未列出此營養素（不計入示警、不視為不足）」。
- 底部「說明」清單新增兩條：固定列出 7 項標準營養素 + 額外營養素附加於後；「未提供」定義。

### 空狀態防護

`nutritionByProduct.length === 0`（完全沒產品）時維持原本空狀態提示卡片，
**不**進入 IIFE 硬列 7 列空表 —— 條件分支未動。

## 改動檔

- `/workspaces/Dr.Pet/src/components/home/IngredientAnalysis.tsx`
- `/workspaces/Dr.Pet/src/lib/demoAnalysis.ts`

## 驗證

- `npx tsc --noEmit`：通過，無錯誤。
- `npm run build`：`✓ Compiled successfully in 22.9s`。
- 單獨 lint 兩個改動檔：0 error，1 warning（既有 `<img>` 警告，line 483，非本次改動）。

## 交棒

版本紀錄「營養表後續」那條交 tech-writer 處理。本次未 commit、未動三份系統文件。
