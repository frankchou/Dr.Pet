# Phase 2-4 日誌月曆/週曆互動修正 — 全端工程師工作報告

對象頁面：`/diary`（`src/app/diary/page.tsx`）
日期：2026-06-04
驗收 gate：`npx tsc --noEmit` 通過（已通過）

---

## A. 「有紀錄圓點」與「已紀錄天數」資料源統一

### 問題
圓點原本只看 ProductUsage（`page.tsx` 舊版 1250-1257：`fetch('/api/usages')`），demo 寵物（布丁）6 月沒有任何飲食紀錄 → 圓點永遠不顯示。

### 作法
- **新增聚合 API**：`src/app/api/diary-dates/route.ts`
  - `GET /api/diary-dates?petId=&yearMonth=YYYY-MM` → 回傳 `{ dates: string[] }`（該月「任何紀錄來源」的不重複日期）。
  - 聚合 7 種來源：DailyHealthLog、HealthMetric、MedicationRecord、GroomingRecord、MeasurementRecord（date 為 String，用 `startsWith` 前綴比對）＋ ProductUsage（date 為 DateTime）＋ SymptomEntry（createdAt 為 DateTime，用當月 UTC 區間 `gte/lt` 比對）。
  - DateTime 來源以 `toISOString().slice(0,10)` 轉為 YYYY-MM-DD 後 union 進同一個 Set。
- **頁面改抓聚合 API**（`page.tsx` recordedDates effect）：
  - 月曆模式抓顯示月份；週曆模式抓「該週可能跨到的月份」（最多兩個，週起訖各取一個 yearMonth），結果 flat 後 union 成單一 `recordedDates`。
  - 月曆與週曆共用同一份 `recordedDates`，圓點一致。
- **已紀錄天數對齊圓點**：`MonthHealthOverview` 新增 `recordedCount` prop，頁面傳入 `recordedDates.size`（union 後的當月不重複天數）。「已記錄 X / 當月天數」徽章改用此值，與圓點同義。

### 健康良好/異常維持 DailyHealthLog（重要邊界）
- `MonthHealthOverview` 內把原本叫 `recordedCount`（DailyHealthLog 天數）改名為 `healthLogDays`，健康良好/異常仍以它與 `hasAbnormality()` 計算：
  - `healthLogDays = DailyHealthLog 不重複天數`
  - `abnormalDays = 有異常觀察的日誌天數`
  - `healthyDays = healthLogDays − abnormalDays`（同源相減，**必不為負**）
- 「已記錄」徽章 = union 天數（`recordedCount = unionRecordedCount ?? healthLogDays`）。
- 白話摘要改為語意清楚的三段式：
  > 本月 **N** 天有紀錄，其中 **M** 天有健康日誌、**X** 天狀況良好（，**K** 天有異常觀察）。
  避免把「只有飲食/其他紀錄的日子」誤算成健康良好。

---

## B. 週曆點選日期 → 下方紀錄連動

### 問題
`WeekCalendar` 內部自己持有一份 `selectedDate` state，與頁面 `selectedDate` 互不同步，導致下方 `HealthLogSection date={selectedDate}` 吃不到更新。

### 作法
- `WeekCalendar` 改為**完全受控**：移除內部 `selectedDate` state，改由 props `selectedDate` / `onSelectDate` 控制。
- 頁面 `onSelectDate={(d) => setSelectedDate(d)}` 直接同步頁面 `selectedDate`。
- `HealthLogSection`（`src/components/diary/HealthLogSection.tsx`）的 useEffect 相依為 `[petId, date]`，date 一變即重抓 → 連動成立。
- 日期字串格式統一：週曆格子以本地 `getFullYear/getMonth/getDate` 組 `YYYY-MM-DD`，與 `selectedDate`、`recordedDates` 一致。

---

## C. 移除週曆內重複的空區塊

### 問題
舊 `WeekCalendar` 內建一塊 `DayDetail`（舊版 `page.tsx:445`），與下方連動的 `HealthLogSection` 重複，且常顯示空白。

### 作法
- 直接從 `WeekCalendar` 移除內建 `DayDetail`。週曆當日內容統一由頁面下方連動的 `HealthLogSection` 呈現。
- **月曆模式的 `DayDetail` 保留不動**：`MonthCalendar` 仍在選取日期時展開 `DayDetail`（改為受控：`selectedDate`/`onSelectDate` props，onClose 呼叫 `onSelectDate(null)`）。

