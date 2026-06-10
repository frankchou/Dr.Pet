# Phase 5 — Web Push 主動推播 技術規格

> 作者：架構師 / Tech Lead
> 範圍：Phase 5-A~5-D（食安警報推播）＋ 3-2（用藥/美容提醒，併入 Phase 5）
> 性質：**設計規格**，供全端工程師實作。本文件不含可直接貼上的完整實作碼，只給介面、schema、流程、影響檔案。

---

## 0. 背景與既有事實（已盤點程式碼）

| 項目 | 現況 |
|---|---|
| 技術選型 | frank 已拍板 **Web Push（VAPID + Service Worker）**，非 FCM。VAPID 金鑰已備（見下）。 |
| 金鑰 | `.env` 已有 `VAPID_PUBLIC_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`；`web-push` 已 install。 |
| Auth | NextAuth（`src/lib/auth.ts`），JWT session，`session.user.id` 可用。後端慣例 `const session = await auth()` + `requirePetAccess(petId, session?.user?.id ?? '')`（`src/lib/petAccess.ts`）。 |
| Demo | `isDemoUser(session)`（`src/lib/demo.ts`）：id=`demo-user` / email=`demo@drpet.com`。原則：**demo 全 mock，不打外部服務**。 |
| 快訊 | `NewsArticle` 已有 `category`（`food_safety`/`danger`/`health`）與 `isUrgent Boolean`。由 `src/app/api/news/crawl/route.ts` 每日 cron（`0 2 * * *`）AI 生成、寫入、去重。讀取 `src/app/api/news/route.ts`。 |
| 提醒欄位 | `MedicationRecord.nextReminder DateTime?` 與 `GroomingRecord.nextReminder DateTime?` **已存在**，目前未被使用。 |
| Modal 現況 | `MedicationModal.tsx` L325、`GroomingModal.tsx` L291 的「設定提醒」按鈕仍是 `alert('提醒功能即將推出')`。Modal 都帶有 `petId`、`date` props，POST 至 `/api/medication-record`。 |
| Cron 授權 | `vercel.json` 一條 cron；`news/crawl` 用 `CRON_SECRET`（`Authorization: Bearer <CRON_SECRET>`）驗證，GET（Vercel 觸發）/POST（手動）皆可。 |
| PWA | 目前 **無** `public/sw.js`、**無** `manifest.json`、`layout.tsx` 無 manifest/theme-color/apple-mobile 標籤。 |
| User schema | `User` 無任何 push 欄位。 |

---

## 1. 資料模型

### 1.1 新增 `PushSubscription`

一個使用者可在多個裝置/瀏覽器訂閱，故 1 User : N Subscription。偏好開關（食安、提醒）**放在訂閱層級**，理由：使用者在不同裝置可能想要不同行為，且退訂只需刪該 endpoint。若日後要「帳號層級單一偏好」可再加 User 欄位，但本期以訂閱層級足矣。

```prisma
model PushSubscription {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint          String   @unique   // 瀏覽器 push service 的唯一端點，天然去重鍵
  p256dh            String              // 客戶端公鑰（加密用）
  auth              String              // 客戶端 auth secret
  userAgent         String?             // 除錯/裝置辨識用（選填）
  foodAlertEnabled  Boolean  @default(true)   // 5-D：食安警報推播開關
  reminderEnabled   Boolean  @default(true)   // 3-2：用藥/美容提醒推播開關
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
}
```

並在 `User` model 補一行 relation：

```prisma
  pushSubscriptions PushSubscription[]
```

設計要點：
- `endpoint @unique`：同一裝置重複訂閱時用 **upsert by endpoint** 覆寫 p256dh/auth（金鑰可能輪替），避免重複列。
- 偏好預設 `true`：使用者主動開啟通知＝同意接收兩類；要更細可在設定頁分開控制（見 §9）。
- `onDelete: Cascade`：帳號刪除連同訂閱清掉。

### 1.2 食安警報「已推播」追蹤

需「同一則文章只推一次」。兩個可行做法：

