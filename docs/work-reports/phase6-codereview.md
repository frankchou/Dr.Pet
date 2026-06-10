# Phase 6 飲食頁測試回饋修正 — Code Review

**角色：** code-reviewer
**日期：** 2026-06-10
**審查範圍：** Phase 6-1（錯誤回報真功能）/ 6-2（數量編輯）/ 6-3（輪詢不閃爍）/ 6-4（綜合報告改造 + demo 分流）
**對照文件：** `docs/待辦清單.md` Phase 6、兩份全端工作報告

## 審查檔案
- `src/app/api/product-report/route.ts`
- `src/lib/email.ts`
- `src/components/diary/AddItemModal.tsx`
- `src/app/api/meal-plans/[id]/items/route.ts`
- `src/app/diet/page.tsx`
- `src/lib/demoAnalysis.ts`、`src/app/api/analysis/route.ts`
- `src/components/nutrition/AlternativeRecommendations.tsx`

---

## 總結

整體實作品質高、貼合規格。驗權、demo 分流、樂觀更新回滾、HTML 跳脫等核心點皆正確到位。
**無 🔴 必修（阻擋上線）問題。** 發現 0 個必修、4 個應修（🟠）、5 個建議（🟡）。
唯一接近紅線的是「既有 3 個 eslint 錯誤未修」——評估後列為 🟠（見 #6），因會卡 `npm run lint` 綠燈、且其中一個 setState-in-effect 與本次 6-2 數量流同檔同元件，宜一併處理。

---

## 重點檢查結論（對應指派的 6 項）

1. **demo 分流正確性 — ✅ 通過**
   - 四端點 demo 行為正確：`/api/analysis`（GET、規則式）通過 `requirePetAccess` 後 `isDemoUser` → 回固定 `DEMO_ANALYSIS`；`/api/recommend`、`/api/analyze`、`/api/nutrition-ai` 的 demo gating 都放在 **POST**（真正生成處），GET 僅讀已存結果或回 null，分流位置正確（demo 按下生成才落 mock，符合「歷史/GET 正常」設計）。
   - 錯誤回報 demo「真做」確認無誤：`product-report/route.ts` 無 demo 早退，所有帳號都 `productErrorReport.create` + 寄信，信件帶 `isDemo` 欄位區分來源 —— 完全照規格。
   - `DEMO_ANALYSIS` 結構與正常路徑回傳 body 對齊（pet/result/nutritionByProduct/analyzedAt），且兩款示意產品名與替代品推薦的 `forProduct` 對得起來。

2. **驗權 — ✅ 通過**
   - PATCH 數量：`requirePetAccessByRecord('dailyMealPlan', planId, …)` 依 plan 的 pet 驗權，再 `findFirst({ id: itemId, planId })` 確認 item 屬該 plan，雙重防越權，正確。
   - `product-report`：`auth()` → 無 userId 回 401；`product.findUnique` 防孤兒回報。無越權風險（回報只寫自己 userId）。

3. **安全（email 跳脫 + 環境前綴）— ⚠️ 大致良好，1 處 🟠**
   - HTML 內文所有使用者輸入（productName/brand/note）皆經 `escapeHtml`，正確。
   - **信件主旨（subject）未跳脫/未過濾換行** → 見 🟠 #1（header injection 理論風險）。
   - 環境前綴 `DATABASE_URL?.startsWith('file:')` 判斷見 🟡 #7（可靠但有邊界假設）。

4. **6-3 isSamePlan — ✅ 通過，1 處 🟡**
   - 比對 plan id + 各品項 id/session/quantity/unit/estimatedGrams/tags/名稱，且依 id 排序避免順序誤判，邏輯正確、不會漏掉真實變動（漏更新風險已避開）。
   - `tags` 以字串參考相等比較見 🟡 #8（理論上會「誤判為不同」而多更新一次——偏安全方向，可接受）。

5. **6-4 樂觀更新回滾 / 重複 GET / 空狀態 — ✅ 通過，含 🟠 #2、🟡 #9**
   - 數量樂觀更新：先 `onItemQuantityChanged(next)`，PATCH 失敗回滾 `prev` + alert，正確。
   - `AlternativeRecommendations` 與 `IngredientAnalysis` 各打一次 `GET /api/analysis` → 見 🟠 #2（同頁重複請求）。
   - 空/錯誤狀態處理完整（無風險產品整塊不顯示、recError 顯示、loading spinner）。

