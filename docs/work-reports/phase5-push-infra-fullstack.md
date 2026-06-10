# Phase 5-B 推播基礎建設（Web Push）— 全端工作報告

> 角色：全端工程師
> 範圍：只做基礎建設（訂閱/退訂、SW、送推 helper、設定頁開關、PWA manifest）。
> **不含**食安觸發、提醒 cron（依規格留後續波，未在 news/crawl 加任何推播）。

## 做了什麼

### 1. 資料模型
- `prisma/schema.prisma`：新增 `PushSubscription` model（`id` / `userId`(關聯 User, onDelete Cascade) / `endpoint @unique` / `p256dh` / `auth` / `foodAlertEnabled @default(true)` / `reminderEnabled @default(true)` / `createdAt`，含 `@@index([userId])`）；`User` 補 `pushSubscriptions PushSubscription[]` relation。
- Migration `20260610092717_add_push_subscription`：以 `DATABASE_URL="file:./dev.db"` 跑 `prisma migrate dev`，**只套用本機 dev.db**；migration.sql 開頭加註明「僅本機 dev.db，正式環境另跑 `prisma migrate deploy`」。已 `prisma generate`。
- 規格 §1.2 的 `NewsArticle.foodAlertPushedAt` 屬食安觸發波，本波**不做**。

### 2. Service Worker
- `public/sw.js`：純 JS，處理 `install`/`activate`（skipWaiting + clients.claim）、`push`（顯示通知，含 title/body/icon/badge/tag/data.url）、`notificationclick`（聚焦既有同源視窗並導頁，否則開新視窗，預設導 `/news`）。

### 3. 送推 helper（私鑰唯一使用點）
- `src/lib/push.ts`：
  - `sendPush(subscription, payload)`：web-push + VAPID 送單筆；失效訂閱（statusCode 410/404）自動從 DB 刪除，其他狀態僅 log。
  - `sendPushToUser(userId, payload, kind)`：kind=`'foodAlert'|'reminder'`，依該開關過濾訂閱後逐筆送，回成功筆數。
  - VAPID 私鑰僅在本檔透過 `webpush.setVapidDetails` 使用；採延後設定（首次送推才讀 env），避免 build 期 import 即報錯。

### 4. 訂閱 / 退訂 API
- `POST /api/push/subscribe`（需登入）：upsert by endpoint，存 p256dh/auth 與兩開關；**demo 帳號（isDemoUser）no-op，回 `{ ok: true, demo: true }`**。
- `GET /api/push/subscribe`（需登入）：回目前使用者訂閱狀態 `{ subscribed, foodAlertEnabled, reminderEnabled }`（demo 回 `demo: true`、`subscribed: false`），供設定頁顯示。
- `DELETE`/`POST /api/push/unsubscribe`（需登入）：依 endpoint 刪除，限本人（`where endpoint + userId`）；demo no-op。

### 5. 設定頁通知開關
- 新增 tab「通知設定」於 `src/app/settings/page.tsx`，掛入新元件 `src/components/settings/PushSettings.tsx`。
- 兩個獨立開關：「食安警報推播」「用藥/美容提醒」。
- 開啟流程：能力偵測 → `Notification.requestPermission()` → 註冊 `/sw.js` → `pushManager.subscribe`（用 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`，base64url→Uint8Array）→ 呼叫 subscribe API（帶對應開關）。
- 關閉流程：兩類皆關 → 退訂瀏覽器 + unsubscribe API；仍保留另一類 → 只更新後端開關。
- 提示：權限被拒/不支援瀏覽器有提示；**iOS 未加主畫面**（偵測 standalone）顯示「請先加入主畫面」引導，不顯示假 toggle；demo 帳號可切換顯示成功但小字註明「不會收到真實推播」。

### 6. PWA manifest（全平台）
- 新增 `public/manifest.webmanifest`（name「無敏毛孩 PurePaw」、short_name PurePaw、icons 用 `/app-logo.png` 192/512、display standalone、theme_color `#C4714A`、background_color `#FAF7F2`、start_url `/`）。
- `src/app/layout.tsx`：metadata 加 `manifest` 連結、`appleWebApp`；viewport 加 `themeColor: '#C4714A'`。

## 驗證
- `npx tsc --noEmit`：**通過，無錯誤**。
- `npm run build`：**Compiled successfully**，`/api/push/subscribe`、`/api/push/unsubscribe` 皆已產出。
- 未實機驗證推播收發（需真實裝置/瀏覽器與 HTTPS）— 屬 QA 範疇。

## 檔案清單
新增：
- `prisma/migrations/20260610092717_add_push_subscription/migration.sql`
- `public/sw.js`
- `public/manifest.webmanifest`
- `src/lib/push.ts`
- `src/app/api/push/subscribe/route.ts`
- `src/app/api/push/unsubscribe/route.ts`
- `src/components/settings/PushSettings.tsx`

修改：
- `prisma/schema.prisma`
- `src/app/settings/page.tsx`
- `src/app/layout.tsx`

## 未做 / 留後續波（依規格與指示）
- 食安警報觸發（news/crawl 整合、`NewsArticle.foodAlertPushedAt`）。
- 用藥/美容提醒：Modal「設定提醒」寫 `nextReminder`、`/api/reminders/check` cron、`vercel.json` cron。
- 三份系統文件（系統架構/系統機制/版本紀錄）未更動（依指示本波不動）。
- 未 commit、未碰正式庫。
- 正式環境 VAPID 四金鑰需在 Vercel 設定、部署跑 `prisma migrate deploy`（release-checklist）。