- **方案 A（推薦，零 schema 變更）**：在 `NewsArticle` 加一欄 `foodAlertPushedAt DateTime?`。推播後寫入時間戳；觸發時只挑 `category='food_safety' AND foodAlertPushedAt IS NULL` 的文章。語意清楚、查詢簡單、天然防重複。
  ```prisma
  // NewsArticle 內補一欄
  foodAlertPushedAt DateTime?
  ```
- 方案 B（不建議）：另建 `PushLog` join 表記錄 (articleId, sentAt)。對單一全域廣播型推播過度設計。

→ **採方案 A**。

### 1.3 Migration 策略

- 本機：`npx prisma migrate dev --name add_push_subscription`（建立 `PushSubscription` + `NewsArticle.foodAlertPushedAt`），接著 `npx prisma generate`。
- 正式（Vercel）：遵 `release-checklist`，部署流程跑 `prisma migrate deploy`（不在 build 內自動 migrate dev）。三個既有欄位都是新增（nullable / 有 default），對既有資料無破壞性。
- 注意 Prisma v7 + libsql：DATABASE_URL 在 `prisma.config.ts`，migration 指令照專案既有方式跑即可。

---

## 2. 訂閱生命週期

### 2.1 Service Worker `public/sw.js`

最小職責，只處理兩事件（純 JS，不經 Next 編譯，放 `public/` 由根路徑 `/sw.js` 提供）：

- `install` / `activate`：`self.skipWaiting()` + `clients.claim()`，讓更新即時生效。
- `push`：解析 `event.data.json()`（payload 結構見 §3.3），`event.waitUntil(self.registration.showNotification(title, { body, icon, badge, data: { url }, tag }))`。
  - `tag`：食安用 `food-alert-<articleId>`、提醒用 `reminder-<type>-<recordId>`，避免同則重複堆疊。
- `notificationclick`：`notification.close()`，`clients.openWindow(data.url)`（若已有同源 window 則 `focus()` 並導頁）。

`icon`/`badge` 用既有 `public/app-logo.png`（或請設計另出 192/512 圖示，見 §7 manifest 評估）。

### 2.2 前端訂閱（設定頁，使用者主動開關）

新增一個 client 元件（建議 `src/components/settings/PushToggle.tsx`），掛在 `settings/page.tsx`（可放新 tab 或「紀錄參數設定」tab 下方）。流程：

1. 掛載時偵測能力：`'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window`。不支援 → 見 §7 降級。
2. 註冊 SW：`navigator.serviceWorker.register('/sw.js')`。
3. 查現況：`registration.pushManager.getSubscription()` 判斷目前開/關，反映到 toggle。
4. 使用者點「開啟」：
   - `Notification.requestPermission()`。
   - `granted` → `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY) })`。
   - 把 subscription（`endpoint` + `keys.p256dh` + `keys.auth`）POST 到 `/api/push/subscribe`。
   - `denied` → 顯示「請到瀏覽器設定開啟通知權限」提示（無法再次以程式喚起）。
5. 使用者點「關閉」：`subscription.unsubscribe()` + DELETE `/api/push/unsubscribe`（帶 endpoint）。
6. 細項開關（食安 / 提醒）→ PATCH `/api/push/preferences`。

注意：`applicationServerKey` 需 base64url → Uint8Array 轉換工具（前端小 util），這是 Web Push 標準步驟。

### 2.3 後端訂閱 API（新增）

| Route | Method | 行為 |
|---|---|---|
| `/api/push/subscribe` | POST | `auth()` 取 userId；body = { endpoint, keys:{p256dh,auth}, userAgent? }；**upsert by endpoint**（更新 userId/p256dh/auth）。demo 分流見 §6。 |
| `/api/push/unsubscribe` | POST/DELETE | body = { endpoint }；刪除該 endpoint（限本人，`where userId+endpoint`）。 |
| `/api/push/preferences` | PATCH | body = { endpoint, foodAlertEnabled?, reminderEnabled? }；更新偏好（限本人）。 |

