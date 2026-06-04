# Phase 2-1 / 2-2 首頁醫療・美容日程串接（全端）

**角色：** 全端工程師
**日期：** 2026-06-04
**範圍：** 待辦清單 Phase 2-1（首頁年度疫苗/體外驅蟲）、2-2（首頁未來日程表醫療/美容 tab）

---

## 做了什麼

### 2-1 首頁「年度疫苗 / 體外驅蟲」
- 原本 `src/app/page.tsx` 兩張卡寫死 `--`，沒抓資料。
- 改為抓該寵物的 `MedicationRecord`（`?recent=30`），由 `summarizeCare()` 計算：
  - **年度疫苗**：取最近一筆有 `vaccines` 的紀錄，顯示其日期（MM/DD）+ 下次到期。
  - **體外驅蟲**：取最近一筆有 `deworming` 的紀錄，同上。
  - **下次到期推估**：優先採該筆 `nextReminder`；無則以固定週期推估（疫苗 365 天、驅蟲 90 天）。
  - **無資料**：顯示「尚未記錄」（取代 `--`）。

### 2-2 首頁「未來日程表」醫療 / 美容 tab
- 原本醫療/美容 tab 永遠顯示「尚無日程記錄」。
- 改為：
  - **醫療 tab** 串 `MedicationRecord`、**美容 tab** 串 `GroomingRecord`。
  - 排程日期優先用 `nextReminder`，否則用紀錄 `date`；**只保留今天(含)以後**的項目，依「距今天數」升冪排序。
  - 醫療項目標題彙整 vaccines/deworming/prescriptions/clinicVisits 文字；美容彙整藥浴/碳酸泉/潔牙/自訂。
  - 每張卡顯示標題 + 「YYYY/MM/DD · 還有 N 天（或就是今天）」+ 類別徽章。
  - **真的無未來資料才顯示「尚無日程記錄」**。
- 沿用首頁既有取資料樣式：併入既有的 `fetchPetDaily(petId)`，已被 `usePollingRefresh` 涵蓋（聚焦/輪詢自動重抓）。

### API 擴充
- `src/app/api/grooming-record/route.ts` GET 新增 `?recent=N` 模式（鏡像 `medication-record` 既有寫法），回最近 N 筆，供首頁未來日程使用；保留原 `?date=` 模式不變。`requirePetAccess` 與 `petId` 必填維持。
- `medication-record` 已有 `?recent=N`，沿用未改。

### 權限注意（Phase 1-C）
- 兩支 API 皆有 `requirePetAccess` 且 `petId` 必填 → 首頁 fetch 一律帶當前寵物 `petId`（沿用既有 `currentPetId` / localStorage `drpet_currentPetId`）。

### Demo 資料（僅本機 dev.db）
為讓 demo 能看到兩功能，調整 `prisma/seed.ts`（並把 `update` 區塊補上新欄位，使重複 seed 能刷新既有列）：
- 新增疫苗紀錄（約一年前八合一/狂犬，`nextReminder` 設明年）。
- 驅蟲紀錄補 `nextReminder`（未來）。
- 美容紀錄補 `medBath` + 未來 `nextReminder`。
- 已用 `DATABASE_URL="file:./dev.db"` 重 seed 並查 DB 確認（**未碰正式 Turso**）。

驗證效果（today=2026-06-04）：
- 重要日程：疫苗 last 08/08 下次 08/08；驅蟲 last 05/28 下次 06/27。
- 未來日程表：醫療 = 驅蟲(還有23天) + 疫苗(還有65天)；美容 = 藥浴(還有11天)。

---

## 動到的檔案
- `src/app/page.tsx` — 型別/日期工具/`summarizeCare`、fetch med/grooming、2-1 兩張卡 UI、2-2 醫療/美容排程渲染。
- `src/app/api/grooming-record/route.ts` — GET 新增 `?recent=N` 模式。
- `prisma/seed.ts` — demo MedicationRecord/GroomingRecord 補 nextReminder 等（僅本機 dev.db）。

## tsc 結果
- `npx tsc --noEmit`：我負責的檔案（`page.tsx`、`grooming-record/route.ts`）**無錯誤**。
- 唯一報錯為 `src/app/diet/page.tsx`（`SessionAccordionProps` 缺 `planError`/`onRetryPlan`）→ 屬**並行作業中的其他 agent**（Phase 2-5/2-7 飲食頁）未完成的 WIP，**非本次範圍**，未觸碰。

## 未做 / 邊界
- 未動 diet/diary/modals（其他 agent 並行處理）。
- 未 commit、未改三份系統文件。
- 「重要日程」卡片目前無點擊導頁行為（沿用原本就只是視覺卡片；待辦未要求加入口）。
