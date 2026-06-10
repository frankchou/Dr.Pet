# Phase 4 — demo 帳號全 mock 剩餘分流（全端）

## 目標
延續既有 7 支已分流的 AI / 外部 endpoint，補齊其餘 9 支。模式一致：
維持既有 `auth()` + 授權 → 通過後判 `isDemoUser(session)` → **demo 回固定 mock（不打 Anthropic / 不打外部搜尋）**；非 demo 走原路徑、行為不變。mock 結構嚴格符合各 endpoint 既有回傳型別，前端不需改。

## 各 endpoint 分流方式

### 1. `src/app/api/analyze/route.ts`（POST，產生 AIInsight）
- 既有 `auth()` + `requirePetAccess` 不動。
- demo 分支放在權限檢查後、`pet.findUnique` 前。
- 以常數 `DEMO_ANALYSIS`（雞肉蛋白×皮膚搔癢的代表性關聯）建立 `AIInsight`（陣列欄位 `JSON.stringify`），回傳該筆 insight、status 201。
- **仍寫入 DB**：因前端會經 `GET /api/analyze` 重讀最新 insight，需保持歷史正常。

### 2. `src/app/api/diary-parse/route.ts`（AI 解析隨記）
- 既有 `auth()` + `requirePetAccess` 不動。POST 分支在權限檢查後。
- demo 回常數 `DEMO_DIARY_PARSE`（症狀 / 健康指標 / 飲食三類 `records` + `summary`），結構符合 `{ records: ParsedRecord[]; summary: string }`。
- PUT（確認後寫入）維持原樣，demo 的 mock 結果可正常經 PUT 落地。

### 3. `src/app/api/extract/route.ts`（成分標籤 vision 萃取）
- **此 endpoint 原本無 auth**。新增 `auth()` 僅用於判 demo，置於必填檢查後、檔案大小檢查前（demo 不需上傳真實檔案內容即可回 mock）。
- 依 `docType` 回 `DEMO_PRODUCT_EXTRACT`（成分 / 蛋白來源 / 添加物 / 營養分析）或 `DEMO_MEDICAL_EXTRACT`（病歷重點），包成 `{ extracted }`，與 AI 路徑回傳一致。
- 非 demo（含無 session 的一般使用）維持原 vision 流程不變。

### 4. `src/app/api/nutrition-ai/route.ts`
- 既有 `auth()` + `requirePetAccess` 不動。demo 分支在權限檢查後、`pet.findUnique` 前。
- 常數 `DEMO_NUTRITION_ANALYSIS` 涵蓋 safe / caution / warning 三狀態，每項含 `summary`（與 AI 二段式產生 summary 後的結構一致）。
- **仍寫入 `NutritionAnalysis`**（沿用原本「保留最近 3 筆」清理邏輯），回傳 `{...analysis, savedAt, productCount}`，使 GET / 歷史正常。

### 5. `src/app/api/products/lookup/route.ts`
- **此 endpoint 原本無 auth**。新增 `auth()` 僅判 demo（`isDemo`），不加授權門檻（維持原行為）。
- demo：跳過 Anthropic 呼叫，改用常數 `DEMO_LOOKUP_AI` 作為 `aiData`；**仍走本地知識庫 `analyzeIngredients`**（純本地、不打外部）算出 `impact`，故 `LookupResult` 結構完整一致，且仍會依該毛孩症狀做本地分析。
- 非 demo 走原 AI 查詢。

### 6. `src/app/api/recommend/route.ts`
- 既有 `auth()` + `requirePetAccess` 不動。demo 分支在權限檢查後、`pet.findUnique` 前。
- 常數 `DEMO_RECOMMENDATIONS: ProductRecommendation[]`（替代雞肉糧 / 高鈉罐的代表性建議）。
- **仍寫入 `ProductRecommendationResult`**（沿用「保留最新 1 筆」清理），回傳 `{ recommendations, savedAt }`，使 GET 正常。