授權：全部 `const session = await auth()`，無 session 回 401。訂閱列只能本人 CRUD（`where: { userId }`）。輸入驗證：endpoint 為非空字串、keys 兩欄存在，否則 400。

---

## 3. 送推播 helper：`src/lib/push.ts`

集中所有 web-push 呼叫，**唯一**使用 `VAPID_PRIVATE_KEY` 的地方。

### 3.1 介面（草案）

```ts
import webpush from 'web-push'
import { prisma } from './prisma'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,        // e.g. 'mailto:frank200231@gmail.com'
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface PushPayload {
  title: string
  body: string
  url: string          // notificationclick 導向
  tag?: string
}

// 對「一批訂閱」發送；失效（404/410）自動刪除。回傳統計。
export async function sendToSubscriptions(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number; pruned: number }>
```

### 3.2 失效訂閱清除

`webpush.sendNotification` 對單筆訂閱 catch error：`err.statusCode === 404 || 410` → `prisma.pushSubscription.delete({ where: { endpoint } })`（不存在則忽略）。其他狀態碼僅記 log，不刪（可能暫時性）。**逐筆獨立 try/catch，一筆失敗不影響其他筆**。

### 3.3 payload 與 SW 對齊

`JSON.stringify(payload)` 作 `sendNotification` 的 payload；SW 端 `event.data.json()` 取回。`url` 範例：食安 → `/news?article=<id>`（或既有快訊頁路由，實作時對齊 `news/route.ts` 消費端）；提醒 → `/log`（或用藥/美容當日日誌）。

---

## 4. 5-C 食安警報觸發

### 4.1 標記方式

沿用既有 `NewsArticle.category === 'food_safety'` 作為「食安警報」判定，**不另加 flag 給分類**（既有欄位已足）。是否「待推播」用 §1.2 的 `foodAlertPushedAt IS NULL` 判定。可選：只推 `isUrgent=true` 的食安文章（避免每篇都推；建議列為 frank 決策，見 §10）。

### 4.2 觸發點

整合進既有 `news/crawl` 流程（**不另開 cron**，省一條 schedule，且文章生成即推播最即時）：

- `generateAndStore()` 目前回傳 `{ created, skipped }`。改為在每篇 `create` 後，若該篇 `category==='food_safety'`（且符合 urgent 政策），收集其 id。
- `generateAndStore()` 結束後（或在 `handle()` 內），呼叫新函式 `triggerFoodAlertPush()`：
  1. 查 `NewsArticle where category='food_safety' AND foodAlertPushedAt=null`（涵蓋本批 + 任何前次漏推的）。
  2. 查所有 `PushSubscription where foodAlertEnabled=true`（**排除 demo 使用者的訂閱**，見 §6；正式上線時食安為全使用者廣播）。
  3. 對每篇文章 → `sendToSubscriptions(subs, { title: '⚠️ 食安警報', body: article.title, url: '/news?article='+id, tag: 'food-alert-'+id })`。
  4. 成功觸發後 `update foodAlertPushedAt = now()`（即使 0 個訂閱也標記，避免日後累積誤推）。

### 4.3 防重複

`foodAlertPushedAt` 單一來源保證每篇只推一次。即使 cron 重跑或手動 POST 觸發，已標記文章不會再進候選集。

### 4.4 Serverless 注意

推播在 cron handler 內同步 `await` 完成（食安一天數篇 × 訂閱數，量小）。若未來訂閱量大到逼近 Vercel function timeout，再改批次/queue（列風險 §11）。

---

## 5. 3-2 用藥 / 美容提醒

### 5.1 建立提醒

不需新 model：用既有 `MedicationRecord.nextReminder` / `GroomingRecord.nextReminder`。

- `MedicationModal.tsx` / `GroomingModal.tsx`「設定提醒」按鈕：取代 `alert`，改為讓使用者選提醒日期（date input 或「N 天後 / N 個月後」快捷），寫入該筆 record 的 `nextReminder`。
  - 若該 record 是「儲存後才有 id」的新紀錄：在既有 POST `/api/medication-record` 的 body 一併帶 `nextReminder`；或儲存後再 PATCH。建議併入既有 POST，少一次往返（實作時看 route 是否已接受該欄位，未接受則於 route 補上白名單欄位）。
