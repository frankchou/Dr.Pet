# Phase 0 工作報告 — 刪死碼 + 補 Demo Mock Data（全端）

**角色：** 全端工程師
**日期：** 2026-06-04
**對應待辦：** Phase 0 之 0-2（刪死碼 `SwitchPlanComingSoon`）、0-3（補 8 個 model 的 demo mock data）

---

## 一、做了什麼

### 任務 0-2：刪除死碼 `SwitchPlanComingSoon()`
- grep 全 `src/` 確認 `SwitchPlanComingSoon` 只在 `src/app/diet/page.tsx` 第 1002 行有**定義**，無任何呼叫點。
- 確認換食計畫頁實際使用的是 `DietSwitchPlan` 元件（`import DietSwitchPlan from '@/components/diary/DietSwitchPlan'`，於頁面 `<DietSwitchPlan petId={...} />` 渲染）。
- 該死碼函式只用內聯 JSX/SVG，未引入任何外部 import，因此刪除後無殘留未使用 import。
- 已刪除函式本體與其上方的「換食計畫佔位」分隔註解。grep 再確認 `src/` 已無 `SwitchPlanComingSoon` 殘留。

**結論：此函式確實可刪、已刪除。**

### 任務 0-3：補 Demo Mock Data（8 個 model）
全部沿用 seed.ts 既有的 upsert 風格、`dateStr()` helper、JSON 字串存 array 欄位，掛在既有 demo 寵物「布丁」（`petId = demo-pet-pudding`、`userId = demo-user`）。資料內容彼此呼應（皮膚/腸胃問題 → 症狀 → 產品評分 → 對話 → 關聯分析 → 觀察計畫），讓 demo 頁面看起來連貫。

| Model | 筆數 | 重點 |
|---|---|---|
| SymptomEntry | 5 | 涵蓋 skin / digestive / ear / eye 多類型，含 severity 與 side |
| ProductReaction | 6 | good/ok/bad 皆有，遵守 `@@unique([petId, productId, date])`，用 `petId_productId_date` 複合鍵 upsert |
| ChatMessage | 4 | user/assistant 交錯歷史對話，同日訊息以小時錯開確保排序 |
| InstantAnalysis | 3 | verdict 涵蓋 safe / caution / danger，`resultJson` 含 concerns/positives/ingredients |
| NutritionAnalysis | 1 | AI 深度分析快取，`resultJson` 完整、`productCount` 對應產品數 |
| AIInsight | 1 | skin 關聯分析，suspectedTriggers/helpfulFactors/recommendedActions 皆 JSON 字串 |
| WeeklyTask | 4 | 含已完成/未完成、過去/未來 dueDate |
| NewsArticle | 6 | 三分類各 2 筆（food_safety / danger / health），含 isUrgent 標記 |

欄位均以 `prisma/schema.prisma` 為準，無臆測。

---

## 二、過程中發現並一併處理的問題（請總指揮注意）

### 問題 A：`schema.prisma` 缺 3 個 model，與 DB／程式碼脫節（已修）
`NewsArticle`、`DailyMealPlan`、`MealPlanItem` 三個 model **存在於 migration**（`20260603052650_add_meal_plan_news_article`）與 DB 實表，且被程式碼引用（`/api/news`、`/api/meal-plans` 等），但**從未被寫進 `prisma/schema.prisma`**。因此 `npx prisma generate` 產出的 client 沒有 `newsArticle` 等存取子 —— NewsArticle 的 seed（以及 `/api/news` 執行期）原本根本無法編譯/運作。

處理：依 migration 的欄位定義，把這 3 個 model 補回 `schema.prisma`（含 Pet → `dailyMealPlans`、Product → `mealPlanItems` 反向關聯），`npx prisma validate` 通過，重新 `generate` 後 client 已具備 `newsArticle / dailyMealPlan / mealPlanItem`。

