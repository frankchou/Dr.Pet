# Phase 0 收尾 — 全端工作報告

**角色：** 全端工程師
**日期：** 2026-06-04
**範圍：** Phase 0-4（seed 防呆 + 資料策略查核）、0-5（顯示斷鏈修復）
**鐵則遵守：** 全程未對正式庫（Turso）做任何讀寫 / migration；seed 一律以 `DATABASE_URL="file:./dev.db"` 對本機 dev.db 執行。

---

## 驗證總結

- `npx tsc --noEmit`：**通過**（exit 0）。
- `DATABASE_URL="file:./dev.db" npx prisma db seed`：**成功**（16 類資料全數寫入本機 dev.db）。
- seed 防呆：用正式風格 URL（`libsql://...`）執行被擋下並 `exit 1`；用 `file:` 正常。

---

## 0-4a Seed 防呆

**做法：** 在 `prisma/seed.ts` 最上方（建立 PrismaClient 之前）加防呆：若 `DATABASE_URL` 存在且非 `file:` 開頭，`console.error` 提示正確用法後 `process.exit(1)`，避免誤寫正式 Turso 庫。

**驗證：**
- `DATABASE_URL="libsql://fake-prod.turso.io" npx tsx prisma/seed.ts` → 印出中止訊息、`EXIT=1`，未連線、未寫入。
- `DATABASE_URL="file:./dev.db" npx prisma db seed` → 正常完成。

**動到的檔案：** `prisma/seed.ts`

---

## 0-4b demo / google 帳號資料策略（查核 + 結論）

需求方決策：demo 帳號吃 mock；Google 使用者不吃 mock、自建；正式只開放 Google 登入。

**查核結果（結論：現況已符合，無需改碼）：**

1. **mock 全掛 demo 名下。** `prisma/seed.ts` 所有資料皆掛在 `demo-pet-pudding`（其 `userId = demo-user`）。demo 登入回傳的 user id 即 `demo-user`（`src/lib/auth.ts` 的 Credentials provider），兩者一致。

2. **無硬寫死 demo 寵物 id。** 全 `src/` grep `demo-pet-pudding` / `demo-pet` / `demoPet` / `DEMO_PET`：**零命中**。唯一出現 demo 字樣處為 `auth.ts`（demo 帳號 email/id 常數）、`ClientShell.tsx` 與 `DemoLoginForm.tsx`（登入表單預填 email），皆與「餵 demo 寵物資料給所有人」無關。各資料頁一律以 localStorage `drpet_currentPetId` 取寵物，currentPetId 來源於 `/api/pets`（已依登入者 `userId` 過濾，見 `src/app/api/pets/route.ts` GET：`where: userId ? { userId } : {}`）。

3. **Google 新使用者首登為乾淨狀態。** `ClientShell` 只寫入 `drpet_userId` / `drpet_nickname`，**不**寫 `drpet_currentPetId`、不觸發任何 seed。新 Google 使用者的 `/api/pets` 回空陣列 → `PetGuard` 將其導向 `/settings` 建立寵物。Google user id 來自 Google 帳號（與 `demo-user` 不同），故 `/api/pets` 不會回傳 demo 寵物，後續所有以 petId 過濾的 API 也撈不到 demo 資料。**demo 資料不會外洩給 Google 使用者。**

**小修：** 無（本項為純驗證，現況已正確）。

---

## 0-5a ProductReaction 接到 /diary

**做法：**
- 新增 `src/components/diary/DailyReactionCard.tsx`：沿用已下架 `/log` 頁的評分動線（讀 `/api/pet-products` 取使用中產品、`GET /api/reactions?petId=&date=` 取當日評分、`POST /api/reactions` upsert），含樂觀更新與 saving 轉圈。設計語言比照 diary 既有卡片（`bg-white rounded-2xl shadow-sm border border-slate-100`、`#C4714A` accent、good/ok/bad 三檔 pill）。
- 在 `src/app/diary/page.tsx` 週曆模式的「健康紀錄」區塊（`HealthLogSection` 之後）掛入 `<DailyReactionCard petId date={selectedDate} />`。
- 沿用既有 `/api/reactions`，未改動 API，遵守 `@@unique([petId, productId, date])`（POST 走 upsert）。

**驗證（本機 dev.db 讀取確認）：** demo 有 2 筆 PetProduct；今日（2026-06-04）已有 demo-prod-2 = `ok` 的 ProductReaction seed。卡片渲染當前日期，會列出兩個產品，其中 demo-prod-2 預選 ok，可點擊新增 / 修改評分（upsert）。

**註：** 週曆模式的 `selectedDate` 目前固定為「今日」（WeekCalendar 內部另有自己的選日狀態僅供 DayDetail，未回拋給頁面）。因此評分卡呈現「今日吃後感想」，符合原 `/log` 的「今日評分」語意。若日後要支援「對任意過去日期評分」，需讓 WeekCalendar 將選取日期回拋給頁面 state，屬後續增強，已在此標記。

**動到的檔案：** `src/components/diary/DailyReactionCard.tsx`（新）、`src/app/diary/page.tsx`

---

## 0-5b AIInsight 補顯示端（/nutrition 關聯分析）