- 提示文案：提醒採 Web Push，需使用者已在設定頁開啟通知；若未開啟，按鈕旁提示引導到設定頁（copywriter 可潤）。

### 5.2 每日檢查 cron（新增）

新增 route `/api/reminders/check`（GET + POST，沿用 `CRON_SECRET` 授權，pattern 直接複製 `news/crawl` 的 `isAuthorized`）：

1. 算「今天」日期區間（注意時區：Vercel 為 UTC，台灣 UTC+8。建議查 `nextReminder` 落在「今天 00:00 ~ 23:59（台灣時區換算成 UTC）」的紀錄）。
2. 查 `MedicationRecord` / `GroomingRecord` where `nextReminder` 在今日區間。
3. 每筆 → 找該 pet 的所有有權限使用者（`Pet.userId` owner + `PetMember`）→ 取這些 user 的 `PushSubscription where reminderEnabled=true`（排除 demo）。
4. `sendToSubscriptions(subs, { title:'用藥提醒'/'美容提醒', body:`<毛孩名> ...`, url:'/log', tag:'reminder-med-'+id })`。
5. **防重複**：當天到期當天推。為避免重複，建議推完後將 `nextReminder` 清為 null（一次性提醒）；若日後要週期性提醒則需另設計 `reminderInterval`（本期不做，列 §10 決策）。

### 5.3 cron 設定（vercel.json）

在既有 crons 陣列加一條：

```json
{ "path": "/api/reminders/check", "schedule": "0 0 * * *" }
```

`0 0 * * *` = UTC 00:00 = 台灣 08:00，早上提醒當日待辦，時段合理。頻率建議每日一次（見 §10 決策）。

---

## 6. demo 分流

原則：demo 帳號不發真實推播。具體：

- **`/api/push/subscribe`**：若 `isDemoUser(session)` → **不寫 DB，直接回 `{ ok: true, demo: true }`**（設定頁 UI 仍可顯示「已開啟」的成功狀態，但不會有真實訂閱列，也就不會收到真推播）。前端體驗完整、可展示，但 no-op 後端。
- **食安觸發（§4.2）/ 提醒觸發（§5.2）**：查訂閱者時天然就查不到 demo 的訂閱列（因為根本沒寫入），自動不送。為保險，sendToSubscriptions 的呼叫端在組訂閱清單時也可額外 `where: { user: { NOT: { OR:[{id:'demo-user'},{email:'demo@drpet.com'}] } } }`，雙重保險（建議集中一個 `excludeDemo` where 片段）。
- 設定頁 toggle 對 demo：可正常切換、顯示提示（如「示範帳號不會收到真實推播」小字），不誤導。

→ 採「subscribe 對 demo no-op + 顯示成功狀態」，最貼近「demo 全 mock」原則且 UI 不殘缺。

---

## 7. iOS 限制與 PWA manifest 評估

事實：**iOS 16.4+ 才支援 Web Push，且必須先把網站「加到主畫面」（安裝為 PWA）後，從主畫面 icon 開啟的 standalone 模式下才能訂閱/收推播。** Safari 一般分頁不支援。

設計：
- 能力偵測（§2.2 step1）涵蓋 iOS：在 iOS Safari 非 standalone 下 `PushManager` 通常不可用 → toggle 顯示為「不支援」或附說明：「iOS 用戶請先將本站『加入主畫面』再開啟通知」。
- 偵測 standalone：`window.navigator.standalone === true` 或 `matchMedia('(display-mode: standalone)').matches`。非 standalone 的 iOS → 顯示「加入主畫面」引導，不顯示假的可用 toggle。
- 降級：不支援的瀏覽器（含舊 iOS、桌面某些情境）直接隱藏 toggle 或顯示灰階 + 原因。**絕不**因偵測不到而報錯。

