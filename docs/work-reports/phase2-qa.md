# Phase 2 QA 驗收報告

- 驗收方式：靜態程式碼分析 + 本機 `dev.db` 唯讀查詢（`sqlite3 -readonly`）+ 對照 `docs/features/ui-mockups/` 設計圖。
- 驗收日期基準：2026-06-04（系統 currentDate）。
- 環境鐵則遵守：正式 Turso 庫**未**碰，所有 DB 查詢以 `DATABASE_URL="file:./dev.db" sqlite3 -readonly` 進行，無寫入。
- 角色邊界：只驗「行為層」是否成立，未審程式碼風格 / 細節（交 Code Reviewer）。未自行改任何程式碼或資料庫。

---

## 整體判定

| 項目 | 結果 |
|---|---|
| 2-1 重要日程（年度疫苗/體外驅蟲） | **PASS** |
| 2-2 未來日程表（醫療/美容 tab） | **PASS** |
| 2-5 飲食 ensurePlan 失敗硬化 | **PASS** |
| 2-7 配餐展開/收合 | **PASS**（與設計圖一致） |
| 2-6 手機 modal 捲動 | **PASS（靜態）／需實機** |
| 2-8 換食計畫 DietSwitchPlan 四區塊 | **PASS**（與設計圖一致；資料為 mock） |

統計：PASS 6 / FAIL 0 / 需實機補驗 1（2-6 真機捲動）。

---

## 本機 DB demo 數據快照（dev.db 唯讀）

Pet：
- `cmm1uh05n0000408gpu29shn0` 咚咚 → **無任何 Medication/Grooming/MealPlan 紀錄**
- `demo-pet-pudding` 布丁 → demo 資料齊全

MedicationRecord（布丁）：
- `2025-08-08` vaccines=`["八合一疫苗","狂犬病疫苗"]`、clinicVisits=`["年度健康檢查"]`、nextReminder=`2026-08-08`
- `2026-05-28` deworming=`["新疥爽（滴劑）"]`、nextReminder=`2026-06-27`

GroomingRecord（布丁）：
- `2026-06-01` medBath=1、nextReminder=`2026-06-15`

DailyMealPlan / MealPlanItem（布丁）：
- `2026-06-04`（今日）計畫存在，但 **MealPlanItem 中無 2026-06-04 的品項**；有品項的是 `2026-06-03`（晨/晚共 5 項）與 `2026-06-05`（晚 1 項）。

---

## 逐項驗收

### 2-1 重要日程（年度疫苗 / 體外驅蟲）— PASS

- `src/app/page.tsx` `fetchPetDaily` 對 `/api/medication-record` 與 `/api/grooming-record` **均帶 `petId`**（L346–353），符合 Phase 1-C `requirePetAccess`＋petId 必填的要求。
- `summarizeCare()`（L278–299）篩出 vaccines/deworming 非空的最新紀錄。對布丁：
  - 年度疫苗：最近一次 `08/08`，下次採 nextReminder `2026-08-08` → 顯示「下次 08/08」。
  - 體外驅蟲：最近一次 `05/28`，下次採 nextReminder `2026-06-27` → 顯示「下次 06/27」。
- 無資料時（如咚咚）顯示「尚未記錄」（L583、L597）。設計符合驗收標準。
- 生日格子無紀錄時 fallback `--`（L604）。

### 2-2 未來日程表（醫療 / 美容 tab）— PASS

- `medicalSchedule`（L415–437）：排程日期優先 `nextReminder`，否則 `record.date`，只保留「今天(含)以後」(`ts >= todayMidnight()`) 並依距今天數排序。
  - 布丁：deworming 紀錄 nextReminder `2026-06-27`（未來，約 +23 天）、vaccine 紀錄 nextReminder `2026-08-08`（未來，約 +65 天）→ **醫療 tab 顯示 2 筆**，標題以該紀錄各陣列彙整（如「新疥爽（滴劑）」「八合一疫苗、狂犬病疫苗、年度健康檢查」）。
- `groomingSchedule`（L439–460）：布丁 grooming nextReminder `2026-06-15`（未來，約 +11 天）→ **美容 tab 顯示 1 筆**「藥浴」。
- 空狀態：醫療/美容 tab 無資料時顯示「尚無日程記錄」（L818）；節日 tab 無生日顯示「尚無節日記錄」（L785）。符合驗收。
- 註：demo 醫療紀錄因有未來 nextReminder 才會進未來日程；若某筆紀錄 date 已過且無 nextReminder 則會被過濾掉（屬預期行為）。

### 2-5 飲食 ensurePlan 失敗硬化 — PASS

- `ensurePlan()`（diet/page.tsx L1142–1158）：POST `/api/meal-plans` 失敗（`!res.ok` 或 catch）回傳 `null`，不丟例外。
- `SessionAccordionWithPlan.tryEnsurePlan()`（L1406–1414）：拿到 `null` → `setPlanError('建立配餐計畫失敗，請檢查網路後重試')`。
- `SessionAccordion` 渲染分支（L512–550）：
  - `showForm && !planId && planError` → 顯示**紅色錯誤框 + 「重試」鈕（呼叫 onRetryPlan）+ 「取消」鈕**。
  - `showForm && !planId`（無錯誤、建立中）→ 顯示「建立配餐計畫中…」轉圈。
  - **關鍵**：失敗會走進 planError 分支，**不會停在無限轉圈**（轉圈僅在尚未回應的過渡狀態）。
