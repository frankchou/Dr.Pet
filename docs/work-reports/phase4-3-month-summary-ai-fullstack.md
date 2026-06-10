# Phase 4-3 日誌月摘要 AI 解讀 — 全端工作報告

**角色：** 全端工程師
**日期：** 2026-06-10
**待辦對應：** `docs/待辦清單.md` Phase 4-3

## 目標
在 `MonthHealthOverview` 統計數字下方，加入一段依當月 `DailyHealthLog` 統計生成的「AI 健康解讀」白話摘要，非診斷語氣、附 `VET_REFERENCE_SCOPE`、有快取、輪詢不重打。

## 變更內容

### 1. 新 endpoint：`GET /api/month-summary`
檔案：`src/app/api/month-summary/route.ts`（新增）

- 參數：`petId` + `yearMonth`（YYYY-MM，有格式驗證）。
- **權限**：pet-scoped → 先 `auth()` + `requirePetAccess`，**在呼叫 AI 之前擋掉無權者**，避免無權者燒 token（沿用 nutrition-ai 的順序慣例）。
- **後端自行聚合**：撈當月 `DailyHealthLog`，在伺服器端用與前端 `MonthHealthOverview` 一致的「正常值白名單」邏輯（VITALITY/APPETITE/WATER/STOOL/URINE_NORMAL + MULTI_FIELDS）算出：有日誌天數、異常天數、良好天數、各指標分佈（活力/食慾/飲水/排便/泌尿異常/症狀觀察部位）。
- **AI**：`anthropic`（`claude-sonnet-4-6`），prompt 附 `VET_REFERENCE_SCOPE`，明確要求「非診斷語氣、不下診斷、有明顯異常建議諮詢獸醫師」，3～5 句約 120 字白話、不用 markdown。
- **無資料**：`logs.length === 0` → 回 `{ summary: null }`，前端據此不顯示該段。
- **錯誤處理**：try/catch + 餘額不足(402)/API key(401)/其他(500) 對應訊息。

### 2. 快取方式（重點）
- **不新增 Prisma model**（本期不動 schema / seed，避免並行衝突）。
- 採**程序內快取**：`const summaryCache = new Map<string, string>()`，鍵為 `petId|yearMonth|statsHash`。
- `statsHash` = 對「聚合後統計物件」做 sha1 取前 16 碼。**統計一變動 hash 就變、舊鍵自然失效**；統計不變時直接回傳快取的 AI 文字（`cached: true`），不重打 AI。
- 適用單機 / Serverless 暖實例；冷啟動會重算一次（可接受，因仍受第 3 點客戶端去重保護）。

### 3. `MonthHealthOverview.tsx`（只動此元件）
檔案：`src/components/diary/MonthHealthOverview.tsx`

- 新增 AI 狀態：`aiSummary` / `aiLoading` / `aiError`。
- **輪詢不重打**：用 `aiStatsSig`（由 `monthLogs` 各觀察欄位組成的輕量簽章）+ `lastAiSigRef`。`refreshKey`（20–30 秒輪詢）變動但統計沒變 → 簽章相同 → **直接 return，不發 fetch**。只有當月健康資料實質改變時才重打。
- **無資料不顯示**：`monthLogs.length === 0` 時清空 AI 狀態、不渲染該段。
- **載入中／失敗狀態**：loading 顯示 spinner「AI 解讀產生中…」；失敗顯示「暫時無法產生」並重置簽章以便下次重試。
- **UI 位置**：放在月健康摘要卡內、「各指標每月分佈」區塊**下方**，品牌色 `#C4714A` 標題 + `#FAF7F2` 底框，附「僅供參考，非醫療診斷」免責句。
- 雙層保護：即使客戶端送出 fetch，後端 statsHash 快取也會避免重複打 AI。

## 邊界遵守
- 只動 `MonthHealthOverview.tsx` 與新 endpoint。
- 未動 `prisma/seed.ts`、未動 schema、未改 diary/page.tsx、diet、首頁、news、symptoms。
- 未 commit、未動三份系統文件、未碰正式庫。

## 驗證
- `npx tsc --noEmit`：**通過，無型別錯誤**。
- 功能性目視 / AI 實打驗證屬 QA 範疇（需執行環境 + ANTHROPIC_API_KEY）。

## 檔案清單
- 新增：`/workspaces/Dr.Pet/src/app/api/month-summary/route.ts`
- 修改：`/workspaces/Dr.Pet/src/components/diary/MonthHealthOverview.tsx`
- 新增：`/workspaces/Dr.Pet/docs/work-reports/phase4-3-month-summary-ai-fullstack.md`
