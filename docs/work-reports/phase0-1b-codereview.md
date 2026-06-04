# Phase 0 / 1-B 寄信功能 — Code Review 報告

審查人：Code Reviewer
日期：2026-06-04
審查範圍（本次未 commit 改動）：
- `src/lib/email.ts`（新檔）
- `src/app/api/pets/[id]/invitations/route.ts`
- `src/app/diet/page.tsx`（刪 `SwitchPlanComingSoon`）
- `prisma/seed.ts`（新增 8 model demo 資料）
- `prisma/schema.prisma`（補回 `NewsArticle` / `DailyMealPlan` / `MealPlanItem`）

驗證動作：`npx tsc --noEmit` 通過（exit 0）；對照 migration SQL 與實際 `dev.db` 資料表。

---

## 🔴 必修

（無阻擋上線的嚴重 bug。）

目前沒有發現必修等級問題：型別檢查通過、schema 與 migration/DB 三方一致、寄信失敗已被 try/catch 包覆不會中斷邀請流程、seed 欄位與 @@unique 皆正確。下列「建議」項目不阻擋進入 commit 階段，但建議擇期處理。

---

## 🟡 建議

### 1. 前端完全忽略 `emailSent`，寄信失敗時仍顯示「邀請已送出」
- 位置：`src/app/settings/page.tsx:198`、`:204`
- 說明：route 已正確回傳 `emailSent`（`route.ts:109`），但 settings 頁 `res.json()` 的型別只解 `{ inviteUrl, error }`，且不論 `emailSent` 真偽一律 `showToast('邀請已送出')`。當 Gmail 憑證未設或寄信失敗時，使用者會誤以為信已寄出。
- 建議修法：解析 `emailSent`，為 false 時改顯示「邀請已建立，但信件寄送失敗，請改用下方 QR Code / 連結分享」。所幸現有流程會自動彈出 QR Code（`:207`），體驗不至於完全中斷，因此列為建議而非必修。

### 2. `NEXTAUTH_URL` / `AUTH_URL` 皆未設時，`inviteUrl` 變成相對路徑開頭
- 位置：`src/app/api/pets/[id]/invitations/route.ts:91-92`
- 說明：`baseUrl` fallback 為空字串，未設時 `inviteUrl = "/invite/<token>"`。寄到信箱的「接受邀請」連結會缺少網域而無法點擊；QR Code 也會編出無效 URL。改動本身比原本（會印出字面 `undefined/invite/...`）更好，但仍未在缺值時給出明確警告。
- 建議修法：當 `baseUrl` 為空時 `console.warn` 提示，或在部署檢查清單（release-checklist）中將 `NEXTAUTH_URL` 列為 1-B 必設環境變數。

### 3. 寄件人顯示名稱與檔內註解不一致
- 位置：`src/lib/email.ts:14`（`SENDER_NAME = '無敏毛孩 PurePaw'`）vs `:43` 註解（「�by件人固定顯示為『寵物隨行醫師 Dr.Pet』」）
- 說明：註解殘留舊品牌名 Dr.Pet，與實際送出的 `SENDER_NAME` 不符，易誤導後續維護者。
- 建議修法：更新 `:43` 註解為「無敏毛孩 PurePaw」。

### 4. `from` 直接讀 `process.env.GMAIL_USER`，未沿用已驗證的 `user`
- 位置：`src/lib/email.ts:49`
- 說明：`getTransporter()` 已在 `:20` 取得並驗證 `user` 變數；但 `sendEmail` 的 `from` 又重讀一次 env（`:49`），其型別為 `string | undefined`。雖然 `getTransporter()` 必先通過非空檢查才會走到這裡，邏輯上 `from` 不會真的是 undefined，但這是隱性耦合。
- 建議修法：讓 `getTransporter()` 回傳或匯出已驗證的寄件地址，或在 `sendEmail` 內以 `process.env.GMAIL_USER!` 之外的方式取得，減少重複讀 env。屬可維護性微調。

