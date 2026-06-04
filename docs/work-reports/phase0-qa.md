# Phase 0 QA 驗證報告 — demo mock data + 1-B 邀請寄信

**角色：** QA 測試工程師
**日期：** 2026-06-04
**驗證對象：** Phase 0-3「補 demo mock data」、1-B「共同飼主邀請寄信」
**驗證方式：** 唯讀查詢本機 `/workspaces/Dr.Pet/dev.db`（sqlite3），對照各頁面 / API route 的資料抓取邏輯做靜態行為分析。
**未啟動 dev server 逐頁目視；未對任何 DB 寫入；未改動程式碼。**

> ⚠️ 注意：repo 內有兩個 db 檔。seed 寫入的是根目錄 `dev.db`（`file:./dev.db`，356KB，6/4 03:47 更新），不是 `prisma/dev.db`（舊檔）。本報告所有查詢均針對根目錄 `dev.db`。

---

## 一、各 table 實際筆數（demo 寵物「布丁」= `demo-pet-pudding`）

| Model | 回報期望 | 實際 (dev.db) | 結果 |
|---|---|---|---|
| SymptomEntry | 5 | 5 | ✅ 一致 |
| ProductReaction | 6 | 6 | ✅ 一致 |
| ChatMessage | 4 | 4 | ✅ 一致 |
| InstantAnalysis | 3 | 3 | ✅ 一致 |
| NutritionAnalysis | 1 | 1 | ✅ 一致 |
| AIInsight | 1 | 1 | ✅ 一致 |
| WeeklyTask | 4 | 4 | ✅ 一致 |
| NewsArticle | 6 (demo) | 6 (id `demo-news-*`)，全表共 13 | ✅ demo 6 筆存在 |

**筆數結論：8 個 table 的 seed 筆數全部正確。** NewsArticle 無 petId 欄位（全站共用），demo 注入 6 筆，另有 7 筆既有資料，全表 13 筆，屬正常。

---

## 二、各頁面「是否真的撈得到並顯示」逐項分析

這是本次最關鍵的發現：**多筆 seed 資料即使存在 DB，對應頁面也撈不到 / 不會顯示。** 分為三類。

### A. 會正常顯示

| 頁面 | 資料來源 | 判定 | 說明 |
|---|---|---|---|
| `/scan` 即時分析歷史 | `GET /api/instant-analyze?petId=` | ✅ 會顯示 | 僅以 petId 過濾、無日期/狀態限制；3 筆全會回傳。前提：currentPetId 命中布丁（見風險 3）。 |
| `/nutritionist` 對話歷史 | `GET /api/chat?petId=` | ✅ 會顯示 | 僅 petId 過濾、`orderBy createdAt asc`；4 筆全顯示。 |
| `/news` 新聞列表 | `GET /api/news` | ✅ 會顯示 | `take:20`、`orderBy publishedAt desc`；全表 13 < 20，demo 6 筆 publishedAt 為 5/28~6/3（近日），會排在前面正常顯示。分類過濾也正確（food_safety/danger/health 各 2）。 |
| `/nutrition` AI 營養總結快取 | `GET /api/nutrition-ai?petId=` | ✅ 會顯示 | 僅 petId 過濾、取最新一筆；NutritionAnalysis(1) 會被讀出。前提：currentPetId 命中布丁。 |

### B. 可能 / 確定顯示不出來（附原因）

