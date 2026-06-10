# Phase 5-C 食安警報觸發推播 + 個人化頭條 — 全端工作報告

> 角色：全端工程師
> 範圍：Phase 5-C（依 `docs/features/push/push-spec.md` §4 與 frank 決策）
> 性質：本期只動 news/crawl、schema、push 相關。未動提醒 cron（5-D 下一波）、未動三份系統文件、未 commit、未碰正式庫。

## 一、做了什麼

### 1. NewsArticle schema 旗標
`prisma/schema.prisma` 的 `NewsArticle` 新增兩欄：
- `affectedBrands String?` — AI 生成食安警報時一併輸出的「涉及廠商/品牌/產品關鍵詞」(JSON string array)，供個人化比對。
- `foodAlertPushedAt DateTime?` — 已觸發食安推播的時間戳；非 null = 已推，防止重複推播。

「食安警報」沿用既有 `category === 'food_safety'`，「緊急」沿用既有 `isUrgent Boolean`（皆已存在，未另加旗標）。

### 2. AI 生成帶出受影響廠商/產品
`src/app/api/news/crawl/route.ts`：
- `GeneratedArticle` 介面加 `affectedBrands: string[]`。
- AI prompt 加欄位與規則：**僅食安警報需填**涉及的廠商/品牌/產品關鍵詞（例 `["皇家","Royal Canin"]`），通泛成分警示無特定品牌則回 `[]`，其他分類一律 `[]`。
- 新增 `sanitizeAffectedBrands()`：只收非空字串、去重，避免髒資料。
- 寫入時：僅 `food_safety` 且有品牌才以 `JSON.stringify` 存 `affectedBrands`，其餘存 `null`。

### 3. 觸發推播
新增 `triggerFoodAlertPush()`，在 `handle()` 內於 `generateAndStore()` 之後呼叫（推播失敗以 try/catch 隔離，不讓整個 crawl 回錯）：
1. 取候選：`category='food_safety' AND isUrgent=true AND foodAlertPushedAt IS NULL`（涵蓋本批 + 任何前次漏推）。
2. 取訂閱者：`PushSubscription where foodAlertEnabled=true`，**排除 demo**（`user.id != 'demo-user' AND user.email != 'demo@drpet.com'`，雙重保險；demo 訂閱本就 no-op 不入庫）。去重成 userId 清單。
3. 用 `sendPushToUser(userId, payload, 'foodAlert')` 發送；payload 標題/摘要（body=文章標題）+ `data.url = /news?article=<id>` 導向快訊；`tag = food-alert-<id>` 避免堆疊。
4. 每篇推完（即使 0 訂閱）`update foodAlertPushedAt = now()` → 同篇只推一次（cron 重跑/手動 POST 皆安全）。
- 回應 JSON 加上 `push: { articles, recipients, headlines }` 統計，便於驗證。

### 4. 個人化頭條
- 預先載入每位訂閱者「正在使用的產品關鍵詞集合」：`PetProduct where isActive=true` 且該 pet 為其 owner（`pet.userId`）或 co-owner（`PetMember`）；取 `Product.name / brand / variant` 正規化（小寫 + NFKC + 去標點空白，與既有標題去重規則一致）。
- `brandsHitProducts()`：警報 `affectedBrands` ∩ 使用者產品關鍵詞，採雙向子字串包含（長度下限 2 避免偶然命中）。
- 命中 → `headlineFoodAlertPayload`：標題前綴「⚠️ 你的毛孩正在使用的產品」，payload 帶 `priority: 'high'` / `headline: true`。
- 未命中 → `normalFoodAlertPayload`：標題「⚠️ 食安警報」。
- `public/sw.js` `push` 事件讀 `headline`/`priority`：頭條通知用 `requireInteraction`（需手動關閉）、`renotify`、`vibrate`，並把 `headline` 寫進 `notification.data`，顯示更顯眼。

### 5. 失效訂閱清除
沿用 `src/lib/push.ts` 既有行為（410/404 自動刪 endpoint、逐筆 try/catch），未改動。

## 二、Migration（只本機）
- 因前一支 `20260610092717_add_push_subscription` migration 檔在套用後被改過，`migrate dev` 會要求 reset（會清空 dev.db）。為**不清空 dev 資料**，改採非破壞性方式：
  1. 手寫 migration 目錄 `prisma/migrations/20260610093000_add_news_food_alert_push/migration.sql`（含正式環境註記：兩欄 nullable，正式跑 `prisma migrate deploy`）。
  2. `prisma db execute --stdin` 逐句套用兩個 `ALTER TABLE ... ADD COLUMN` 到本機 dev.db。
  3. `prisma migrate resolve --applied 20260610093000_add_news_food_alert_push` 標記為已套用。
  4. `prisma generate` 重新產生 client。
- 驗證：`prisma migrate status` = 「Database schema is up to date」；`PRAGMA table_info('NewsArticle')` 確認 `affectedBrands` / `foodAlertPushedAt` 存在。
- **正式庫未碰**；正式部署照 release-checklist 跑 `prisma migrate deploy` 即可套用此 migration。

## 三、驗收結果
- `npx tsc --noEmit`：通過（EXIT 0）。
- `npm run build`：通過（EXIT 0，crawl route 無 warning）。
- 本機 migration：OK（status up to date、欄位存在）。
- **實際推播收發需真裝置**（iOS 需加主畫面 standalone）：交 QA / frank 在真機驗。

## 四、檔案清單
**修改**
- `prisma/schema.prisma` — NewsArticle 加 `affectedBrands` / `foodAlertPushedAt`
- `src/app/api/news/crawl/route.ts` — AI 帶出 affectedBrands、`triggerFoodAlertPush`、個人化比對、防重複標記
- `src/types/index.ts` — `NewsArticle` 介面補兩欄
- `public/sw.js` — 頭條通知更顯眼（requireInteraction / renotify / vibrate）

**新增**
- `prisma/migrations/20260610093000_add_news_food_alert_push/migration.sql`

## 五、給總指揮 / 後續注意
- **正式部署**：需在 Vercel 跑 `prisma migrate deploy`（此 migration 已備好、為純新增欄位）。VAPID 四把金鑰與 `CRON_SECRET` 需在正式環境設好（5-B 應已處理）。
- **三份系統文件 + 版本紀錄尚未更新**（依指示本期不動）；上線收尾時須補（`commit-and-docs` 鐵則）。
- 個人化比對採關鍵詞子字串啟發式，可能漏判（品牌縮寫/別名）或偶發誤判；如需更精準可日後引入品牌正規化字典。屬可接受的 MVP 取捨。
- demo 天然排除已雙重保險（subscribe no-op 不入庫 + 查詢端排除）。
