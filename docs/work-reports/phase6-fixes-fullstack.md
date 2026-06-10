# Phase 6 飲食報告區修正 — 全端工作報告

**角色：** fullstack-engineer
**日期：** 2026-06-10
**對照：** `docs/work-reports/phase6-codereview.md`（A 為新測試回饋；B/C 採納 review）

---

## A. 營養表分頁 runtime crash

### 真正根因
`src/components/home/IngredientAnalysis.tsx` 營養表（`tab==='nutri'`）的「AI 整體評估」區（原 824-877）。

- **會炸的那行：原 825** `const hasRisk = nutritionAi.items.some(...)`，以及連帶的
  原 856 `nutritionAi.items.map(...)`、原 862 `nutritionAi.generalRecommendations.length`。
- **什麼資料會觸發：** `nutritionAi` 來自 `GET /api/nutrition-ai`（讀 `NutritionAnalysis.resultJson`）
  或 `POST` 回傳。AI POST 端原本直接 `analysis = JSON.parse(jsonMatch[0])` 後落庫，
  **沒有保證 `items` / `generalRecommendations` 是陣列**。若 AI 回傳「可被 JSON.parse 但欄位缺漏」
  的物件（例如 max_tokens=8192 被截斷、或回了不同 schema），或 DB 內有舊版/異常紀錄，
  則 `nutritionAi.items` 為 `undefined` → `undefined.some(...)` 拋
  `Cannot read properties of undefined (reading 'some')`，整個 nutri 分頁白屏。
- 型別 `NutritionAiResult.items` / `generalRecommendations` 宣告為**必填非可選**，
  程式因此完全沒有 runtime 防護，與實際資料源「可能缺欄位」不符——這就是缺口。
- 補充確認：demo mock（`DEMO_NUTRITION_ANALYSIS`）與正常 AAFCO 路徑形狀其實完整；
  `/api/analysis` 與 `DEMO_ANALYSIS` 的 `nutritionByProduct[].facts` 也都有值
  （真實路徑 `.filter(p => p.facts.length > 0)`）。所以 demo 不必然炸，
  **真正不穩的是「已儲存 AI 紀錄 / AI 回傳」這條資料源**。

### 修法（UI 防護 + 源頭修正，雙管）
1. **源頭（根因修正）**
   - `POST /api/nutrition-ai`：`JSON.parse` 後**正規化**成
     `{ overall: string, items: [], generalRecommendations: [] }`，
     缺漏或型別不符一律補成陣列/空字串再落庫，保證 DB 形狀完整。
   - `GET /api/nutrition-ai`：讀回 `resultJson` 後同樣正規化才回傳，
     讓既有的舊/異常紀錄也安全。
2. **UI 防護（縱深防禦，不掩蓋）**
   - `nutritionAi.items ?? []`、`nutritionAi.generalRecommendations ?? []`、
     `nutritionAi.overall ?? ''`；`aiItems.length === 0` 時略過「各營養素分析」整區。
   - 上半營養表 IIFE、風險總覽 IIFE、`runNutritionAi` 內所有 `for (const f of pn.facts)`
     改 `pn.facts ?? []`；`pn.productName` 取 `?? '未命名產品'`；
     `withNutrition` filter 改 `(p.facts?.length ?? 0) > 0`。
   - 未使用 try/catch 掩蓋；缺資料改顯示空狀態 / 略過。

**動到的檔：** `src/components/home/IngredientAnalysis.tsx`、`src/app/api/nutrition-ai/route.ts`

---

## B. 隱藏「AI 產品替代推薦」區塊

- `src/app/diet/page.tsx` 加 `const SHOW_ALTERNATIVE_RECS: boolean = false`
  （仿既有 `SHOW_PRODUCT_REACTIONS` 慣例，含註解說明）。
- `DetailedReportModal` 內改 `{SHOW_ALTERNATIVE_RECS && <AlternativeRecommendations petId={petId} />}`。
- 元件 `src/components/nutrition/AlternativeRecommendations.tsx` **保留不刪**，import 仍在（條件渲染引用）。