**PWA manifest 是否需要？**
- iOS「加入主畫面」基本不強制 manifest，但要有像樣的 icon / 名稱、standalone 顯示，`manifest.json` 是正規做法，且 Android Chrome 的「安裝」與 push 體驗也更完整。
- 建議：**做一份最小 `public/manifest.json`**（name、short_name、icons 192/512、`display: standalone`、`theme_color`/`background_color` 用品牌色 `#C4714A` / `#FAF7F2`、`start_url: '/'`），並在 `layout.tsx` `<head>` 加 `<link rel="manifest">` 與 `apple-touch-icon`、`apple-mobile-web-app-capable`。
- 但這牽涉品牌 icon 出圖（ui-designer/art-designer），屬可獨立的小任務 → **列為 frank 決策（§10）**：本期是否一併做 manifest，或先用 app-logo.png 充當、manifest 延後。Web Push 本身在 Android/桌面不依賴 manifest，可先上；iOS 則 manifest+加主畫面是前提。

---

## 8. VAPID 金鑰使用點

| 金鑰 | 使用位置 | 性質 |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 前端 `PushToggle.tsx` → `pushManager.subscribe({ applicationServerKey })`（base64url→Uint8Array） | 可公開（NEXT_PUBLIC，會打包進前端） |
| `VAPID_PUBLIC_KEY` | 後端 `src/lib/push.ts` → `webpush.setVapidDetails(subject, public, private)` | 同值，後端用 |
| `VAPID_PRIVATE_KEY` | **僅** `src/lib/push.ts`（`setVapidDetails`） | 機密，**絕不**進前端、log、commit |
| `VAPID_SUBJECT` | 後端 `src/lib/push.ts`（`mailto:` 或站台 URL） | 後端 |

安全基準確認：私鑰只在後端 helper；前端只碰 NEXT_PUBLIC 公鑰；文件/log/commit 不出現金鑰值。subscribe/unsubscribe/preferences 全經 `auth()`，只能操作本人訂閱（後端再驗，不信任前端 userId）。

---

## 9. 影響檔案清單

**新增**
- `prisma/schema.prisma` — `PushSubscription` model、`User.pushSubscriptions` relation、`NewsArticle.foodAlertPushedAt`
- `prisma/migrations/*_add_push_subscription/` — migration
- `public/sw.js` — Service Worker（push / notificationclick）
- `public/manifest.json` —（若 §10 決定做）PWA manifest
- `src/lib/push.ts` — web-push helper（`sendToSubscriptions` + 失效清除）
- `src/app/api/push/subscribe/route.ts`
- `src/app/api/push/unsubscribe/route.ts`
- `src/app/api/push/preferences/route.ts`
- `src/app/api/reminders/check/route.ts` — 每日提醒 cron
- `src/components/settings/PushToggle.tsx` — 設定頁訂閱開關 UI
- `src/lib/pushClient.ts`（選）— 前端 util：base64url→Uint8Array、register/subscribe 封裝

**修改**
- `src/app/api/news/crawl/route.ts` — 文章寫入後觸發食安推播（`triggerFoodAlertPush`）、標記 `foodAlertPushedAt`
- `src/app/settings/page.tsx` — 掛入 `PushToggle`
- `src/components/diary/MedicationModal.tsx` — 「設定提醒」取代 alert → 寫 `nextReminder`
- `src/components/diary/GroomingModal.tsx` — 同上
- `src/app/api/medication-record/route.ts` / 美容對應 route — POST/PATCH 接受 `nextReminder`（若尚未接受）
- `vercel.json` — 新增 `/api/reminders/check` cron
- `src/app/layout.tsx` —（若做 manifest）`<link rel="manifest">`、apple icon meta
- 四份系統文件 + work-report（依 `commit-and-docs` 鐵則）

---

## 10. 需 frank / 總指揮決策的點

