# Phase 6-2 / 6-3 / 6-4 飲食頁修正 — 全端工作報告

執行者：fullstack-engineer
日期：2026-06-10
範圍：飲食頁配餐數量編輯、輪詢重載閃爍、全域綜合飲食分析報告改造

---

## 6-2 配餐數量可編輯（已存在 → 確認完成）

進場時發現 6-2 後端 PATCH 與前端 `QuantityInput`／樂觀更新／回滾，皆已在工作樹中實作完成（前一輪作業）。本次逐項複核確認符合規格，未再改動：

- 後端 `src/app/api/meal-plans/[id]/items/route.ts` 已有 `PATCH`：接 `itemId`+`quantity`，以 `requirePetAccessByRecord('dailyMealPlan', planId, userId)` 依該 plan 的 pet 驗權，驗證 `quantity` 為 `> 0` 有限數字，並先 `findFirst({ id: itemId, planId })` 確認 item 屬該 plan（防越權），回傳更新後 item（含 product）。
- 前端 `SessionAccordion` 展開狀態用 `QuantityInput`（數字輸入，保留「unit」與 × 刪除版面），onBlur + Enter 觸發 `handleQuantityChange` → 樂觀更新（`onItemQuantityChanged`）→ PATCH 失敗回滾並 `alert` 提示。收合狀態仍為唯讀 `(quantity unit)`。
- demo 配餐照常寫 dev.db（非 AI、不 mock）。

## 6-3 修「每幾秒重載」（本次實作）

- `src/app/diet/page.tsx`：新增 `isSamePlan(a, b)` 穩定比較函式（比對 plan id + 各品項 id/session/quantity/unit/estimatedGrams/tags/名稱，依 id 排序避免後端順序差異誤判）。
- `fetchPlan` silent（輪詢）重抓時改為 `setPlan(prev => silent && isSamePlan(prev, data) ? prev : data)` —— 無實際變動就回傳同一參考，不觸發重繪/閃爍。`aiResult` 為獨立 state，完全不受影響。

## 6-4 全域綜合飲食分析報告改造（本次實作）

### 6-4a 固定說明彈窗
- 新增 `AnalysisCriteriaModal`（diet/page.tsx 內），內容**固定寫死**：系統分析基礎宣告 + 九大運算準則（`ANALYSIS_CRITERIA` 常數，九項標題沿用原九大項，說明文字改為精簡專業的靜態「準則說明」）。
- 入口＝`DetailedReportModal` 標題列**右上角**「分析準則」按鈕（關閉鈕左側，棕色 pill）。
- 移除報告本體原由 AI 生成的九大項（`detailedReport`）顯示，並刪除已無用的 `DETAIL_REPORT_ITEMS` 常數。`DietAnalysisResult.detailedReport` 型別與 `MOCK_DIET_ANALYSIS` 內容保留（diet-analysis API 仍回傳該欄位，不影響）。

### 6-4b 報告本體換內容
報告本體（`DetailedReportModal`）改為以 petId 串接三塊，全部串 AI：
1. `IngredientAnalysis`（既有元件，`src/components/home/IngredientAnalysis.tsx`）—— 風險統計列、風險總覽（有毒/警示/注意/安全分級）、依產品、營養表、補充建議、AI 營養安全風險。自行串 `/api/analysis` + `/api/nutrition-ai`。
2. `AlternativeRecommendations`（**新建**，`src/components/nutrition/AlternativeRecommendations.tsx`）—— 自舊 `/analysis` 移植「AI 產品替代推薦」塊：自行抓 `/api/analysis` 彙整有毒/警示產品為 `riskyProducts`，呼叫 `/api/recommend` 顯示「目前產品 vs 建議替換」。
3. `CorrelationInsights`（既有元件，`/api/analyze`）—— 最下方症狀×飲食關聯分析。

### 6-4 demo 分流
- `/api/recommend`、`/api/analyze`、`/api/nutrition-ai` 既有 `isDemoUser` gating。
- **`/api/analysis` 本次補上**：通過 `requirePetAccess` 後，`isDemoUser(session)` → 回固定 `DEMO_ANALYSIS`（新檔 `src/lib/demoAnalysis.ts`，結構與正常路徑回傳 body 完全一致：pet / result（含 cautionItems/warningItems/safeItems/supplements/stats）/ nutritionByProduct / analyzedAt）。demo 兩款示意產品名與 `/api/recommend` 的 `DEMO_RECOMMENDATIONS.forProduct` 對得起來，替代品推薦塊在 demo 也能正常顯示。

