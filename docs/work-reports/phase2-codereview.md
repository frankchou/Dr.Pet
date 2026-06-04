# Phase 2 Code Review（未 commit 改動）

- 審查者：Code Reviewer
- 日期：2026-06-04
- 範圍：2-1/2-2 首頁日程、2-5/2-7 飲食頁、2-6 modal 捲動 + layout viewport、2-8 換食計畫
- 對照：三份 work-report、設計圖（`diet-meal-session-expanded/-collapsed.jpg`、`diet-switch-plan-01.jpg`）

## 結論

- **無 🔴 必修項**。
- `npx tsc --noEmit` → **exit 0，無型別錯誤**。
- 設計圖一致性：三張圖皆**高度吻合**（見各項評語）。
- **可以 commit**（含 dev.db；如不想帶 demo 資料變更，commit 時排除 `dev.db`）。
- 另有數個 🟡 建議（非阻擋），列於下。

---

## 🟢 OK / 正確

### 2-1/2-2 首頁日程（`src/app/page.tsx`）
- 🟢 petId 必帶：兩支 fetch（`page.tsx:347`、`page.tsx:352`）皆帶 `petId` + `recent=30`，符合 Phase 1-C `requirePetAccess` + petId 必填。
- 🟢 輪詢不重複：新 fetch 放在 `fetchPetDaily`（`page.tsx:333-354`），由 `currentPetId` effect 與 `refreshShared`/`usePollingRefresh`（`page.tsx:357-365`）共用同一路徑，無額外/重複觸發。
- 🟢 無資料正確：`summarizeCare()` 回 `null` 時兩張卡顯示「尚未記錄」取代 `--`（`page.tsx:577-585`、`589-597`）；未來日程無資料才落「尚無日程記錄」（`page.tsx:813-818`）。
- 🟢 排序/過濾：`isFuture`（今天含以後）+ `daysFromNow` 升冪（`page.tsx:415-461`），「就是今天 / 還有 N 天」顯示正確。
- 🟢 fetch 全有 `.catch(() => {})`，不吞致命錯誤、不崩潰。
- 🟢 日期工具（`parseYmd`/`parseDateMidnight`/`daysBetween`）以本地午夜為基準，避免 UTC 偏移誤判天數。

### API（`src/app/api/grooming-record/route.ts`）
- 🟢 `?recent=N` 鏡像 `medication-record` 既有寫法（`route.ts:21-30`）；`take` 用 `Math.max(1, parseInt||5)` 防呆；`petId` 必填、`requirePetAccess` 保留；原 `?date=` 模式不變（`route.ts:32-34` 改成 date/recent 擇一）。

### 2-6 modal 捲動 + layout
- 🟢 三個 modal 結構一致且正確：外層 `max-h-[90dvh] flex flex-col` 並移除外層 `overflow-y-auto`；內容區 `flex-1 min-h-0 overflow-y-auto overscroll-contain`，header 維持 `shrink-0`。`min-h-0` 是 flex child 能正確捲動的關鍵，有做對。
  - `MedicationModal.tsx:209/228`、`GroomingModal.tsx:168/187`、`MeasurementModal.tsx:145/164`
- 🟢 底部 `paddingBottom: calc(2rem + env(safe-area-inset-bottom))` 清開 home indicator；未設 viewport 時降級為 0 仍可捲到底。
- 🟢 桌面不退步：`dvh≈vh`、`flex-1` 捲動行為一致。
- 🟢 `layout.tsx:18-20` 補 `export const viewport: Viewport = { viewportFit: 'cover' }`，讓 `env(safe-area-inset-*)` 生效，正是 2-6 報告所缺的那一塊，補得對。

### 2-5/2-7 飲食頁（`src/app/diet/page.tsx`）
- 🟢 失敗硬化邏輯正確：`tryEnsurePlan()`（`diet/page.tsx:1404-1412`）先清錯誤、await，成功寫 `resolvedPlanId`、失敗設 `planError`。UI 四分支齊全（表單 / 錯誤框+重試取消 / 建立中 spinner / 新增按鈕，`diet/page.tsx:511-551`），不再無限轉圈。
- 🟢 後端正常時無行為退步：成功路徑與原本一致；`/api/meal-plans` 為 upsert，重試 idempotent。
- 🟢 設計圖一致（展開 `diet-meal-session-expanded.jpg`）：資訊圖示框、品名 + 標籤 pills、數量框+單位+刪除 X、「↳ 預估約 N 克」右對齊、虛線「繼續添加項目」——逐項對上。
- 🟢 設計圖一致（收合 `diet-meal-session-collapsed.jpg`）：bullet 清單 `• 產品名(截斷) (數量 單位)`、數量右對齊、空狀態「尚未添加配餐項目」——對上；已移除舊的「前 3 項 + 等 N 項」摘要。
- 🟢 圖示（`InfoIcon`/`XIcon`/`ChevronUp/Down`/`Plus`）皆檔內定義，無漏 import。

