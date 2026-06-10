# Phase 5-D 用藥/美容提醒（Web Push）— 全端工作報告

> 角色：全端工程師
> 範圍：用藥/美容提醒（併入原 3-2），週期欄位 + Modal 設定 UI + 每日 cron。
> 性質：本機實作，未 commit、未動三份系統文件、未碰正式庫。

## 一、做了什麼

### 1. Schema：週期欄位
- `MedicationRecord` 與 `GroomingRecord` 各新增 `reminderIntervalDays Int?`：
  - `null` = 一次性提醒（到期推完清 `nextReminder`）。
  - `>0` = 每 N 天循環（到期推完 `nextReminder` 順延一個週期）。
- Migration `20260610100000_add_reminder_interval_days`：
  - **非破壞性流程**（沿用上一個 push migration 的做法，避免 reset 清空 dev.db）：
    手寫 `migration.sql` → `prisma db execute --file` 套用 → `prisma migrate resolve --applied` 標記 → `prisma generate`。
    （`migrate dev` 因前次 migration 檔被改過會要求 reset，故改用此流程。）
  - migration.sql 內已註明：兩欄皆 nullable、對既有資料無破壞性，正式環境走 `prisma migrate deploy`。
- 驗證：`prisma migrate status` = up to date；以 Prisma client 查兩個 model 的 `reminderIntervalDays` 皆可讀，dev.db 既有 demo 資料完整未被清空。

### 2. POST route 接受新欄位
- `/api/medication-record`、`/api/grooming-record` 的 POST 在白名單加 `reminderIntervalDays`，僅 `> 0` 時保存，否則存 `null`（視為一次性）。`nextReminder` 兩 route 本來就已接受。

### 3. Modal「設定提醒」取代 alert
- 新增共用元件 `src/components/diary/ReminderSetter.tsx`（兩 Modal 共用，避免重複）：
  - 提醒日期（date input）+ 提醒頻率（「一次性」/ 若干週期快捷）。
  - 導出 `ReminderState`、`reminderToPayload()`，由 Modal 持有狀態並隨既有 POST 一併送出（少一次往返）。
  - 文案提示需先到「設定」開啟提醒推播。
- `MedicationModal.tsx`：移除 `alert('提醒功能即將推出')` 與未用的 `BellIcon`，掛入 `ReminderSetter`，週期快捷：每月（驅蟲）30、每季 90、每年（疫苗）365。
- `GroomingModal.tsx`：同上，週期快捷：每月 30、每兩月 60、每季 90。

### 4. Cron `/api/reminders/check`（新增，GET + POST）
- 授權沿用 `CRON_SECRET`（`Authorization: Bearer <CRON_SECRET>`），pattern 比照 `news/crawl`。
- 流程：
  1. 算「台灣今天結束」對應的 UTC 上界。
  2. 查 `MedicationRecord` / `GroomingRecord` 中 `nextReminder != null AND nextReminder <= 上界` 的紀錄。
  3. 每筆 → 取該毛孩 owner（`Pet.userId`）+ co_owner（`PetMember`）去重後的 userId → 對每位 `sendPushToUser(userId, payload, 'reminder')`（helper 內已過濾 `reminderEnabled`，demo 自動換 mock）。payload 導向 `/log`。
  4. 推完更新 `nextReminder`：一次性 → `null`；週期性 → 順延一個週期（過期多次時連推到未來，避免下次 cron 重判到期）。

### 5. vercel.json
- crons 陣列新增 `{ "path": "/api/reminders/check", "schedule": "0 0 * * *" }`（UTC 00:00 = 台灣 08:00）。

## 二、時區處理（重點）

- Vercel cron 以 UTC 執行；`0 0 * * *` = UTC 00:00 = 台灣 08:00，早上提醒當日待辦。
- `nextReminder` 由 date input 的 `'YYYY-MM-DD'` 經 route `new Date(str)` 存成 **UTC 午夜**（例 `'2026-06-10'` → `2026-06-10T00:00:00Z`）。
- 「今天到期」判定：`taiwanTodayEndUtc(now)` = 將 now 推進 8 小時取其 UTC 日期當「台灣今天」，再回推算出「台灣今天 23:59:59.999」對應的 UTC 時間點當查詢上界（`lte`）。
- 以上界 `lte` 而非單日區間，可同時涵蓋「今天到期」與「先前漏推（已過期）」的提醒，cron 漏跑一天也能補上。
- 已用 node 腳本驗證：以 UTC 00:00 觸發時，提醒日 = 台灣今天 → due=true；隔天 → false；昨天（過期）→ true。

## 三、一次性 vs 週期性

| | 設定 | 到期推播後 |
|---|---|---|
| 一次性 | `reminderIntervalDays = null` | `nextReminder = null`（不再提醒） |
| 週期性 | `reminderIntervalDays = N` | `nextReminder += N` 天（過期多次則連推到未來） |

- 週期典型：驅蟲每月（30）、疫苗每年（365）、定期美容每 1–2 月。
- demo：`sendPushToUser` 內對 demo userId 自動換成固定 mock 內容，cron 不需特別處理；`nextReminder` 仍照常更新。

## 四、驗證結果

- `npx tsc --noEmit`：通過（無輸出）。
- `npm run build`：`✓ Compiled successfully`，`/api/reminders/check` 已註冊為動態 route。
- Prisma 查詢：兩 model 的 `reminderIntervalDays` 可讀；dev.db 既有資料未被清空。
- 時區邏輯：node 腳本驗證通過（見上）。

## 五、未做 / 注意事項

- 未 commit、未更新三份系統文件（依指示，留總指揮 / 後續處理）。
- 正式庫未動：migration 已註明正式走 `prisma migrate deploy`。
- 真實 Web Push 端到端（OS 收通知）需 VAPID 金鑰 + 已訂閱裝置，屬設定頁/SW 既有範圍，本任務未在真機驗證實際送達。
- `CRON_SECRET` 與 cron 上線屬 release-checklist 範圍（Vercel 環境變數），本任務未設定正式環境。

## 六、檔案清單

**新增**
- `prisma/migrations/20260610100000_add_reminder_interval_days/migration.sql`
- `src/components/diary/ReminderSetter.tsx`
- `src/app/api/reminders/check/route.ts`

**修改**
- `prisma/schema.prisma`（兩 model 加 `reminderIntervalDays`）
- `src/app/api/medication-record/route.ts`
- `src/app/api/grooming-record/route.ts`
- `src/components/diary/MedicationModal.tsx`
- `src/components/diary/GroomingModal.tsx`
- `vercel.json`