### 6-4c
- `/nutrition`、`/analysis` 兩孤兒頁本次**未刪未改**（route 保留、無導覽入口）。隱藏/保留項目文件之註記交 tech-writer。

---

## 如何移植與重用元件（6-4）

- **重用優先於重寫**：風險總覽/營養表/補充建議/AI 營養分析在 `IngredientAnalysis` 已是完整自含元件（自抓資料、自帶棕色系卡片風格），直接掛入報告本體即可，無須從 63KB 的舊 `/analysis` 整頁搬。
- **替代品推薦塊**是 `IngredientAnalysis` 沒有、frank 指定補回的部分，故從舊 `/analysis`（`runRecommend` 邏輯 + `riskyProductsForRec` useMemo + 推薦 UI）抽出，重寫為自含元件 `AlternativeRecommendations`，並把舊藍色主題（`#4F7CFF`）改為與營養分析一致的棕色系（`#C4714A`/`#D98A53`/`#FEF9F4` 卡片），達成視覺一致。
- **AI 關聯分析**直接重用既有 `CorrelationInsights`（原為 /nutrition 頁所用），掛在最下方。

## 固定彈窗文案來源

九項標題沿用待辦指定的原九大項（國際營養基準比對…日誌時序關聯比對）；說明文字為**新撰寫的固定靜態文案**，語氣參考原 `MOCK_DIET_ANALYSIS.detailedReport` 但改寫得更精簡專業，寫死於 `ANALYSIS_CRITERIA` 常數（demo / 真實一致，不再經 AI）。

## 關鍵決策

- `isSamePlan` 採「欄位級穩定比較」而非 `updatedAt`：MealPlan 前端型別與 API 回傳目前未帶 `updatedAt`，且品項變動才是使用者關心的差異，欄位比較更可靠且不需動 API/schema。
- `AlternativeRecommendations` 自行抓 `/api/analysis`（與 `IngredientAnalysis` 同源）而非由父層傳 riskyProducts：避免父子耦合與在 diet/page 多拉一份分析狀態；代價是同頁開報告時 `/api/analysis` 會被兩個子元件各打一次（皆為 GET、可接受；demo 走固定 mock 無成本）。
- 未碰 `AddItemModal.tsx`、`prisma/schema.prisma`（另一位工程師作業中）。

## 改動檔案清單

新增：
- `src/lib/demoAnalysis.ts` — /api/analysis 的 demo 固定 mock（`DEMO_ANALYSIS`）
- `src/components/nutrition/AlternativeRecommendations.tsx` — AI 產品替代推薦（移植自舊 /analysis）

修改：
- `src/app/diet/page.tsx` — 6-3 `isSamePlan` + `fetchPlan` 比較；6-4a `AnalysisCriteriaModal` + `ANALYSIS_CRITERIA` + 標題列「分析準則」按鈕；6-4b `DetailedReportModal` 本體改掛三元件；移除 `DETAIL_REPORT_ITEMS`
- `src/app/api/analysis/route.ts` — 補 `isDemoUser` gating
- `docs/待辦清單.md` — 6-2/6-3/6-4 各子項勾選與驗證標記

（6-2 既有改動 `src/app/api/meal-plans/[id]/items/route.ts`、`src/app/diet/page.tsx` 之 QuantityInput 為前一輪作業，本次僅複核）

## 驗證

- `npx tsc --noEmit`：通過（無型別錯誤）。
- `npm run build`：通過（無 error / warning）。
- ESLint（針對本次新檔/改檔）：`AlternativeRecommendations.tsx`、`demoAnalysis.ts`、`api/analysis/route.ts` 無新增 lint 問題；`diet/page.tsx` 僅剩 3 個**既有**錯誤（line 1007 `expertComment` 引號未跳脫、line 1663 `SessionAccordionWithPlan` setState-in-effect），皆非本次改動範圍。
- 實機（demo / 真實帳號開報告、數量編輯即存、輪詢不閃爍、替代品推薦顯示）：⏳ 待 frank。

## 不在本次範圍

- 未 commit、未動三份系統文件（`系統架構.md`/`系統機制.md`/`版本紀錄.md`，留 tech-writer）。
- 6-1（錯誤回報）、6-5（部署）不在本次。