**做法：**
- `src/app/api/analyze/route.ts` 新增 `GET`：`?petId=` 取該寵物最新一筆 AIInsight（`orderBy createdAt desc`）。原本只有 POST（寫入），故 AIInsight 是孤兒資料。
- 新增 `src/components/nutrition/CorrelationInsights.tsx`：讀 `GET /api/analyze?petId=`，顯示「可疑觸發因素 / 有益因素 / 建議行動 / 信心度 / 分析說明」。`suspectedTriggers` 相容字串陣列（seed）與物件陣列（AI 產出 `{name,...}`），以 `parseJson` 安全解析。無資料時顯示空狀態（🔍 + 引導文案）。
- 在 `src/app/nutrition/page.tsx` 於 `IngredientAnalysis` 之後掛入 `<CorrelationInsights petId={petId} />`。

**驗證：** dev.db 有 `demo-insight-1`（confidence medium、symptomType skin），GET 端可回傳；元件會渲染 rationale、觸發因素（含雞肉成分零食 / 環境塵蟎）、有益因素、建議行動。

**動到的檔案：** `src/app/api/analyze/route.ts`、`src/components/nutrition/CorrelationInsights.tsx`（新）、`src/app/nutrition/page.tsx`

---

## 0-5c /symptoms 抓錯寵物

**做法：** 將 `src/app/symptoms/page.tsx` 由 server component（`prisma.pet.findFirst({ orderBy createdAt asc })` 抓「最舊寵物」）改為 client component，改以 localStorage `drpet_currentPetId` 為準（並監聽 `storage` event 同步），透過 `GET /api/symptoms?petId=&limit=200` 取資料，於前端依類型彙整「最新 / 前一次」做趨勢比較。對齊全站其他頁（nutrition / diary / diet / products / scan）的選寵機制。

- 趨勢「前一次」由 desc 排序後取索引 1，等價於原本 `createdAt < latest.createdAt` 的查詢。
- 順手移除原碼中計算後從未使用的 `weekAgo` dead code。
- 無 currentPetId 時顯示「請先選擇或建立寵物檔案」空狀態。

**動到的檔案：** `src/app/symptoms/page.tsx`

---

## 0-5d WeeklyTask 確認（結論：目前無消費端）

**查核：** 全 `src/` 追蹤 `WeeklyTask` / `/api/tasks` / `TaskList` 的讀取端：

- `/api/tasks`（GET/POST/PATCH）存在且正常。
- 唯二會 `fetch('/api/tasks')` 的地方：
  1. `src/components/tasks/TaskList.tsx` —— 此元件**未被任何頁面 import**（全站 grep 僅命中其自身檔案）。
  2. `src/app/chat/page.tsx` —— 已標註為 v1 棄用、且已移出 BottomNav（被 `/nutritionist` 取代）。
- `/nutritionist`（現行 AI 諮詢頁）**不讀 WeeklyTask**：它只用對話方式「生成本週觀察計畫」（送一段 prompt 給 `/api/chat`），不寫也不讀 `WeeklyTask` 表，畫面上無「計畫記錄」清單元件。

**結論：** WeeklyTask 的 4 筆 seed **目前沒有正常導覽下的顯示端**（與 QA 報告 C 類「未測 / 未追到消費頁」一致）。可選方案交總指揮決定：
- (a) 把 `TaskList` 元件接進 `/nutritionist`（或日誌計畫區），讓 `/api/tasks` 的資料有顯示端；或
- (b) 視 WeeklyTask 為暫不啟用功能，移除其 seed 以免再次出現孤兒資料。

本次未自行接線或移除（不擅自改方向）。

---

## 未解 / 待注意事項

1. **lint 新規則 `react-hooks/set-state-in-effect`（Next 16 / React 19）**：`npx eslint` 會對「在 useEffect 內 `setPetId(localStorage.getItem(...))`」報 error。但這是**全站既有慣例**（`nutrition/page.tsx`、`diary/page.tsx`、`diet`、`products`、`scan` 皆如此），且在我動工前就已存在於這些檔案。為與周圍程式碼一致（coding-conventions），新寫的 `symptoms/page.tsx` 沿用相同寫法。專案要求的硬性 gate 為 `npx tsc -b`（已通過）。若要全面消除此 lint error，建議獨立一支「lint 收斂」工作統一處理（lazy init useState / 抽 hook），不混進本次 Phase 0。
2. **0-5a 週曆選日**：如上所述，目前評分卡固定針對「今日」。要支援任意日期評分需 WeekCalendar 回拋選取日期，屬後續增強。
3. WeeklyTask 消費端（0-5d）待總指揮拍板，見上。

---

## 動到的檔案清單

- `prisma/seed.ts` —— 加 seed 防呆（非 file: 即中止）
- `src/app/symptoms/page.tsx` —— 改用 currentPetId（client 化）
- `src/app/api/analyze/route.ts` —— 新增 GET 讀 AIInsight
- `src/app/nutrition/page.tsx` —— 掛入關聯分析區塊
- `src/app/diary/page.tsx` —— 週曆模式掛入每日評分卡
- `src/components/diary/DailyReactionCard.tsx` —— 新增（ProductReaction 評分卡）
- `src/components/nutrition/CorrelationInsights.tsx` —— 新增（AIInsight 顯示）
