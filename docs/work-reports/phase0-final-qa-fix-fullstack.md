# Phase 0 收尾 — QA 項目 2 修正報告（全端）

- 修正者：全端工程師
- 日期：2026-06-04
- 對應問題：`docs/work-reports/phase0-final-qa.md` 項目 2 — `/diary` 週曆模式的評分卡 `DailyReactionCard` 固定查「今日」，使用者在週曆點選日期不會驅動評分卡的 `date`。

## 根因

`/diary` 頁（`src/app/diary/page.tsx`）的 `selectedDate` state 同時驅動週曆模式下的 `HealthLogSection`、`DailyReactionCard` 與三個 Modal 的 `date`，但它預設 = 今日且**從未被更新**。週曆元件 `WeekCalendar` 各自維護「內部」`selectedDate`（只用來開合自己的 `DayDetail`），沒有把選取日期上拋給頁面，因此頁面的 `selectedDate` 永遠停在今日，評分卡只查得到今日評分。

對照之下，`MonthCalendar` 早已有 `onDateSelect` callback（上拋給 `MonthHealthOverview` 的 `monthSelectedDate`）。本次修正即比照同一模式，補上 `WeekCalendar` 缺的那條上拋路徑。

## 怎麼修的

1. **`WeekCalendar` 新增 `onDateSelect?` prop**，並抽出 `selectDate(key)`（與 `MonthCalendar.selectDate` 寫法一致）：點同一天再點一次會取消選取（`null`），其餘上拋選取的日期字串。日格 `onClick` 由原本的 inline `setSelectedDate(...)` 改呼叫 `selectDate(key)`。未動到 `WeekCalendar` 內部 `DayDetail` 的開合行為，也未改月曆既有行為。
2. **頁面把週曆選取的日期接到 `selectedDate`**：`<WeekCalendar onDateSelect={(d) => setSelectedDate(d ?? today)} />`。取消選取（`null`）時回到今日，語意與月曆模式一致。`selectedDate` 一變，`HealthLogSection`、`DailyReactionCard`、各 Modal 的 `date` 全部跟著走。
3. **切換月曆/週曆 tab 時把 `selectedDate` 重設回今日**：`WeekCalendar` 在月曆 tab 時會卸載、內部選取狀態歸零；若不重設，頁面的 `selectedDate` 可能殘留前次選取與重新掛載的週曆失同步。重設後兩者一致。

`DailyReactionCard` 本身無需改：它的資料抓取 `useEffect` 相依 `[petId, date]`，`date` 一變即重抓 `GET /api/reactions?petId=&date=`，評分寫入走 `POST`（`upsert` on `petId_productId_date`），本來就正確。

## 動到的檔案

- `src/app/diary/page.tsx`

（未改 seed、未改 `DailyReactionCard`、未改 `/api/reactions`、未動三份系統文件、未碰正式庫。）

## 驗證：選日期 → 評分卡跟動

- `npx tsc --noEmit`：通過（EXIT 0）。
- 本機 `dev.db`（`file:./dev.db`，唯讀）demo 6 筆 ProductReaction（petId=demo-pet-pudding）：

  ```
  demo-prod-1  ok    2026-05-30
  demo-prod-2  good  2026-05-31
  demo-prod-1  bad   2026-06-01
  demo-prod-2  good  2026-06-02
  demo-prod-1  good  2026-06-03
  demo-prod-2  ok    2026-06-04  ← 今日
  ```

- 今日 2026-06-04（週四）對應的「本週」日格範圍（週日起算）為 `2026-05-31` ~ `2026-06-06`。修正後在週曆模式下點選：
  - 05-31 → demo-prod-2 good 👍。
  - 06-01 → demo-prod-1 bad 👎。
  - 06-02 → demo-prod-2 good 👍。
  - 06-03 → demo-prod-1 good 👍。
  - 06-04（今日）→ demo-prod-2 ok 😐。
  - 共 **5 筆**可在評分卡逐日查看，並可在該日新增/修改其他產品評分（`upsert` 守 `@@unique([petId,productId,date])`，覆蓋而非重複）。較修正前只看得到今日 1 筆明顯改善。
- 日期字串格式一致：DB 存 `YYYY-MM-DD`，`WeekCalendar` 產生的 key 亦為 `YYYY-MM-DD`，`GET /api/reactions` 以 `where.date = date` 精確字串比對，能命中。

## 誠實標註：仍有 1 筆（05-30）週曆查不到

- `2026-05-30` 落在「上一週」（今日所在週為 05-31 起），而 `WeekCalendar` **沒有上一週/下一週導覽**，只渲染當前週。此為週曆「無跨週導覽」的既有限制，**不屬本次「日期綁定」bug 的範圍**，故未一併處理（避免擅自擴大改動範圍）。
- 05-30 這筆目前仍可在「月曆模式」的月曆點選 → `DayDetail` 唯讀總覽看到當日紀錄，但月曆模式無評分卡（評分卡僅在週曆模式）。若日後需讓所有歷史評分都能在評分卡編輯，建議另案處理週曆跨週導覽或在月曆模式也放評分卡，交產品/架構評估。

## 範圍外 / 未做

- 未啟動 dev server 跑端對端點擊（依環境鐵則以靜態 + 唯讀 DB 驗證為主）。
- 未新增週曆跨週導覽（見上節，非本次 bug 範圍）。
