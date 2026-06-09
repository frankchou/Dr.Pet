# Work Report — Phase 3-8 + 3-3（日誌頁）

角色：全端工程師
日期：2026-06-09
範圍：僅 `src/app/diary/page.tsx`（按指示不動健康卡片元件 / 首頁 / Sidebar / BottomNav，不碰 3-5/3-7 浮動 modal 與每日任務 modal，不 commit、不動系統三文件）

---

## 3-8 日誌月曆縮小 + 月/週切換移到右上角

依設計圖 `docs/features/ui-mockups/diary-calendar-toggle.jpg` 施工。

- **月曆縮小約 0.85**：
  - 卡片 padding `p-5 → p-4`、圓角 `rounded-[32px] → rounded-[28px]`。
  - 標題列字級 `text-xl → text-lg`，前後切月按鈕 `w-10 h-10/size20 → w-8 h-8/size17`。
  - 星期列字級 `text-[11px] → text-[10px]`。
  - 日期格高度 `h-12 → h-10`、間距 `gap-y-4 gap-x-2 → gap-y-2.5 gap-x-1`、日期圓圈 `w-9 h-9 text-sm → w-8 h-8 text-[13px]`、留白格 `h-12 → h-10`。
  - 標題改為「YYYY / M」格式（如設計圖），切月按鈕與標題靠左群組。
- **月/週切換移到月曆右上角**：
  - 月曆模式：卡片右上角顯示「週檢視」pill 按鈕（`bg-[#FEF1E2] text-[#D98A53]`），點擊 → 切到週曆。
  - 週曆模式：週導覽列右上角顯示「月檢視」pill 按鈕，點擊 → 切回月曆。
  - 兩個 calendar 元件各新增 `onToggleView` prop；DiaryPage 新增 `switchToMonthView` / `switchToWeekView`，行為與原本頂部 tab 的 onClick 完全相同（重設日期/週起始、收合 DayDetail）。
- **隱藏最頂部「月曆/週曆」tab**：移除原本 `<div className="flex bg-slate-100 ...">` 的兩顆 tab 按鈕，改由右上角切換。
- 既有功能不變：圓點（recordedDates）、週曆點日連動 HealthLogSection、切月/切週、月總覽（MonthHealthOverview）邏輯皆未動，僅樣式與切換入口位置調整。

## 3-3 SmartMemo 語音輸入

- 移除原麥克風按鈕的 `disabled` 與「尚未實作」aria-label。
- 串 **Web Speech API**（`SpeechRecognition` / `webkitSpeechRecognition`，`lang='zh-TW'`，`continuous` + `interimResults`）：
  - 辨識結果即時填入 SmartMemo textarea（保留開始錄音前既有文字為基底，附加新內容；中間結果即時顯示、最終結果固定）。
  - 填入時同步清掉舊的解析結果（與既有 onChange 行為一致）。
- **狀態與降級**：
  - 不支援的瀏覽器：偵測不到建構子時隱藏麥克風按鈕（優雅降級，仍可文字輸入）。
  - 錄音中：按鈕變橘底 pulse + 下方「錄音中…」提示；再次點擊麥克風結束。
  - 權限被拒（`not-allowed` / `service-not-allowed`）：顯示「麥克風權限被拒，請於瀏覽器設定開啟後再試」；另含 `no-speech` 與一般錯誤提示。
  - 元件卸載時 `abort()` 釋放麥克風。
- 型別：TS lib 未內建 Web Speech API 型別，於檔內宣告最小子集介面（`SpeechRecognitionLike` 等），避免 `any`。

---

## 變更檔案
- `src/app/diary/page.tsx`（唯一變動檔）

## 動到的大致行段（供下一棒接力避開）
> 行號為改後檔案概略位置，會隨後續編輯浮動，僅供定位。

- **MonthCalendar**（約 L354–425）：props 加 `onToggleView`、右上角「週檢視」按鈕、整體縮小樣式。
- **WeekCalendar**（約 L432–495）：props 加 `onToggleView`、導覽列右上角「月檢視」按鈕、按鈕略縮。
- **AiMemo（SmartMemo）**：
  - 檔頭 Web Speech API 型別宣告 + `getSpeechRecognitionCtor()`（約 L497–528）。
  - AiMemo 內語音 state / hook（`speechSupported`、`listening`、`voiceError`、`startListening`/`stopListening`/`toggleListening`，約 L560–630）。
  - 麥克風按鈕 JSX + 錄音中/錯誤提示（約 L673–700）。
- **DiaryPage**：
  - `switchToMonthView` / `switchToWeekView`（約 L1450–1470，緊接 goPrevWeek/goNextWeek 之後）。
  - render：移除頂部 tab、`<MonthCalendar onToggleView={switchToWeekView}/>`、`<WeekCalendar onToggleView={switchToMonthView}/>`（約 L1480–1520）。

> 註：未動 `DiaryTopBar`、`HealthLogSection`、`MonthHealthOverview`、`DailyChecklist`，也未碰浮動 modal / 每日任務 modal 區（3-5/3-7 的下一棒範圍）。

## 驗證
- `npx tsc --noEmit`：通過，無型別錯誤。
- 未跑實機 / 瀏覽器手動驗證（語音須真實麥克風與瀏覽器環境，交 QA / frank 實機）。