### 5. HTML 模板未對 `petName` / `inviterName` 做跳脫
- 位置：`src/lib/email.ts:66`、`:86-90`、`buildInviteHtml` 全段
- 說明：`petName`、`inviterName` 來自 DB（使用者自填的毛孩名 / 帳號名），直接內插進信件 HTML。若名稱含 `<` `>` `&` 等字元會破壞版面；理論上也存在 HTML 注入面向。收件人是被邀請者，注入風險程度有限（內容由邀請者輸入、寄給其本人指定的對象），故列建議。
- 建議修法：新增小型 `escapeHtml()`（`&<>"'` → entity）套用於 `petName`、`inviterName` 再內插。`inviteUrl` 由系統組裝、token 為 cuid，風險低但一併跳脫更穩。

---

## 🟢 OK（已覆核通過）

- **schema 補回的 3 個 model 與 migration / DB 一致**：`prisma/schema.prisma:383-427` 的 `DailyMealPlan` / `MealPlanItem` / `NewsArticle` 欄位、型別、預設值、FK onDelete（Cascade / SetNull）、`@@unique([petId, date])` 與 migration `20260603052650_add_meal_plan_news_article/migration.sql` 完全吻合；`dev.db` 經 `.tables` 確認三表皆存在。`Pet.dailyMealPlans`、`Product.mealPlanItems` 反向關聯也已補上（`schema.prisma:113`、`:143`）。
- **transporter 重用**：`email.ts:17,27-32` 以模組級單例 lazy-init，正確避免每封信重建連線。
- **密碼空白處理**：`email.ts:21` 以 `.replace(/\s+/g, '')` 去除 16 碼應用程式密碼間的空格，符合 Gmail 貼上習慣。
- **錯誤 log 不洩漏密碼**：`route.ts:105` 僅印錯誤物件，未印出 `GMAIL_APP_PASSWORD`；`email.ts` 也未將密碼寫入 log。
- **寄信失敗隔離**：`route.ts:96-106` try/catch 將寄信與邀請建立解耦，失敗只記 log 並回傳 `emailSent=false`，不影響邀請落地。
- **seed.ts 欄位一致性**：SymptomEntry / ProductReaction / ChatMessage / InstantAnalysis / NutritionAnalysis / AIInsight / WeeklyTask / NewsArticle 各欄位名稱與 schema 完全對應；JSON 字串欄位（`photos`、`suspectedTriggers` 等）皆以 `JSON.stringify(...)` 寫入，符合本專案 SQLite 慣例。
- **seed @@unique 遵守**：ProductReaction 以 `petId_productId_date` 複合鍵 upsert（`seed.ts:289`），6 筆資料的 (productId, date) 組合無重複；NewsArticle / 各 model 以固定 `demo-*` id upsert，可重複執行不爆鍵。
- **seed 排序穩定處理**：ChatMessage 同日訊息以 `${10 + i}:00` 錯開小時（`seed.ts:314`），i 範圍 0–3 對應 10–13 時，確保排序穩定，寫法合理。
- **dead code 刪除安全**：`SwitchPlanComingSoon` 已無任何引用（全 `src/` grep 無結果），`diet/page.tsx:1204-1205` 的 `switch` tab 現改用 `DietSwitchPlan`，刪除不影響功能。
- **依賴宣告完整**：`package.json` 已加入 `nodemailer` 與 `@types/nodemailer`，node_modules 中均存在。

---

## 結論

- **必修問題：0 件。** 無阻擋上線的嚴重 bug。
- 5 件建議多屬 UX 提示、註解與防禦性程式（HTML escape），不影響核心流程正確性。
- 型別檢查通過、schema/migration/DB 三方一致。**可進入文件同步與 commit 階段**；建議至少於同一波處理建議 #1（前端 `emailSent` 提示）與 #5（HTML escape），其餘可排入後續整理。