---

## D. 週曆可切換週

### 問題
`WeekCalendar` 寫死本週（`startOfWeek` 由 `new Date()` 推算），無上一週/下一週。

### 作法
- 頁面新增 `weekStart` state（該週週日），初始為今日所在週（`startOfWeekFor(today)`）。
- `WeekCalendar` 新增上一週/下一週按鈕（沿用月曆的 `ChevronLeft`/`ChevronRight_Nav`）＋ 週範圍標題（`formatWeekRange`，格式 `M/D – M/D`）。
- `goPrevWeek` / `goNextWeek` 對 `weekStart` ±7 天；切週後 `visibleYearMonths` 重算 → recordedDates 自動重抓 → 圓點正確；`selectedDate` 不變、連動維持。
- 跨月週（如含 6/1 的週起於 5/31）會同時抓 5 月與 6 月並 union，跨月圓點正確。
- 切回「週曆頁面」tab 時重置 `weekStart` 與 `selectedDate` 為今日。

### 月曆受控化（連帶）
`MonthCalendar` 一併改為受控：`year`/`month`/`selectedDate` 由頁面持有，換月處理移到頁面 `goToMonth`（換月時收合 DayDetail 並把總覽月份對齊到新月份第一天，使「已記錄」徽章＝union 與下方 DailyHealthLog 總覽同月）。

---

## 動到的檔案
- `src/app/api/diary-dates/route.ts` —（新增）月份紀錄日期聚合 API。
- `src/app/diary/page.tsx` —
  - 新增 helper：`startOfWeekFor()`、`formatWeekRange()`。
  - `MonthCalendar`、`WeekCalendar` 改受控；`WeekCalendar` 加換週導覽、移除內建 DayDetail。
  - 主元件：新增 `calYear`/`calMonth`/`monthDayDetail`/`weekStart`/`datesRefreshKey` state 與 `goToMonth`/`goPrev*`/`goNext*` 導覽。
  - recordedDates effect 改抓 `/api/diary-dates`（依可見月份，週曆跨月則抓兩月 union）。
  - 移除未用的 `UsageRecord` interface；modal 儲存後改觸發聚合重抓。
- `src/components/diary/MonthHealthOverview.tsx` —
  - 新增 `recordedCount` prop 作「已記錄」徽章（union 同義）。
  - DailyHealthLog 口徑改名 `healthLogDays`；健康良好/異常維持其計算（必不為負）。
  - 白話摘要改三段式（有紀錄 / 有健康日誌 / 狀況良好 / 異常）。

> 未動三份系統文件（技術文件統一處理）；未 commit；未碰正式庫。

---

## 驗證結果

### 型別
`npx tsc --noEmit` → 通過（exit 0）。
ESLint：未新增任何錯誤/警告（變更後計數 14，較基準 15 少一項，因移除未用型別）。剩餘皆為既有問題（如 `DayDetail` 的 set-state-in-effect、`DietPlanActive` 的 `Date.now`），不在本次範圍。

### 資料（`DATABASE_URL="file:./dev.db"` 唯讀，用 Prisma client 重現聚合邏輯）
- demo 寵物：布丁。
- **2026-06 union** = `2026-06-01, 2026-06-02, 2026-06-03, 2026-06-04`（4 天）。
  各來源：hl=4, hm=1, gr=1, me=1, sy=1, **us=0**（無飲食紀錄）。
  → 證明舊邏輯（只看 us）會顯示 0 個圓點；新邏輯正確顯示 6/1~6/4 圓點，且「已記錄」徽章＝4。
- **2026-05 union** = `2026-05-16 … 2026-05-31`（含 5/25~5/31），證明切到上一週（含 5/31 的週）可看到 5 月底紀錄圓點。

### 互動（程式碼層驗證，未起 dev server）
- B：`WeekCalendar` 受控 → `onSelectDate` 直寫頁面 `selectedDate` → `HealthLogSection` 相依 `[petId,date]` 重抓。連動成立。
- C：`WeekCalendar` 已無內建 DayDetail；月曆 DayDetail 行為保留。
- D：上一週/下一週按鈕＋週範圍標題；切週後 `visibleYearMonths` 重算驅動 recordedDates 重抓。

> 註：未實際啟動瀏覽器點擊（環境限制），互動為靜態程式碼層確認＋資料層聚合重現；建議交 QA 於 dev server 做點擊回歸。
