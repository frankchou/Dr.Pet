# Phase 0 修正工作報告 — 全端工程師

**角色：** 全端工程師
**日期：** 2026-06-04
**範圍：** 修掉 Code Review / QA 在本波改動中提出、且屬「本波範圍內」的項目（A–D 共 7 點）。深層架構 bug（如 `/symptoms` 用最舊寵物、ProductReaction 顯示斷鏈、AIInsight 無消費端）已另列待辦，不在本次。

---

## A. 寄信模組 `src/lib/email.ts`

### A1. HTML escape（安全）
- 新增 `escapeHtml()`：`& < > " '` → 對應 HTML entity。
- 在 `buildInviteHtml()` 內先對 `petName`、`inviterName` escape 後再內插；`inviteUrl` 由系統組裝、token 為 cuid，風險低但一併 escape 更穩。
- `sendInviteEmail()` 的 `subject` 為純文字（非 HTML），不需 escape，維持原樣。

### A2. 註解品牌名
- L43 註解「寵物隨行醫師 Dr.Pet」→「無敏毛孩 PurePaw」，與實際 `SENDER_NAME` 一致。

### A3. `from` 沿用已驗證變數
- 新增模組級 `verifiedSender`，於 `getTransporter()` 建立 transporter 時一併設為通過非空檢查的 `user`。
- `getTransporter()` 改為回傳 `{ transporter, sender }`。
- `sendEmail()` 的 `from` 改用回傳的 `sender`，不再重讀 `process.env.GMAIL_USER`，消除隱性耦合。

**動到檔案：** `src/lib/email.ts`

---

## B. 邀請 route `src/app/api/pets/[id]/invitations/route.ts`

### B4. baseUrl 防呆
- `NEXTAUTH_URL` / `AUTH_URL` 皆未設（`baseUrl === ''`）時，加一行 `console.warn` 明確警告 inviteUrl 將為相對路徑、連結可能失效，方便部署時發現。其餘邏輯不變。

**動到檔案：** `src/app/api/pets/[id]/invitations/route.ts`

---

## C. 前端 `src/app/settings/page.tsx`

### C5. emailSent 提示
- `res.json()` 型別補上 `emailSent?: boolean`。
- 將原本一律 `showToast('邀請已送出')` 改為依 `emailSent`：
  - `true` → 「邀請信已寄出」
  - `false`（或未回傳）→ 「邀請已建立，但信件寄送失敗，可改用 QR Code 分享」
- 沿用現有 `showToast` 機制與自動彈出 QR Code 流程，未改其他行為。

**動到檔案：** `src/app/settings/page.tsx`

---

## D. seed 小修 `prisma/seed.ts`

### D6. SymptomEntry 的 `eye` 類型
- 對照 `src/app/symptoms/page.tsx` 的 `SYMPTOM_TYPES = ['tear','skin','digestive','oral','ear','joint','other']` 與 `symptomTypeLabel()`（`src/lib/utils.ts`），`eye` 不在支援清單內。
- `demo-symptom-4` 由 `eye` 改為 `tear`（淚腺/淚痕）—— notes 原本即為「輕微淚痕」，語意完全對應。

### D7. demo 產品成分
- 兩個 demo 產品的 `ingredientJson` 由 `"{}"` 補上完整範例成分，結構對照 `/api/extract` 輸出與 `/api/analysis` 期望（`ingredients` / `protein_sources` / `additives` / `functional_ingredients` / `nutritional_facts` / `raw_text`）：
  - `demo-prod-1`（鮭魚飼料）：6 筆 nutritional_facts（粗蛋白/粗脂肪/粗纖維/水分/粗灰分/Omega-3）。
  - `demo-prod-2`（腸胃益生菌）：5 筆 nutritional_facts（含活菌數）。
- 另將產品 upsert 的 `update` 由 `{}` 改為 `{ ingredientJson: ... }`，讓既有 demo 產品在重跑 seed 時也會被補上成分（避免舊環境停留在空物件）。

**動到檔案：** `prisma/seed.ts`

---

## 驗證結果

- **`npx tsc --noEmit`：** 通過（exit 0）。
- **重跑 seed（僅本機 `file:./dev.db`，未碰正式 Turso）：** 成功，各 table 筆數與預期一致（SymptomEntry 5 / ProductReaction 6 / ChatMessage 4 / InstantAnalysis 3 / NutritionAnalysis 1 / AIInsight 1 / WeeklyTask 4 / NewsArticle 6）。
- **資料抽查（本機 dev.db）：**
  - `demo-prod-1` / `demo-prod-2` 的 `ingredientJson.nutritional_facts` 長度分別為 6、5，`/nutrition` 營養圖表已有資料可呈現。
  - `demo-symptom-4` 的 `symptomType` 確認為 `tear`。
    - 註：因該列是前一輪以 `update:{}` 建立的舊資料，重跑 seed 不會改舊列，故手動將該既有列更新為 `tear`。**seed.ts 本身對全新 DB 的 `create` 已正確使用 `tear`**，新環境無需手動處理。

---

## 補充說明（誠實回報）

- 以下 QA / Review 提到的項目**不在本波範圍**，本次未處理（屬深層架構待辦）：
  - `/symptoms` 改用當前寵物（localStorage）而非 `findFirst orderBy asc`。
  - ProductReaction 在 `/diary` 的顯示斷鏈（日誌 tab 指向 `/diary`，不讀 ProductReaction）。
  - AIInsight 全站無消費端（孤兒資料）。
  - 自我邀請防呆（route 風險 6）。
- 未 commit、未動系統架構/機制/版本紀錄（交技術文件角色）。
