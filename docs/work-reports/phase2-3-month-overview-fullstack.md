# Phase 2-3 日誌月曆「整月總覽」修正 — 全端工作報告

**角色：** 全端工程師
**日期：** 2026-06-04
**對應待辦：** `docs/待辦清單.md` Phase 2-3「日誌月曆總覽修正」
**核心決策（frank）：** 總覽一律以健康日誌 `DailyHealthLog`（monthLogs）為資料基準，與 ProductUsage / recordedDates 解耦；為多選觀察欄位定義「正常值白名單」，只有非正常值才算異常。
**範圍限制：** 只修 3 個 bug + 加白話摘要，不重做版面（版面重設計屬未來功能）。

---

## 一、修正項目與作法

### bug1 — 情緒等觀察欄位誤判（原 `MonthHealthOverview.tsx:166-171`）
**問題：** 多選欄位（mood 等）只要「有值」就算異常。情緒「平靜放鬆」是正常值，卻被計入異常天數。

**作法：**
- 把 `MULTI_FIELDS` 從 `{key,label}` 擴充為 `{key,label,normalValues:Set<string>}`，為每個多選欄位定義正常值白名單。
- 依各健康卡片實際選項定義：
  - `mood`（`MoodCard`，存 label）：正常 = `平靜放鬆`、`活潑好動`；異常 = `焦躁不安`/`攻擊低吼`/`異常嚎叫`。
  - `skinHair`/`eyeEar`/`dental`/`digestion`/`respiratory`/`neuro`/`reproductive`（`SkinHairCard` 等，存 option key）：所有選項都是異常徵兆，`normalValues` 為空集合 → 維持「有值即異常」語意。
- 新增 `abnormalMultiValues(log, field)`：回傳該欄位中「不在白名單」的值；異常判斷、症狀觀察分佈、單日「有觀察紀錄」全部改用此 helper，語意一致。

### bug2 — 健康良好變負數（原 `L243`）
**問題：** `recordedCount − abnormalDays` 兩數來源不同表（recordedCount 來自 ProductUsage、abnormalDays 來自 DailyHealthLog），布丁無 ProductUsage → `0 − 16 = −16`。

**作法：** 新增 `healthyDays = recordedCount − abnormalDays`，但兩者皆改由同源的 `monthLogs` 計算（見 bug3），同源相減必不為負。JSX 改用 `healthyDays`。

### bug3 — 已紀錄 0/30（原 `L138`）
**問題：** `recordedCount` 由 `recordedDates`（ProductUsage）計算，布丁無 ProductUsage → 永遠 0/天數。

**作法：** `recordedCount = new Set(monthLogs.map(l => l.date)).size`（當月有 DailyHealthLog 紀錄的不重複天數），分母 `totalDays` 維持當月天數。`abnormalDays = monthLogs.filter(hasAbnormality).length`，`hasAbnormality()` 統一以 DailyHealthLog 各欄位 + 正常值白名單判斷。
- `recordedDates` prop 在本元件已無用途 → 從 `Props` 與 `src/app/diary/page.tsx` 的呼叫移除（calendar 仍各自使用該 state，不受影響），避免留死參數。

### 白話摘要 + 標籤語意
- 總覽最上方新增一行白話總結：「本月 N 天有紀錄，M 天狀況良好（，K 天有異常觀察）。」數字由修正後統計帶入；無異常時不顯示異常子句。
- 統計卡標籤「記錄天數」→「健康日誌天數」，明確語意（不再讓人誤以為是飲食/產品紀錄）。

### mock 小修（`prisma/seed.ts`）
- seed 的 `mood: ['活潑好動']` 不在 `MoodCard` 選項中 → 改為既有正常值 `平靜放鬆`（最小改動，不動 UI 元件）。
- 註：`MonthHealthOverview` 的 mood 白名單仍保留 `活潑好動`（對齊 frank 範例、容錯舊資料），但 seed 已不再產生該值。

---

## 二、動到的檔案
- `src/components/diary/MonthHealthOverview.tsx` — 正常值白名單、`abnormalMultiValues` / `hasAbnormality` helper、統計全面改用 monthLogs、白話摘要、標籤語意、移除 `recordedDates` prop。
- `src/app/diary/page.tsx` — `<MonthHealthOverview>` 移除 `recordedDates` prop。
- `prisma/seed.ts` — mood `活潑好動` → `平靜放鬆`。

---

## 三、驗證

### 型別
- `npx tsc --noEmit` → EXIT 0（通過）。

### 重跑 seed（僅本機 dev.db）
- `DATABASE_URL="file:./dev.db" npx prisma db seed` 成功，DailyHealthLog 20 筆。
- seed 防呆仍在（非 `file:` URL 會中止），未碰正式 Turso 庫。
- 唯讀查 dev.db 確認布丁本月 mood 已無「活潑好動」，皆為合法選項值。

### 修正前/後數字對照（demo 布丁，依 dev.db 實算）
> 布丁 `ProductUsage` 為空 → 舊邏輯 recordedCount 恆為 0。

| 月份 | 指標 | 修正前（舊邏輯） | 修正後（新邏輯） |
|------|------|------------------|------------------|
| 2026-05（16 筆） | 已記錄天數 | **0** / 31（ProductUsage 為空） | **16** / 31 |
| 2026-05 | 有異常天數 | 16（含 12 天「平靜放鬆」被誤判） | **8**（mood 正常值不計） |
| 2026-05 | 健康良好 | 0 − 16 = **−16**（負數） | 16 − 8 = **8** |
| 2026-06（4 筆） | 已記錄天數 | **0** / 30 | **4** / 30 |
| 2026-06 | 有異常天數 | 4（4 天「平靜放鬆」被誤判） | **0** |
| 2026-06 | 健康良好 | 0 − 4 = **−4**（負數） | 4 − 0 = **4** |

- bug1 驗證：5 月有 12 天、6 月有 4 天 mood=「平靜放鬆」，舊邏輯全被算異常；新邏輯皆不計入 → 情緒「平靜放鬆」不再被算異常。
- bug2 驗證：健康良好由 −16 / −4 變為 +8 / +4，不再負數。
- bug3 驗證：已記錄天數由 0 變為 16 / 4（>0）。

---

## 四、未做 / 邊界說明（誠實回報）
- 未 commit、未動三份系統文件（交技術文件處理）、未對正式 Turso 庫寫入。
- 未重做總覽版面（依任務範圍，屬未來功能）。
- 附帶發現（未處理，僅登記）：seed 中 `eyeEar: ['流淚淚痕']`、`skinHair: ['頻繁抓搔','掉毛嚴重']`、`digestion: ['嘔吐']` 存的是 **label**，但對應卡片（EyeEarCard/SkinHairCard/DigestionCard）實際儲存 **option key**（如 `tears`/`scratch`），且部分 label（`掉毛嚴重`/`嘔吐`）不存在於選項中。此 key/label 不一致不影響本次異常統計（這些欄位「有值即異常」），但會讓「症狀觀察」分佈顯示的是 label 而非卡片渲染值，屬既有 mock 與卡片儲存約定的落差，超出本次範圍，建議後續一併校正。
