# Phase 6-9 使用者選單「問題回報」+「評論／評分」— 全端工作報告

## 範圍
使用者選單（ProfileMenu）新增「問題回報」與「評論／評分」兩入口，皆為 modal。
後端新增兩張表、三支 API；公開評論列表先做但用旗標隱藏。

## 1. 資料模型（`prisma/schema.prisma`）
- `Feedback`：`id` / `userId` / `content String` / `category String?` / `status String @default("pending")` / `createdAt`。
- `AppReview`：`id` / `userId` / `rating Int`（1-5） / `comment String?` / `isPublic Boolean @default(false)` / `status String @default("pending")` / `createdAt`。
- 兩表皆不綁 Pet、無外鍵（沿用既有單一使用者模型，與 `ProductErrorReport` 一致的輕量做法）。

## 2. Migration（只動 dev.db，正式留 deploy）
- migration 檔：`prisma/migrations/20260610120000_add_feedback_app_review/migration.sql`。
- `.env` 的 `DATABASE_URL` 指向正式 Turso，`prisma db execute` / `migrate dev` 預設會讀到正式庫，**有破壞風險**，故改用非破壞性手動方式：
  1. `sqlite3 dev.db < migration.sql` 直接在本機 dev.db 建兩張表（不 reset、不碰 Turso）。
  2. `DATABASE_URL="file:./dev.db" npx prisma migrate resolve --applied 20260610120000_add_feedback_app_review` 對齊 migration ledger。
  3. `npx prisma generate` 重生 client。
- 驗證：`sqlite3 dev.db .tables` 已可見 `Feedback`、`AppReview`。
- 正式 Turso 的 migration **留 deploy**（已補進待辦 0-4 與本檔）。

## 3. API
- `POST /api/feedback`（`src/app/api/feedback/route.ts`）：需登入；body `{ content, category? }`；驗證 content 非空；所有帳號（含 demo）寫 `Feedback`；寫入後寄信，`try/catch` 包住、寄信失敗只 log 不讓 API 失敗。
- `POST /api/reviews`（`src/app/api/reviews/route.ts`）：需登入；body `{ rating, comment? }`；驗證 rating 為 1-5 整數；所有帳號寫 `AppReview` + 寄信（同樣不擋 API）。
- `GET /api/reviews`：回傳 `isPublic=true && status='approved'` 的公開評論 + `averageRating` + `count`，供 `AppReviewsList` 用。回應型別 `PublicReviewsResponse` 由 route 匯出給前端共用。

### 寄信（`src/lib/email.ts`）
- 新增 `sendFeedbackEmail` / `sendAppReviewEmail`，收件人 `purepaw.notify@gmail.com`。
- 主旨用 `appEnvLabel()` 前綴：`[測試] PurePaw 使用者問題回報`、`[測試]/[正式] PurePaw 使用者評論`。
- 內文：問題回報帶 userId / 是否 demo / 分類 / 內容；評論帶星等（★ 圖示）/ 留言 / userId / 是否 demo。
- 所有使用者輸入經既有 `escapeHtml` 跳脫；抽出 `buildNotifyShell` / `notifyRow` 共用版型（與既有產品回報信視覺一致）。

## 4. UI（兩個 modal）
- 入口加在**兩處**選單（兩者共用同一份程式碼樣式）：
  - 桌面 `src/components/layout/Sidebar.tsx`
  - 手機 `src/components/layout/AppShell.tsx`
  - 位置：設定 → 問題回報 → 評論／評分 → 登出，各搭配 inline SVG icon。
- `FeedbackModal`（`src/components/feedback/FeedbackModal.tsx`）：選填分類 chips + textarea，送出 POST /api/feedback，成功切換為「已收到」畫面、失敗顯示錯誤。
- `ReviewModal`（`src/components/feedback/ReviewModal.tsx`）：可點選的 1-5 星 + 星等文字 + 選填留言 textarea，送出 POST /api/reviews，成功／失敗提示。
- 兩 modal 皆置中卡片、品牌色 `#C4714A`、`max-h-[88dvh]` 內容可捲動、關閉鈕 + 遮罩點擊關閉。
- demo 帳號與一般帳號行為一致（真的送出、寫 DB + 寄信、顯示成功訊息）。

## 5. 公開評論列表（選項二，旗標隱藏）
- `src/components/feedback/AppReviewsList.tsx`：讀 `GET /api/reviews`，顯示平均星等 + 評論列表。
- 旗標 `SHOW_PUBLIC_REVIEWS: boolean = false`（仿 `SHOW_ALTERNATIVE_RECS` 慣例）放在 `src/app/settings/page.tsx`，於設定頁底以條件渲染掛載；目前 false 不顯示，未來開旗標即啟用。

## 6. 驗證結果
- `npx tsc --noEmit`：通過、無錯。
- `npm run build`（以 `DATABASE_URL=file:./dev.db` 跑、避開正式 Turso）：`✓ Compiled successfully`，`/api/feedback`、`/api/reviews` 皆有註冊。
- 新增檔單獨 `eslint`：0 error / 0 warning。
- 既有檔 `Sidebar.tsx` / `AppShell.tsx` 仍各有 1 個 `react-hooks/set-state-in-effect` error，但**屬原本就存在的 localStorage 初始化 effect（即待辦項 (6) 的全專案 lint 債），非本次改動引入**。

## 7. 未做 / 交接
- 三份系統文件（系統架構 / 系統機制 / 版本紀錄）未動，留 tech-writer。
- 未 commit。
- 實機驗證（實際送出、收信）標 ⏳，待 frank。
- 正式 Turso migration 留 deploy（已登記 0-4）。