6. **既有 3 個 eslint 問題 — 🟠 #6**（評估見下）

---

## 🟠 應修

### 🟠 #1 — 錯誤回報信件主旨未過濾換行（header injection 理論風險）
**檔案：** `src/lib/email.ts:104`
```ts
const subject = `${envPrefix} PurePaw 產品資料錯誤回報：${productName}`
```
`productName` 來自使用者/AI 輸入（`AddItemModal.createStandardizedProduct` 直接帶 `product.name`），未經清洗即放進 SMTP 主旨。nodemailer 通常會對 header 做編碼，但「主旨含 `\r\n`」屬已知 header-injection 面，且內文已嚴謹跳脫、主旨卻沒處理，不一致。
**建議修法：** 在組 subject 前去除換行並截長度，例如
`const safeName = productName.replace(/[\r\n]+/g, ' ').slice(0, 120)`，主旨用 `safeName`。

### 🟠 #2 — `/api/analysis` 在報告本體被重複 GET 兩次
**檔案：** `src/components/nutrition/AlternativeRecommendations.tsx:53`、`src/components/home/IngredientAnalysis.tsx:320`
開啟 `DetailedReportModal` 時，`IngredientAnalysis` 與 `AlternativeRecommendations` 各自 `GET /api/analysis?petId=`，同一份規則式分析跑兩遍（真實帳號每次都重算成分、查 PetProduct/usage/symptom）。工作報告已誠實標記為「可接受代價」，demo 走 mock 無成本，故列 🟠 非 🔴。
**建議修法（任一）：**
- 由 `DetailedReportModal` 父層抓一次 analysis，以 prop 傳給兩個子元件（須改 `IngredientAnalysis` 介面，改動較大）；或
- 若短期不改，至少在報告元件層級加一個極簡記憶（同 petId 短時間內共用結果）。
- 短期可先不動（行為正確、僅效能），但應記入未來功能。

### 🟠 #3 — PATCH 數量驗證未限制上界 / 小數位
**檔案：** `src/app/api/meal-plans/[id]/items/route.ts:78`
目前僅驗 `> 0` 有限數字，可存入如 `0.0001` 或 `999999`。前端 `QuantityInput` 用 `step={0.5}`/`min={0.5}` 引導，但 API 是信任邊界，前端可被繞過。
**建議修法：** 加上界與合理化，例如 `quantity > 0 && quantity <= 9999`，必要時 `Math.round(quantity * 2) / 2` 對齊 0.5 級距（與 POST 的 `quantity ?? 1` 行為一致即可）。

### 🟠 #4 — `MealPlanItem.tags` 在 PATCH/型別上的不一致風險（連帶 isSamePlan）
**檔案：** `src/app/diet/page.tsx:152`（isSamePlan）、`src/app/api/meal-plans/[id]/items/route.ts`
`isSamePlan` 以 `ai.tags !== bi.tags` 比較，假設 `tags` 為同型別的字串（DB 存 JSON 字串）。POST item 時 `tags: JSON.stringify(...)`，但前端 `MealPlanItem` 型別若把 tags 視為 `string[]`，兩邊型別不一致時比較恆為 true（每次都判定不同→多更新）。請確認前端 `MealPlanItem.tags` 與後端回傳實際型別一致。
**建議修法：** 統一 `tags` 在前端型別與 API 回傳的形態（皆字串或皆陣列），isSamePlan 比較前正規化（如 `JSON.stringify(parseJson(tags))`）。屬偏安全方向（多更新非漏更新），故 🟠。

