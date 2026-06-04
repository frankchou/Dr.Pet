# QA 驗證報告：日誌月曆總覽修正（Phase 2-3）

- **驗證角色**：PurePaw QA
- **驗證日期**：2026-06-04
- **驗證對象**：`src/components/diary/MonthHealthOverview.tsx`
- **API**：`src/app/api/daily-health-log/route.ts`
- **方法**：靜態分析 + 本機 DB 唯讀查詢（`sqlite3 -readonly`），對 demo 寵物「布丁」獨立驗算
- **資料來源**：`file:/workspaces/Dr.Pet/dev.db`（含 demo-pet-pudding，20 筆 DailyHealthLog）
  - 註：`.env` 的 DATABASE_URL 指向正式 Turso，全程未連線、未寫入；本機驗算改用唯讀 sqlite3。

---

## 整體結論：**PASS**（5 項全數通過）

| # | 項目 | 結果 |
|---|------|------|
| bug1 | 情緒「平靜放鬆」不計入異常 | PASS |
| bug2 | 健康良好 = 有日誌天數 − 異常天數，且不為負 | PASS |
| bug3 | 「已紀錄 X/天」分子 = DailyHealthLog 不重複天數（非 ProductUsage） | PASS |
| 摘要 | 白話摘要數字與三個統計卡一致 | PASS |
| 邊界 | 某月完全無日誌時顯示合理（無 0 分母 / NaN） | PASS |

---

## 布丁實際資料（唯讀查到）

| 月份 | DailyHealthLog 筆數 | 不重複日期 |
|------|------|------|
| 2026-05 | 16 | 16 |
| 2026-06 | 4 | 4 |

- `DailyHealthLog` 有 `@@unique([petId, date])`，每日唯一，無重複日期。
- 布丁 `ProductUsage` 筆數 = **0**（與統計完全解耦，驗證 bug3 不再受污染）。

---

## bug1 — 情緒「平靜放鬆」不再被計入「有異常」

**判定邏輯（程式）**：`MULTI_FIELDS` 中 `mood` 的 `normalValues = {平靜放鬆, 活潑好動}`，
`abnormalMultiValues()` 會 filter 掉白名單值，因此 mood=「平靜放鬆」回傳空陣列，不觸發 `hasAbnormality`。

**獨立驗算（重現 hasAbnormality 後）**：
- 2026-05 共有 11 天 mood=「平靜放鬆」，其中：
  - 05-20、05-21、05-22、05-23、05-24、05-25、05-30、05-31 → 全部判定 **ok（無異常）**。
  - 05-18、05-19、05-28、05-29 雖 mood=平靜放鬆，但因 `stool=軟便` 而被列為異常 —— 異常來源是排便而非情緒，正確。
- mood 真正造成異常的兩天是 05-16、05-26（mood=「焦躁不安」，非白名單），正確被標記。
- 2026-06 全 4 天 mood=平靜放鬆 → 全部 ok。

**結論：PASS** — 「平靜放鬆」未被誤計為異常；異常僅來自非白名單的觀察值。

---

## bug2 — 「健康良好」= 有日誌天數 − 異常天數，且不為負

**程式**：
```
recordedCount = new Set(monthLogs.map(l => l.date)).size
abnormalDays  = monthLogs.filter(hasAbnormality).length
healthyDays   = recordedCount - abnormalDays
```
兩者同源（皆來自 monthLogs），且 abnormalDays ≤ recordedCount，故 healthyDays 必 ≥ 0。

**獨立驗算（逐日套用 hasAbnormality）**：

2026-05 異常 8 天：05-16、05-17、05-18、05-19、05-26、05-27、05-28、05-29
- recordedCount = 16
- abnormalDays = 8
- healthyDays = 16 − 8 = **8**

2026-06 異常 0 天：
- recordedCount = 4
- abnormalDays = 0
- healthyDays = 4 − 0 = **4**

| 月份 | 已記錄 | 健康良好 | 有異常 |
|------|------|------|------|
| 2026-05 | 16 | 8 | 8 |
| 2026-06 | 4 | 4 | 0 |

與題目預期（5 月 16/8/8、6 月 4/4/0）**完全一致**。

**結論：PASS** — 數值正確且結構上保證不為負。

---

## bug3 — 「已紀錄 X / 天」分子 = 當月 DailyHealthLog 不重複天數

**程式**：`recordedCount = new Set(monthLogs.map(l => l.date)).size`，`monthLogs` 來自
`GET /api/daily-health-log?yearMonth=...`（查 `DailyHealthLog`，非 `ProductUsage`）。
分母 `totalDays` = 當月天數（`new Date(year, month, 0).getDate()`）。

**驗證**：
- 布丁 ProductUsage = 0 筆；若仍誤用 ProductUsage，分子會是 0。實際分子為 16 / 4，
  證明來源為 DailyHealthLog。
- API `yearMonth` 查詢以 `gte {ym}-01 / lte {ym}-31` 過濾，回傳整月每日各一筆，分子正確。

**結論：PASS**。

---

## 白話摘要一致性

**程式**：摘要句使用的變數 `recordedCount` / `healthyDays` / `abnormalDays` 與下方三張統計卡
（健康日誌天數 / 健康良好 / 有異常）為**同一組變數**，無重新計算。

- 2026-05 摘要：「本月 16 天有紀錄，8 天狀況良好，8 天有異常觀察。」→ 與統計卡 16 / 8 / 8 一致。
- 2026-06 摘要：「本月 4 天有紀錄，4 天狀況良好。」（abnormalDays=0 時依程式條件不顯示「有異常」子句）→ 與統計卡 4 / 4 / 0 一致。

**結論：PASS**。

---

## 邊界 — 某月完全無日誌

**程式**：`monthLogs.length === 0` 時直接渲染「本月尚無健康紀錄」，不進入統計計算。
即使進入，`recordedCount=0`、`abnormalDays=0`、`healthyDays=0`，分母 `totalDays` 為當月天數（28~31，恆 > 0），不會 0 分母或 NaN。

**驗證**：布丁無 2026-04 等其他月份資料，可作為空月情境；邏輯上顯示「已記錄 0 / N 天」與
「本月尚無健康紀錄」，合理。

**結論：PASS**。

---

## 重現方式（供覆核）

```bash
sqlite3 -readonly "file:/workspaces/Dr.Pet/dev.db" -json \
  "SELECT date, vitality, appetite, waterStatus, stoolType, urineStatus, mood,
          skinHair, eyeEar, dental, digestion, respiratory, neuro, reproductive
   FROM DailyHealthLog WHERE petId='demo-pet-pudding' ORDER BY date;"
```
再以 `MonthHealthOverview.tsx` 的白名單（VITALITY/APPETITE/WATER/STOOL/URINE_NORMAL 及
MULTI_FIELDS.mood normalValues）逐日套用 `hasAbnormality` 即可重現上述天數。

## 備註 / 未測

- 本次為靜態分析 + DB 唯讀驗算，**未啟動 dev server 做瀏覽器端互動驗證**（UI 渲染、loading 狀態
  等視覺層未實機截圖）。若需 UI 層驗收可另行 `npm run dev` 補測。
- 正式 Turso 庫未連線驗證；本機 dev.db 的布丁資料即題目指定的 demo 基準。