- 後端正常時：`ensurePlan` 回傳 plan → `resolvedPlanId` 有值 → 顯示 AddItemForm，不受硬化影響。
- 結論：失敗 → 錯誤 + 可重試，正常路徑不受影響，符合驗收。

### 2-7 配餐展開 / 收合 — PASS（與設計圖一致）

對照 `diet-meal-session-expanded.jpg`：
- 展開列每項含：資訊圖示、**產品名**（L459）、**標籤**膠囊（L460–471）、**數量框 + 單位**（L476–479）、刪除鈕、**「↳ 預估約 N 克」**（L496–500）。
- 底部「**繼續添加項目**」虛線按鈕（L543–549）。
- 與設計圖（晨間 MORNING PLAN：自然本色…/狗飼料 無穀/2 平匙/預估約 10 克…「繼續添加項目」）逐欄吻合。

對照 `diet-meal-session-collapsed.jpg`：
- 收合摘要每項「• **產品名 (數量 單位)**」（L424–429，格式 `({quantity} {unit})`）。
- 與設計圖（晚間 NIGHT PLAN：自然本色亮白無穀鮭魚…(2 平匙) 等）一致。
- 空狀態：展開「尚未添加配餐項目」（L507）、收合「尚未添加配餐項目」（L435）。

備註（不阻擋）：設計圖收合右側括號為「(2 平匙)」緊貼數字，實作為「(2 平匙)」中間有空白；屬細微排版差異，非行為缺陷。

### 2-6 手機 modal 捲動 — PASS（靜態）／需實機

三個 modal（`MedicationModal`、`MeasurementModal`、`GroomingModal`）結構一致且正確：
- 外層 `fixed inset-0 z-50 flex flex-col justify-end`（底部彈出）。
- 面板 `bg-white rounded-t-3xl max-h-[90dvh] flex flex-col`（用 **dvh** 追蹤手機可視高度，避免被網址列截斷）。
- 標題列 `shrink-0`（固定不捲）。
- 內容區 `flex-1 min-h-0 overflow-y-auto overscroll-contain`（**可獨立捲動**，`overscroll-contain` 防止捲動穿透）。
- 底部含 **safe-area**：`paddingBottom: calc(2rem + env(safe-area-inset-bottom))`。
- 「完成紀錄」送出鈕位於可捲動內容區底部（非獨立 sticky footer），靠 safe-area padding 確保可捲到並點擊。
- 三者皆符合「內容區可捲 + 底部 safe-area」要求。

**⚠️ 需 frank 實機補驗**：dvh / env(safe-area-inset-bottom) 在 iOS Safari 與 Android Chrome 的實際表現（網址列收合、瀏海/底部手勢列遮擋、能否捲到並點到「完成紀錄」），靜態無法保證，需真機驗。

### 2-8 換食計畫 DietSwitchPlan 四區塊 — PASS（與設計圖一致）

對照 `diet-switch-plan-01.jpg`，`DietPlanActive`（DietSwitchPlan.tsx）四區塊齊全：
1. **當前測試商品**（L122–149）：燒瓶圖示 + 「測試中 (第 X/14 天)」徽章；卡片含品名「低敏無穀鮭魚配方 (鮮魚)」、目標「替換 [晚間餐點]…」、標籤「高品質蛋白 / 腸胃適應期」。✓
2. **7 天換食排程建議**（L152–172）：「今日建議比例」+ 比例標籤（如 1:3 (新:舊)）+ 進度條 + 「新配方 (25%) / 舊配方 (75%)」。✓
3. **身體特徵監控 (最近 7 日)**（L175–203）：大便分數 3.5「形狀理想」、抓癢頻率 2.1 次/日「趨勢：略微增加」（紅色惡化）。✓
4. **底部行動鈕**（L206–221）：「晉升日常飲食」（綠）/「淘汰並更換」（紅）。✓
- 與設計圖逐區塊吻合。

**重要備註（行為真實性，需總指揮知悉）**：DietSwitchPlan 為 **mock 展示**——
- `petId` 標註 `void petId // …目前為 mock 展示`（L231）；測試商品、比例、身體監控數值皆為硬編 mock 常數（`MOCK_TEST_PRODUCT`、`MOCK_BODY_METRIC`）。
- 是否有計畫由 **localStorage**（`drpet_hasPlan` / `drpet_planStart`）決定，未接後端、無 DB 持久化、不跟毛孩或實際換食資料連動。
- 「晉升 / 淘汰」皆只清除 localStorage（`endPlan`）。
- 視覺與四區塊驗收 PASS；但若驗收期待「真實資料驅動」則尚未達成（屬設計圖標註的「正式環境改接真實 API」未完成項）。

---

## 需 frank 實機測的項目

1. **2-6 三個 modal 真機捲動**：iOS Safari / Android Chrome 開 用藥 / 量測 / 美容 modal，確認內容可捲、能捲到並點擊底部「完成紀錄」、底部不被手勢列/瀏海遮擋。
2. **2-5 ensurePlan 失敗實測（選測）**：斷網 → 飲食頁展開時段並按「繼續添加項目」，確認出現紅色錯誤框 + 重試鈕（非無限轉圈）；恢復網路後按重試可成功建立。
3. **2-2 今日餐數 / 配餐顯示（觀察項）**：dev.db 今日（2026-06-04）DailyMealPlan 無品項（品項在 06-03 / 06-05），實機切到布丁的飲食頁今日三時段會是空的；首頁「今日已記錄 0 餐」。非缺陷，但 demo 展示前 frank 可考慮補今日品項以呈現飽滿畫面。