> 這是既有的 schema/DB 脫節問題，超出 0-2/0-3 原始範圍，但不修就無法完成 NewsArticle seed，故一併補上。**建議後續由技術文件/架構角色確認此補正並同步文件。**

### 問題 B：`.env` 的 `DATABASE_URL` 指向「正式站 Turso DB」（請務必注意）
`.env` 目前的有效 `DATABASE_URL` 是遠端正式庫：
`libsql://purepaw-prod-frankchou.aws-ap-northeast-1.turso.io`（且帶 `DATABASE_AUTH_TOKEN`）。
直接 `npx prisma db seed` 會把 demo 假資料**寫進正式站**。我第一次執行即連到該庫並報錯（正式庫缺 `HealthMetric` 表，代表正式庫也落後於 migration）。

我**沒有對正式庫做任何寫入或 migration**。改為明確指定本機 DB 執行 seed：
`DATABASE_URL="file:./dev.db" DATABASE_AUTH_TOKEN="" npx prisma db seed`

> ⚠️ 待總指揮決策：
> 1. seed 預設是否該指向正式庫，需要明確規範（建議 seed 僅限本機 dev.db，避免污染正式站）。
> 2. 正式站 Turso DB 落後 migration（缺 HealthMetric 等表），上線前需由 DevOps 對正式庫補跑 `migrate deploy`，但這屬 Phase 1/部署範圍，本次未動。

### 問題 C：本機 `dev.db` 也落後一個 migration（已修）
本機 `dev.db` 缺最後一個 migration `20260603065006_add_diary_health_logs`（無 `DailyHealthLog` 表），導致 seed 在既有第 3 段就失敗。我對本機 dev.db 執行 `DATABASE_URL="file:./dev.db" npx prisma migrate deploy` 補上該 migration（只動本機檔案），之後 seed 成功。

---

## 三、驗證結果

- **seed**：`DATABASE_URL="file:./dev.db" DATABASE_AUTH_TOKEN="" npx prisma db seed` → 成功，輸出
  `SymptomEntry 5 / ProductReaction 6 / ChatMessage 4 / InstantAnalysis 3 / NutritionAnalysis 1 / AIInsight 1 / WeeklyTask 4 / NewsArticle 6`，結尾 `✅ Seed 完成！`。
- **DB 抽查**：dev.db 內 demo-news 6 筆（food_safety 2 / danger 2 / health 2），各 model 筆數與輸出一致。
- **tsc**：`npx tsc --noEmit` → exit 0，無型別錯誤。
- **死碼**：`grep -rn SwitchPlanComingSoon src/` → 無殘留。

---

## 四、動到的檔案清單（供文件角色同步）

- `src/app/diet/page.tsx` — 刪除死碼函式 `SwitchPlanComingSoon()`。
- `prisma/seed.ts` — 新增 8 個 model 的 demo seed 區段（SymptomEntry / ProductReaction / ChatMessage / InstantAnalysis / NutritionAnalysis / AIInsight / WeeklyTask / NewsArticle）。
- `prisma/schema.prisma` — 補回缺漏的 `NewsArticle`、`DailyMealPlan`、`MealPlanItem` 三個 model，及 Pet/Product 的反向關聯（修正 schema 與 DB/程式碼脫節）。
- `docs/work-reports/phase0-deadcode-seed-fullstack.md` — 本報告。

（另：`dev.db` 本機資料庫檔被 migrate deploy + seed 更新；`node_modules/.prisma` 為 `prisma generate` 產物，皆非原始碼。）

---

## 五、未做 / 邊界

- 未自行 commit、未 push。
- 未更新 `系統架構.md / 系統機制.md / 版本紀錄.md`（依指示交由技術文件角色統一處理）。
- 未對正式站 Turso DB 做任何寫入或 migration（見問題 B，留給總指揮/DevOps 決策）。
- 待辦清單 0-3 提到「逐頁目視確認資料出現」屬 QA 驗收範疇，本次僅以 DB 查詢與 tsc 驗證，未啟動 dev server 逐頁目視。