### 2-8 換食計畫（`src/components/diary/DietSwitchPlan.tsx`）
- 🟢 設計圖一致（`diet-switch-plan-01.jpg`）四區塊全到位且版面吻合：
  1. 當前測試商品：flask header + 藍色「測試中 (第 N/14 天)」badge + package icon + 品名/目標/兩標籤。
  2. 7 天換食排程建議：calendar header + 「今日建議比例」+ `1:3 (新:舊)` + 藍色進度條 + 新/舊百分比。
  3. 身體特徵監控 (最近 7 日)：chart header + 大便分數 3.5(理想) / 抓癢頻率 2.1次/日(惡化紅字、趨勢紅字)。
  4. 底部兩鈕：橄欖綠「晉升日常飲食」+ 白底紅字「淘汰並更換」。
- 🟢 `dayCount` 由 `startDate` 推算並 `Math.min(14)` 封頂，day4→ratio≈0.29→quarters=1→「1:3」與圖一致；非寫死。
- 🟢 hydrate spinner（`DietSwitchPlan.tsx:262-269`）避免 localStorage 閃爍。
- 🟢 入口黑卡與 localStorage 啟停邏輯維持不變；移除已不再使用的 `RecCard`/`RecommendedProduct`/`/api/recommend` 抓取，無遺留死碼（除下方 formula 一項）。

### seed（`prisma/seed.ts`）
- 🟢 改動正確：驅蟲補 `nextReminder`、新增疫苗紀錄、美容補 `medBath`+`nextReminder`；`update` 區塊也補了新欄位，使重複 seed 能刷新既有列。

---

## 🟡 建議（非阻擋）

1. **`TestProduct.formula` 為死資料** — `DietSwitchPlan.tsx:14` 定義、`:32` 賦值，但 UI 從未渲染（畫面用 `product.name`）。建議移除 `formula` 欄位與 mock 值，或日後接真實資料時再補進畫面。屬慣例「不留無用程式碼」。

2. **seed 冪等性（既有模式延續）** — 新疫苗紀錄 id `demo-med-vaccine-${dateStr(-300)}`（`seed.ts`）以「今日」為基準計算日期字串，**換一天重 seed 會產生不同 id → 多一筆**，非嚴格冪等。`demo-med-${dateStr(-7)}`、`demo-groom-${dateStr(-3)}` 本來就有同樣性質，故此為延續既有模式、非新引入問題；若要嚴格冪等，建議改用固定 id（不含浮動日期）。

3. **ESLint：2 個 error 為既有模式、非本次新增** —
   - `DietSwitchPlan.tsx:114` `react-hooks/purity`（render 內呼叫 `Date.now()`）：原檔 line 53 即存在。
   - `DietSwitchPlan.tsx:240` `react-hooks/set-state-in-effect`（hydrate effect 內 setState）：原檔 line 152-153 即存在。
   兩者皆為重寫前就有的寫法，未因本次改動惡化。`page.tsx` 另有 3 個 `no-unused-vars` warning（`IngredientAnalysis`/`SvgHeart`/`HealthMetric`），亦屬既有。建議列入後續技術債清理，不阻擋本次。

4. **首頁未來日程卡無點擊導頁** — 2-1 重要日程卡 `cursor-pointer` 但無 onClick（沿用原樣式），待辦未要求入口，記錄即可。

5. **dev.db 一併變更** — 屬 demo 資料（seed 結果）。commit 前確認是否要納入版控；若不想帶資料變更，commit 時排除 `dev.db`。

---

## 回報摘要
- 必修：**無**。
- tsc：**通過（exit 0）**。
- 設計圖：三張**皆一致**。
- 可否 commit：**可**（注意 🟡5 的 dev.db 取捨；🟡1 死碼建議順手清）。
