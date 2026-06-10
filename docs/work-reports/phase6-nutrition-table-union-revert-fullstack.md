# Phase 6 — 營養表改回純聯集邏輯（全端）

## 任務
把「營養表」分頁從上一版「固定 7 種標準集 + 未提供補位列」撤回 frank 原始的**純聯集**邏輯：
只列該毛孩所有產品實際標示的營養素聯集（同名加總、有幾種列幾種），同時保留犬貓門檻雙向示警與 demo mock 補強。

## 改動檔案
- `src/components/home/IngredientAnalysis.tsx`（營養表分頁 `tab==='nutri'`）

`src/lib/demoAnalysis.ts` 未改動（依任務要求保留先前補的粗纖維/水分 mock）。

## 改了什麼

### 1. rows 改回純資料驅動（撤掉標準集 + 未提供補位）
- 移除 `standardNames` / `standardSet` / `extraNames` 基準列拼接。
- 移除 `buildRow(name)`（含 `hasData` 分支與「沒資料的標準營養素」中性回傳）。
- `NutriRow` 型別移除 `hasData` 欄位。
- rows 改為 `Object.values(merged).map(...)`：來源即「產品 facts 聯集、同名加總」的 `merged`。
  有幾種就列幾種，產品沒有的營養素不會出現、不補「未提供」列。

### 2. 保留雙向示警（對實際有的每一列）
- 仍依當前寵物 species（`resolveSpecies`）取 `NUTRIENT_THRESHOLDS` 對應犬/貓門檻。
- `high = warn != null && total > warn`（偏高 ⚠️）、`low = !high && min != null && total < min`（不足 ▾）。
- 範圍字串仍由 `formatRange(t)` 動態產生。
- 無對應門檻的營養素（如粗灰分）：`hasThreshold === false`，AI 狀態欄顯示「—」，照常列出合計值。

### 3. 表格與說明文案
- 移除表格 body 內 `hasData` 三元分支與「未提供」儲存格（合計欄、AI 狀態欄各一處）。
- 表尾說明改為「表格列出該毛孩所有產品實際標示的營養素（同名加總）…」，刪去「固定列出標準營養素參照集／未提供」字樣。
- 底部「說明」清單刪去「固定列出 7 項標準營養素…附加於後」「未提供：…」兩條，改為「實際標示的營養素，同名加總、有幾種列幾種」。

### 4. 維持既有行為
- `nutritionByProduct.length === 0` 空狀態提示維持不動。
- crash 防護維持：`pn.facts ?? []`、AI 區塊 `items ?? []` / `generalRecommendations ?? []` 等。
- demo mock（demoAnalysis.ts 的粗纖維/水分）未撤。

## 回報重點

- **rows 怎麼來**：直接 `Object.values(merged)`，`merged` 為各產品 `facts` 同名加總的聯集。純資料驅動，不再有基準列／補位列。
- **示警是否保留**：保留。對每一實際列依犬貓門檻做偏高 ⚠️／不足 ▾／正常雙向判定；無門檻者狀態「—」仍列出合計值。
- **demo 現在會列幾種**：demo 走 mock data，由 `demoAnalysis.ts` 的 facts 聯集決定，共 **7 種**：粗蛋白、粗脂肪、粗纖維、水分、鈣、磷、鈉（prod1 提供粗蛋白·粗脂肪·粗纖維·水分·鈣·磷；prod2 額外提供鈉，其餘同名加總）。
- **build 結果**：
  - `npx tsc --noEmit` 綠燈（無輸出）。
  - `npm run build` 綠燈（成功產出所有路由）。
  - `eslint src/components/home/IngredientAnalysis.tsx`：0 error，1 warning（既有 `<img>` 提示，位於頭像、與本次改動無關）。

## 未做 / 注意
- 未 commit、未動三份系統文件（依指示）。
