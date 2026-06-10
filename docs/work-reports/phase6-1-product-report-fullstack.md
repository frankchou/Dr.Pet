# Phase 6-1 錯誤回報真功能 — 全端工作報告

**角色：** 全端工程師
**日期：** 2026-06-10
**範圍：** 待辦 Phase 6-1（飲食頁產品卡片「錯誤回報」假按鈕 → 真功能：DB 落地 + Email 通知）

---

## 摘要

把 `AddItemModal.tsx` 產品卡片的「錯誤回報」從只寫入 DB（且 demo 跳過）的半成品，補成符合 frank 規格的完整功能：

1. **DB model `ProductErrorReport`** — 已存在於 schema 與 dev.db（migration `20260610110000_add_product_error_report` 已套用、已 resolve）。本次確認其結構與規格一致，未再變更。
2. **`POST /api/product-report` 改寫** — 改為**所有帳號（含 demo）皆寫入 DB**，寫入後**寄信**到 `purepaw.notify@gmail.com`，主旨依環境加 `[測試]`/`[正式]` 前綴；寄信失敗 try/catch 記 log、不影響 API 成功。
3. **`src/lib/email.ts` 新增 `sendProductErrorReportEmail()`** — 沿用既有 Gmail SMTP（`sendEmail` / `escapeHtml`），未另起一套 mailer。
4. **前端** — `AddItemModal.tsx` 早已呼叫 `/api/product-report`（無殘留 `alert`）；本次僅更新一段過時註解以對齊新後端行為。

`npx tsc --noEmit` 與 `npm run build` 皆通過，`/api/product-report` 已出現在 build route 表。

---

## 改動檔案清單

| 檔案 | 變更 |
|---|---|
| `src/app/api/product-report/route.ts` | **改寫**：移除 demo 早退；改為所有帳號寫 DB；查產品名/品牌；寫入後呼叫 `sendProductErrorReportEmail`（try/catch 不阻斷） |
| `src/lib/email.ts` | **新增** `sendProductErrorReportEmail()` + `buildProductReportHtml()`；主旨依 `DATABASE_URL` 前綴 `[測試]`/`[正式]`；內文帶產品名/品牌/productId/回報者 userId/是否 demo/note；沿用既有 `sendEmail` + `escapeHtml` |
| `src/components/diary/AddItemModal.tsx` | **僅改註解**：`handleReport` 上方過時的「demo 不落地」說明改為「所有帳號皆寫 DB 並寄信」 |
| `docs/待辦清單.md` | Phase 6-1 四子項改 `[V]`、標驗證；進度總覽 Phase 6 狀態更新 |
| `prisma/schema.prisma` | 無新增（model `ProductErrorReport` 先前已建，本次確認一致） |

> 三份系統文件（系統架構/機制/版本紀錄）**未動**，依分工留給 tech-writer；未 commit。

---

## migration 實際怎麼跑的

- migration `20260610110000_add_product_error_report` **先前已建立並套用**：
  - migration SQL 為手寫 `CREATE TABLE "ProductErrorReport"`（含 `productId` FK ON DELETE CASCADE）。
  - 套用方式為**非破壞性**：`prisma db execute` 建表 + `prisma migrate resolve --applied`（避免 `migrate dev` reset 清空 dev 資料），與 frank 指定的手法一致。
- 本次驗證：
  - `sqlite3 dev.db ".tables"` → `ProductErrorReport` 存在。
  - `_prisma_migrations` 內該筆 `finished_at` 非空 → 標記為 **applied**。
  - `npx prisma generate` 成功，client 具備 `prisma.productErrorReport`。
- **正式庫（Turso）**：留 deploy 時跑 `prisma migrate deploy`（新增表、對既有資料無破壞性），對應待辦 6-5。本次未對正式庫做任何寫入。
- 註：`npx prisma migrate status` 因 `.env` 的 `DATABASE_URL` 指向 Turso（libsql scheme，CLI 不識別）會報 P1013，屬已知現象，不影響 dev.db 已套用的事實。

---

## 關鍵決策

1. **Email 主旨環境前綴放在 helper 內判斷**：`sendProductErrorReportEmail` 自行讀 `process.env.DATABASE_URL?.startsWith('file:')` 決定 `[測試]`/`[正式]`，呼叫端（route）不必重複此邏輯，與既有 `email.ts` 自包裝主旨的風格一致。
2. **demo 也寫 DB 也寄信**（遵 frank 規格，與舊版「demo 不落地」相反）：信件內文 `是否 demo` 欄位標示來源，方便人工分辨測試回報。FK 需產品存在；demo 產品為 seed 資料，前端 `createStandardizedProduct` 會先建立/取得 Product 再帶 productId。
3. **寄信失敗不讓 API 失敗**：DB 寫入成功即回 `{ ok: true }`，寄信包在 try/catch 內 `console.error`，符合「DB 已寫入就回成功」要求。
4. **沿用既有 mailer**：在 `src/lib/email.ts` 既有 `sendEmail`/`escapeHtml` 上加一個 sender 函式，未引入新套件或新檔案。HTML 各使用者輸入欄位（產品名/品牌/note）皆經 `escapeHtml`。
5. **前端維持現狀**：`AddItemModal.tsx` 的 `handleReport` 流程（先 `createStandardizedProduct` 拿 productId → POST `/api/product-report` → 成功切 `reported`）已符合規格，無 `alert`，只修一行過時註解，避免動到另一位工程師正在改的範圍以外的東西。

---

## 驗證狀態

- ✅ `npx tsc --noEmit` 通過（無輸出）。
- ✅ `npm run build` 通過，`/api/product-report` 已在 route 表。
- ⏳ 實機寄信（收件匣確認 `purepaw.notify@gmail.com` 收到、主旨前綴正確）待 frank 在有 `GMAIL_USER`/`GMAIL_APP_PASSWORD` 的環境驗證。

> ⚠️ 旁註：build 過程中曾見另一位工程師 Phase 6-4 進行中的 `@/lib/demoAnalysis`（`src/app/api/analysis/route.ts`）短暫編譯錯誤，非本任務範圍；重跑後（其檔案到位）build 即綠燈。本任務未碰 `src/app/diet/page.tsx` 與 analysis 相關檔。