1. **食安推播門檻**：所有 `food_safety` 文章都推，還是只推 `isUrgent=true`？（影響推播頻率與打擾度。建議：只推 isUrgent，其餘留在快訊頁。）
2. **提醒 cron 頻率**：每日一次（建議 `0 0 * * *` UTC = 台灣 08:00）即可？是否需要支援使用者自選提醒時段？（本期建議固定每日早上一次。）
3. **提醒是否週期性**：本期設計為「一次性」（推完清 `nextReminder`）。若要「每月驅蟲、每季美容」週期提醒，需加 `reminderInterval` 欄位與重算邏輯 → 建議列下一期。
4. **PWA manifest 是否本期做**：做 manifest + 品牌 icon（需設計出圖）能讓 iOS「加入主畫面」與 Android 安裝體驗完整；否則先用 app-logo.png 充當、iOS 體驗較弱。建議本期做最小 manifest。
5. **偏好粒度**：食安/提醒兩開關是否都要暴露在設定頁，還是先給單一「開啟通知」總開關（兩者預設 true）？建議 MVP 先單一總開關 + 後端保留兩欄位，UI 後續再細分。
6. **demo 行為確認**：採「subscribe no-op + UI 顯示成功 + 小字註明示範帳號不收真推播」，是否同意？

---

## 11. 實作順序（分波）

- **波 1（基礎，可獨立驗證）**：schema + migration → `src/lib/push.ts` → `public/sw.js` → 三支 `/api/push/*` → `PushToggle` 掛設定頁。驗收：本機開啟通知、DB 出現訂閱列、用 `web-push` 手動發一則能收到。
- **波 2（食安 5-C/5-D）**：改 `news/crawl` 觸發 + `foodAlertPushedAt` + 設定頁食安開關。驗收：手動 POST `news/crawl`（帶 CRON_SECRET）產生食安文章 → 已訂閱裝置收到 → 點擊導向快訊 → 重跑不重複推 → 關閉開關後不收。
- **波 3（3-2 提醒）**：`reminders/check` cron + Modal「設定提醒」寫 `nextReminder` + `vercel.json`。驗收：設一筆 nextReminder=今天 → 觸發 cron → 收到提醒 → nextReminder 清空不重推。
- **波 4（iOS/PWA，視 §10-4）**：manifest + layout meta + iOS 降級提示。
- 收尾：四份系統文件 + work-report、release-checklist（環境變數 VAPID 四個在 Vercel 設定、cron 上線、CRON_SECRET）。

---

## 12. 風險清單

| 風險 | 等級 | 說明 / 緩解 |
|---|---|---|
| iOS 必須加主畫面才能收 | 高 | 產品須在 UX 明確引導；非 standalone iOS 不顯示假 toggle。manifest 缺失會讓 iOS 安裝體驗差。 |
| Serverless 同步發送可能逼近 timeout | 中 | 目前訂閱/文章量小，同步 await 可行。量大需改批次/背景 queue。逐筆 try/catch 避免整批失敗。 |
| cron 時區 | 中 | Vercel UTC，提醒「今天」需用台灣時區換算查詢區間，否則早一天/晚一天。務必明確處理。 |
| VAPID 私鑰外洩 | 高 | 只在 `src/lib/push.ts`；確認不在 NEXT_PUBLIC、不入 log/commit。Vercel 環境變數設定。 |
| 失效訂閱累積 | 低 | 410/404 自動刪除；其他狀態僅 log 不刪（避免暫時性誤刪）。 |
| 重複推播 | 中 | 食安靠 `foodAlertPushedAt`、提醒靠推完清 `nextReminder`；cron 重跑/手動觸發皆安全。 |
| 權限/隱私 | 中 | 訂閱 CRUD 只限本人（後端 `where userId`）；提醒只推有該 pet 權限的 user（owner+member）。 |
| 通知權限被拒無法復原 | 低 | denied 後僅能引導使用者到瀏覽器設定，程式無法再 prompt；UI 需說明。 |
| demo 誤發真推播 | 中 | subscribe 對 demo no-op + 發送端 excludeDemo 雙重保險。 |