| 頁面 | seed 資料 | 判定 | 原因 |
|---|---|---|---|
| `/symptoms` | SymptomEntry 第 4 筆（`eye`） | ⚠️ **該筆永遠不顯示** | `src/app/symptoms/page.tsx` 的 `SYMPTOM_TYPES = ['tear','skin','digestive','oral','ear','joint','other']` 不含 `eye`。頁面只對這 7 種逐一查 `findFirst`，`eye` 不在清單→不查詢→不渲染。同時 `symptomTypeLabel()` 也無 `eye` 鍵。**seed 的 symptomType 用了不存在於 UI 列舉的 `eye`。**（其餘 skin/digestive/ear 4 筆可顯示，但因每類只取最新一筆，2 筆 skin 只會顯示較新的一筆。） |
| `/symptoms` | 全部 5 筆 | ⚠️ **可能整頁抓錯寵物** | 該頁用 `prisma.pet.findFirst({ orderBy:{ createdAt:'asc' } })` 取「最舊」的寵物，而本機最舊寵物是「咚咚」(2/25)，非布丁(6/3)。在本機環境下 `/symptoms` 會載入咚咚的資料，布丁的症狀 seed **完全不會出現**。此頁與其他頁（用 localStorage `drpet_currentPetId`）的選寵邏輯不一致。 |
| 日誌產品評分 (ProductReaction) | 全部 6 筆 | 🔴 **目前的「日誌」頁不顯示** | BottomNav 的「日誌」tab 指向 **`/diary`**，而 `/diary` 走 `GET /api/diary-records`，該 route 只回傳 `symptoms / usages / healthMetric`，**完全不查 ProductReaction**。唯一讀 ProductReaction 的是 `GET /api/reactions`，而它**只被 `src/app/log/page.tsx` 呼叫**；`/log` 已不在 BottomNav。因此正常導覽下使用者看不到這 6 筆評分。只有手動輸入 `/log` URL 才會顯示（且需 currentPetId=布丁、選到對應日期；reaction date 存為 `YYYY-MM-DD` 字串，API 以精確字串比對，格式相符）。 |
| `/nutrition` 關聯分析 (AIInsight) | AIInsight 1 筆 | 🔴 **任何頁面都不顯示** | 全域 grep 確認 **`AIInsight` 在 `src/app` / `src/components` 中無任何讀取點**。寫入它的 `POST /api/analyze` 也沒有任何 client 呼叫；`/nutrition` 實際走 `GET /api/analysis`（規則式即時計算，不讀 AIInsight）。此 seed 為孤兒資料。 |
| `/nutrition` 成分 / 營養分析主體 | （依賴 PetProduct/Product） | ⚠️ 部分顯示 | `/api/analysis` 規則式 `result` 可正常算出（布丁有 2 筆 isActive PetProduct）。但 demo 產品 `ingredientJson = "{}"`（空物件），`nutritional_facts` 為空 → `nutritionByProduct` 為空 → 頁面「各營養素」區塊與「重新生成 AI 營養總結」會無資料可分析（但既存的 NutritionAnalysis 快取仍會顯示，見 A 類）。 |

### C. WeeklyTask（4 筆）

本次未指定對應頁面，未追到消費端，標記 **未測**。seed 含已完成/未完成、過去/未來 dueDate，DB 筆數正確；若有頁面以 petId 撈取則應可顯示，但未驗證渲染條件。

---

## 三、1-B 邀請寄信邏輯面風險（`email.ts` + `invitations/route.ts`）

整體流程設計合理（先建邀請紀錄、再寄信、寄信失敗以 try/catch 吞掉並回傳 `emailSent:false`，不讓業務崩潰）。以下為邏輯面風險：

