# Phase 4 — Demo 帳號 AI 分流（fullstack）

## 目標
跨所有 AI 功能實作帳號分流：**demo 帳號 → 回固定 mock（不打 Anthropic）；真實 / 測試帳號 → 維持現有 AI 行為（含既有 mock 降級 fallback）**。frank 拍板的設計原則。

## 共用 helper：`src/lib/demo.ts`
- `isDemoUser(session: Session | null): boolean`
- 判定值對照 `src/lib/auth.ts` 的 demo Credentials：
  - `session.user.id === 'demo-user'`（`DEMO_USER_ID`）
  - 或 `session.user.email === 'demo@drpet.com'`（`DEMO_EMAIL`）
- 任一命中即視為 demo。`session` 為 null / 無 user 一律 false。

## 分流模式（每支 endpoint 共同）
1. 維持既有 `auth()` + `requirePetAccess`（或 web-search 既有 IDOR 防護）。
2. 在通過權限檢查**之後**才判 `isDemoUser(session)`。
3. demo → 直接 `return` 該 endpoint 既有回傳型別的固定 mock，**完全不呼叫 Anthropic**。
4. 非 demo → 走原本 AI 路徑（含原本的 JSON 驗證 / 降級 fallback），行為不變。

demo mock 一律就近放各 route 的模組常數，結構嚴格符合各 endpoint 既有回傳型別，前端無需改動。

## 各 endpoint 分流方式與 mock 來源

| Endpoint | 回傳型別 | demo mock 來源 | gate 位置 |
|---|---|---|---|
| `api/symptoms/advice` (GET) | `{ advice: AdviceResult, cached }` | 新增常數 `DEMO_ADVICE`（代表性可能原因 / 建議做法） | access 檢查後、撈 entries 前 |
| `api/month-summary` (GET) | `{ summary: string }` | 新增常數 `DEMO_MONTH_SUMMARY`（代表性月摘要句） | access 檢查後、撈 logs 前 |
| `api/switch-plan-ai` (POST) | `SwitchPlanResult` | 新增 `demoResult(dayCount)`，沿用既有 `fallbackSchedule` 算今日比例 + 代表性「適應良好」身體監控 / verdict | access 檢查後、撈 pet 前 |
| `api/diet-analysis` (POST) | `DietAnalysisResult` | 新增常數 `DEMO_DIET_ANALYSIS`，內容複製自前端 `diet/page.tsx` 的 `MOCK_DIET_ANALYSIS`（設計圖 diet-ai-analysis-*） | access 檢查後、items 空檢查前 |
| `api/products/web-search` (POST, detailed) | `{ products: WebProductDetailed[] }` | 新增常數 `DEMO_DETAILED_PRODUCTS`（3 筆，含完整成分 / 營養表 / 標章 + 三種風險樣式 none/product/brand，對應設計圖 detail-info / risk 系列） | `auth()` 後、`if (detailed && isDemoUser)` |
| `api/instant-analyze` (POST) | `{ ...result, id, createdAt, imagePath }` | 新增常數 `DEMO_INSTANT_RESULT`（caution 範例，含成分 / concerns / positives） | access + 檔案大小檢查後 |
| `api/chat` (POST) | `{ message: string }` | 新增常數 `DEMO_CHAT_REPLY`（固定問診式回覆 + 非診斷免責） | access 檢查後、撈 pet 前 |

## 重要實作細節
- **chat 為非串流**：原本就回 `{ message: content.text }`，demo 回同型別 `{ message }`，前端無需特別處理串流。demo 路徑仍寫入 user + assistant 兩筆 `ChatMessage`，聊天歷史正常。
- **instant-analyze**：demo 仍存上傳圖片 + 寫入 `InstantAnalysis`，歷史列表 / GET 正常顯示。順手把存圖邏輯抽成 `saveUploadedImage()` helper，AI 路徑與 demo 路徑共用（去重，非新行為）。
- **web-search 一般（非 detailed）模式不分流**：依需求僅 detailed 模式 demo 走 mock；一般模式 demo 仍走真實搜尋，維持「只回真實資料、不造假」。`session` 提升到 POST 開頭取得一次，原 `if (petId)` 內的權限檢查改用同一 session（行為等價）。
- **不分流**：`api/news/crawl` 未改動（全站排程、非帳號觸發）。

## 驗證
- `npx tsc --noEmit`：通過，無型別錯誤。
- `npm run build`：通過，無 error / warning。

## 邊界遵循
- 未 commit、未 push。
- 未改三份系統文件（架構 / 機制 / 版本紀錄）—— 依本任務指示。
- 未碰 seed、未動正式庫。
- 真實 / 測試帳號行為完全不變（維持現有 AI + 既有 mock 降級 fallback）。

## 變更檔案
- 新增 `src/lib/demo.ts`
- `src/app/api/symptoms/advice/route.ts`
- `src/app/api/month-summary/route.ts`
- `src/app/api/switch-plan-ai/route.ts`
- `src/app/api/diet-analysis/route.ts`
- `src/app/api/products/web-search/route.ts`
- `src/app/api/instant-analyze/route.ts`
- `src/app/api/chat/route.ts`