### 7. `src/app/api/tasks/route.ts`（POST 生成本週任務）
- 既有 `auth()` + `requirePetAccess` 不動。GET / PATCH 完全不動。
- POST：demo 以常數 `DEMO_WEEKLY_TASKS`（觀察 / 飲食 / 護理 6 項）取代 AI 產生的 `tasksData`；之後**共用原本的刪舊（未完成）+ `createMany` 建新流程**，回傳 `{ tasks, count }`、status 201。非 demo 才呼叫 Anthropic。

### 8. `src/app/api/products/web-search/route.ts`（一般搜尋模式）
- detailed 模式 demo 分流先前已存在。本次合併為「demo 一律回固定清單」：
  `isDemoUser(session)` → `detailed ? DEMO_DETAILED_PRODUCTS : DEMO_GENERAL_PRODUCTS`。
- 新增常數 `DEMO_GENERAL_PRODUCTS: WebProduct[]`（3 筆，含代表性風險計數），結構與一般模式回傳一致。
- demo 一般模式**不再呼叫 `web_search` 工具 / Anthropic**（先前一般模式仍走真實搜尋，本次依需求改為 mock）。非 demo 行為不變。

### 9. `src/app/api/news/route.ts`（讀取 GET）
- **此 endpoint 原本不需登入**。新增 `auth()` 僅用於判 demo。
- demo：回常數 `DEMO_NEWS: NewsArticle[]`（food_safety / danger / health 三分類各 2 筆，含 `id` / `publishedAt` / `createdAt` / `isUrgent`，結構符合 Prisma `NewsArticle` 回傳），並依 `category` query 過濾。**不讀 DB**。
- `POST`（新增快訊）不動；`news/crawl`（排程生成）依指示完全不碰。

## news 讀取的 session 判定處理（重點說明）
`GET /api/news` 原本是公開讀取、無 session 概念。本次處理原則：
- **demo 判定以「有 session 且為 demo 帳號」為前提**：呼叫 `auth()` 取得 session，只有 `isDemoUser(session)` 為真時才回 mock 快訊。
- **無 session（一般訪客 / 未登入）一律照原樣讀真實 DB**，不受影響、不退化。
- 因此一般使用者與訪客的 `/news` 行為完全不變，只有 demo 帳號看到固定示意快訊。
- 同樣原則套用在另外兩支原本無 auth 的 endpoint（`extract`、`products/lookup`）：新增的 `auth()` 純為判 demo，不對非 demo 加授權門檻。

## 設計一致性
- 所有 demo 分支均**不呼叫 Anthropic、不呼叫 web_search**。
- 會落地 DB 的 endpoint（analyze / nutrition-ai / recommend / tasks）的 demo 路徑**沿用原本的寫入與清理邏輯**，讓 GET / 歷史 / 重讀行為與真實帳號一致；不落地的（diary-parse 解析階段、extract、lookup、web-search、news 讀取）直接回 mock。
- mock 內容彼此呼應同一隻示意毛孩情境（鮭魚低敏飲食、皮膚搔癢、磷/鈉偏高），具代表性且符合型別。

## 驗證
- `npx tsc --noEmit`：通過，無型別錯誤。
- `npm run build`：通過，無 error / warning。

## 異動檔案
- `src/app/api/analyze/route.ts`
- `src/app/api/diary-parse/route.ts`
- `src/app/api/extract/route.ts`
- `src/app/api/nutrition-ai/route.ts`
- `src/app/api/products/lookup/route.ts`
- `src/app/api/recommend/route.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/products/web-search/route.ts`
- `src/app/api/news/route.ts`

## 未做 / 邊界
- 未 commit、未動三份系統文件、未碰正式庫、未改 seed。
- `news/crawl` 未動。
- `web-search` 一般模式依本次需求由「真實搜尋」改為 demo mock；若原意是僅補先前未涵蓋者而保留真實搜尋，請告知即可調整（目前實作為 demo 全 mock，符合「demo 帳號全 mock」總目標）。