| # | 情境 | 目前行為 | 評估 |
|---|---|---|---|
| 1 | 缺 `GMAIL_USER`/`GMAIL_APP_PASSWORD` | `getTransporter()` throw → 被 route 的 try/catch 接住，`emailSent=false`，邀請仍建立、仍回 201+inviteUrl | ✅ 合理降級。邀請可用連結分享，不會 500。 |
| 2 | 寄信中途失敗（SMTP 錯誤/被擋） | 同上，吞錯、log、`emailSent=false` | ✅ 合理。前端可據 `emailSent` 提示「請手動複製連結」。 |
| 3 | targetEmail 已是成員 | 先查 `petMember`（join user.email），命中即回 400「該用戶已是此毛孩的成員」 | ✅ 合理。注意比對前已 `toLowerCase()`，與 email 正規化一致。 |
| 4 | 重複邀請同一 email | 先把舊 pending 設 expired，再建新邀請 | ✅ 合理，避免多筆有效 token。 |
| 5 | **`baseUrl` 為空** | `NEXTAUTH_URL ?? AUTH_URL ?? ''`；兩者皆未設時 `inviteUrl = "/invite/<token>"`（相對路徑） | ⚠️ **風險**：信件 / 回傳的連結會是相對路徑，在 email 中無法點擊、複製到瀏覽器也無效。建議缺 baseUrl 時擋下或記警告。 |
| 6 | **自我邀請**（owner 邀自己的 email） | 無防呆。若自己尚不是 petMember（理論上 owner 一定是），會建立指向自己的邀請 | ⚠️ 低風險邊界，建議加「不可邀請自己」檢查。 |
| 7 | targetEmail 對應的人尚無帳號 | `petMember` 查不到→正常建立邀請（受邀者日後註冊/登入後接受） | ✅ 合理，符合先邀後註冊流程。 |
| 8 | 寄信成功與否 vs 邀請已建立 | 即使 `emailSent=false`，邀請紀錄已寫入、token 已產生 | ✅ 合理，但需前端確實依 `emailSent` 給使用者正確提示，否則使用者以為信已寄出。（屬前端責任，未驗證前端。） |

email.ts 本身：transporter 單例、密碼去空白、寄件人具名、HTML 樣式齊全、註解清楚保留未來換 Resend 的擴充點，邏輯無誤。

---

## 四、整體判定

### 筆數驗證：**PASS** — 8 個 table seed 筆數與全端回報完全一致。

### 顯示驗證：**FAIL（部分）** — 筆數對，但有多筆 seed 實際無法在對應頁面顯示：

🔴 **確定看不到**
- ProductReaction(6)：「日誌」現指向 `/diary`，不讀 ProductReaction；唯一消費端 `/log` 已不在導覽。
- AIInsight(1)：全站無任何讀取點，孤兒資料。

⚠️ **部分 / 條件性看不到**
- SymptomEntry：`eye` 那筆永不顯示（UI 列舉無 `eye`）；且 `/symptoms` 用「最舊寵物」而非當前寵物，本機會抓到咚咚而非布丁，可能整頁看不到布丁症狀。
- `/nutrition` 成分營養區塊：demo 產品 `ingredientJson="{}"`，無 nutritional_facts。

✅ **確定可顯示**：InstantAnalysis(3)、ChatMessage(4)、NewsArticle(6)、NutritionAnalysis(1)（後二者需 currentPetId 命中布丁）。

❔ **未測**：WeeklyTask(4) 無對應消費頁可追，未驗證渲染。

### 1-B 寄信：**PASS（邏輯面）** — 降級、成員檢查、重複邀請處理皆合理。兩個建議改善：缺 baseUrl 時 inviteUrl 變相對路徑（風險 5）、無自我邀請防呆（風險 6）。

---

## 五、給總指揮的修正建議（交全端，QA 不自行改碼）

1. **ProductReaction 顯示斷鏈（最高優先）**：決定「日誌產品評分」應在 `/diary` 還是 `/log`。若 `/diary` 是新日誌頁，需讓它讀 ProductReaction（`/api/diary-records` 補上，或前端另呼叫 `/api/reactions`）；否則 6 筆 seed 與「日誌評分」功能在導覽上是死的。
2. **AIInsight 無人消費**：要嘛在 `/nutrition` 接上 AIInsight 顯示，要嘛此 seed 無意義（建議移除或補消費端）。
3. **SymptomEntry**：seed 把 `eye` 改為 UI 支援的類型（如 `tear`），否則該筆白做；並評估 `/symptoms` 改用當前寵物（localStorage）而非 `findFirst orderBy asc`，以與其他頁一致。
4. **demo 產品 `ingredientJson`**：若要展示營養素圖表，需填入含 `nutritional_facts` 的 JSON，目前是 `"{}"`。
5. **1-B**：缺 `NEXTAUTH_URL`/`AUTH_URL` 時擋下或警示；加自我邀請防呆。