### 🟠 #6 — 既有 3 個 eslint 錯誤未一併處理
**檔案：** `src/app/diet/page.tsx:1007`（×2，`react/no-unescaped-entities`）、`:1663`（`react-hooks/set-state-in-effect`）
`npx eslint` 實測確認 3 個 error。雖屬「既有、非本次新增」，但：
- 它們會讓 `npm run lint` 無法綠燈，依專案發版慣例可能卡 release-checklist；
- `1663` 的 setState-in-effect 正落在 `SessionAccordionWithPlan`，與本次 6-2 數量編輯同元件、同一個 `plan` 同步路徑，屬「順手且低風險」可清。
**評估：** 列 🟠（應修），建議本批一併修：
- `1007`：`"{result.expertComment}"` 內的中括引號改用 `&quot;` 或 `{'"'}` 包裹。
- `1663`：`useEffect(() => { if (plan?.id) setResolvedPlanId(plan.id) }, [plan?.id])` 改為在 render 期間以 `plan?.id` 直接衍生（移除 effect），或以 key 重置；最小修法可改成把 `resolvedPlanId` 直接取 `plan?.id ?? localState`。
> 若 frank 傾向「既有問題另開單」，則降為 🟡；但因會影響 lint 綠燈與發版，預設列必須處理的 🟠。

---

## 🟡 建議

### 🟡 #7 — 環境前綴判斷依賴 `DATABASE_URL` 前綴
**檔案：** `src/lib/email.ts:103`
`startsWith('file:')` → `[測試]`，否則 `[正式]`。目前 dev 用 `file:`、Turso 用 `libsql:`，判斷成立。但 staging/preview 若也指向非-file DB 會被標 `[正式]`，且邏輯藏在 mailer。
**建議：** 改用顯式環境旗標（如 `process.env.APP_ENV` 或 `NODE_ENV === 'production'`）更直觀；至少在常數集中定義，避免散落。

### 🟡 #8 — isSamePlan 的 tags 字串參考比較
**檔案：** `src/app/diet/page.tsx:152`
見 #4，方向安全（誤判→多一次更新，不會漏）。輪詢場景下可接受，記錄即可。

### 🟡 #9 — `AlternativeRecommendations` GET 分析失敗時靜默
**檔案：** `src/components/nutrition/AlternativeRecommendations.tsx:53-56`
`GET /api/analysis` 失敗時 `.catch(() => {})` 完全吞錯，且 `analysis` 維持 null → `riskyProducts` 為空 → 整塊不顯示。使用者無法分辨「真的沒風險」與「分析載入失敗」。
**建議：** 載入失敗時設一個 error 狀態，至少在有風險產品的情境提供「重試」或淡提示（與既有 recError 風格一致）。

### 🟡 #10 — DELETE 數量/刪除失敗在前端靜默降級
**檔案：** `src/app/diet/page.tsx:362`（handleDelete catch 靜默）
數量 PATCH 失敗有 alert 回滾，但刪除失敗只 `// 靜默降級` 且已呼叫 `onItemDeleted`（UI 已移除）→ 若後端失敗，畫面與 DB 不一致直到下次輪詢。
**建議：** 與數量一致，刪除也採「失敗回滾 + 提示」，或刪除成功後才 `onItemDeleted`。

### 🟡 #11 — `expertComment` mock 文案含「示磷值達臨界」醫療性陳述
**檔案：** `src/app/diet/page.tsx:191`
demo mock 文案直接給出近似診斷語氣（「磷值達臨界，應增水代謝」）。非本次改動引入，但 demo 對外展示時建議軟化措辭、保留 `VET_REFERENCE_SCOPE` 精神（僅供參考、非診斷）。屬內容/合規層建議，記錄供 copywriter / legal 評估。

---

## 已驗證良好（不需改）
- PATCH/DELETE/POST 三動詞皆 `requirePetAccessByRecord` 驗權 + item 屬 plan 二次確認。
- `product-report`：DB 寫入成功即回 `{ ok: true }`，寄信 try/catch 不阻斷 API（符合規格）。
- email HTML 內文全欄位 `escapeHtml`。
- 樂觀更新（數量）回滾正確；`QuantityInput` 以 `useEffect([value])` 同步外部回滾值、commit 時擋空/非正數。
- `isSamePlan` 排序後逐欄比對，不會漏真實變動。
- demo 四端點分流位置正確，`DEMO_ANALYSIS` 結構對齊。

---

## 回報摘要
- **🔴 必修（阻擋上線）：0**
- **🟠 應修：4**（#1 主旨換行、#2 重複 GET、#3 數量上界、#4 tags 型別一致；另 #6 既有 eslint 視 frank 決策可列第 5 個應修）
- **🟡 建議：5**（#7~#11）
- **無阻擋上線的嚴重問題**；建議至少處理 #1（安全）、#3（信任邊界）、#6（lint 綠燈/發版）後再交付。