**動到的檔：** `src/app/diet/page.tsx`

---

## C. 採納的 review 修正

### #1 email 主旨防 header injection — 已修
`src/lib/email.ts`：組 subject 前
`const safeName = productName.replace(/[\r\n]+/g, ' ').slice(0, 120)`，主旨改用 `safeName`。

### #3 PATCH 數量上界 — 已修
`src/app/api/meal-plans/[id]/items/route.ts` PATCH：驗證改為
`quantity <= 0 || quantity > 9999` 則 400（上界 9999）。

### #4 isSamePlan 的 tags 型別一致性 — 確認後無需改碼
查證：前端 `MealPlanItem.tags` 型別為 `string`（JSON 字串）；後端 POST item
存 `tags: JSON.stringify(...)`，GET（`/api/meal-plans`）直接回 Prisma 記錄、
`tags` 同為 DB 字串。**前後端皆為「同一來源序列化的 JSON 字串」**，
`ai.tags !== bi.tags` 字串比較穩定，不會每次輪詢誤判為「變了」。
故此項屬「型別已一致」，未動碼以免無謂 churn；風險方向本就偏安全（誤判→多更新，非漏更新）。

### #6 既有 3 個 eslint error — 已修
- `src/app/diet/page.tsx` ~1007：`expertComment` 外層引號改 `&quot;{...}&quot;`（修 react/no-unescaped-entities ×2）。
- `src/app/diet/page.tsx` ~1663 `SessionAccordionWithPlan`：移除 `useEffect` 內 `setResolvedPlanId`，
  改為 render 期間衍生 `const resolvedPlanId = plan?.id ?? localPlanId`，
  `localPlanId` 僅由 `tryEnsurePlan`（事件）設定。**行為不變**：plan prop 一旦回傳即以其 id 為準，
  本地剛建立的 id 在 plan 回來前作 fallback。修掉 react-hooks/set-state-in-effect。
- 驗證：`npx eslint src/app/diet/page.tsx` → 0 error / 0 warning。

**動到的檔：** `src/lib/email.ts`、`src/app/api/meal-plans/[id]/items/route.ts`、`src/app/diet/page.tsx`

---

## 三項檢查結果

| 檢查 | 結果 |
|---|---|
| `npx tsc --noEmit` | ✅ 綠（exit 0） |
| `npm run build` | ✅ 綠（Compiled successfully，64/64 頁產出，exit 0） |
| `npm run lint`（全專案） | ❌ 紅（2237 errors）—— **但全為既有、與本任務無關的全專案問題** |

### lint 說明（重要、誠實回報）
- **本任務鎖定的 #6 三個 error 已全部清掉**，`src/app/diet/page.tsx` 單檔 eslint = 0 error。
- 我改動的 5 個檔（diet/page、IngredientAnalysis、email、items route、nutrition-ai route）
  合併 lint = **0 error**（僅 IngredientAnalysis 既有 1 個 `<img>` 警告，非本次引入）。
- 全專案 `npm run lint` 仍紅，原因是 `eslint-config-next` 的 `react-hooks` 規則
  （set-state-in-effect / refs / 等）對**整個 codebase 數十個既有檔**（如
  `usePollingRefresh.ts`、`useRecordParams.ts`、`useTasks` 等多個 hook 與元件）報出 2000+ 既有 error，
  與本批改動無關。要讓全專案 lint 綠燈需另開一個大型重構單，**超出本任務範圍**。
- `npm run build` 不因 lint 失敗（此專案 Next.js build 未把 ESLint 設為阻擋步驟）。

**結論：** A/B/C 全部完成；tsc 與 build 綠燈；#6 指定的 3 個 lint error 已清、相關檔案乾淨；
全專案 lint 因大量既有問題仍紅，已如實說明、未謊報。

未 commit、未動三份系統文件。
