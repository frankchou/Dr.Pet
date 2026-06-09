# Phase 3 Review 修正 — 全端工作報告

修正 Phase 3 review 抓到的問題。原 `docs/work-reports/phase3-codereview.md` 不存在，
依任務描述條列項目逐一處理。

## 🔴 必修 1：3-3 語音實作進真正會顯示的元件

**問題**：Web Speech 語音轉文字邏輯被寫在 `src/app/diary/page.tsx` 的 `AiMemo`
（孤兒元件，從未被 render）。日誌頁實際顯示的隨記是 `SmartMemo.tsx`（經 `HealthLogSection`
掛載），其麥克風鈕仍是 `disabled` 佔位。

**修法**：
- 將 Web Speech API 邏輯搬進 `src/components/diary/SmartMemo.tsx`：
  - 加入最小化的 `SpeechRecognition*` 型別宣告與 `getSpeechRecognitionCtor()` helper。
  - `lang = 'zh-TW'`、`continuous`、`interimResults`；interim + final 拼接後填入隨記 textarea。
  - 錄音中狀態（`listening`，按鈕 pulse + 「錄音中…」提示列）。
  - 不支援的瀏覽器隱藏麥克風鈕（`speechSupported` 為 false 時不渲染）。
  - 權限被拒 / no-speech / 其他錯誤 → `voiceError` 文字提示。
  - 卸載時 `recognition.abort()`，避免麥克風佔用與殘留 callback。
- 移除原本 `disabled` + `aria-label="語音輸入（即將開放）"` 的佔位鈕。
- 語音填字時清除過時的「已儲存」提示（`setSaved(false)`），與既有 textarea onChange 行為一致。

## 死碼處理（AiMemo）

`AiMemo` 經 grep 確認**全專案無任何 JSX 使用**（只剩定義本身），在我修改前即為死碼。
其語音邏輯已搬至 `SmartMemo`，故整個 `AiMemo` 函式 + 區塊一併移除：

- 移除 `src/app/diary/page.tsx` 中 `// ─── AI 隨記` 整個區段：
  - 模組層的 `SpeechRecognition*` 型別與 `getSpeechRecognitionCtor()`（僅 AiMemo 使用）。
  - `AiMemoProps`、區塊內重複的 `ParsedRecord` interface（確認僅此區塊使用）。
  - `AiMemo` 函式本體。
- **未動到** 3-8 / 3-5 / 3-7 在 diary/page.tsx 的其他區塊（月/週曆切換、AI 諮詢 modal、每日任務 modal）。
- `Mic` icon 元件保留（仍被下方 DietRecord 搜尋框使用，line ~1238）。

## 🟡 #2 首頁兩入口 deep-link

`src/app/page.tsx`：
- 「日查觀察表」`href` 改為 `/diary?view=week`。
- 「就醫記錄表」`href` 改為 `/diary?view=week&open=medication`。

`src/app/diary/page.tsx`：
- 新增一個只在掛載時依初始 query 套用一次的 `useEffect`（`deepLinkAppliedRef` 守門）：
  - `view=week` 或 `open=medication` → 呼叫既有 `switchToWeekView()` 切到週曆當日健康紀錄。
  - `open=medication` → `setShowMedModal(true)` 自動開啟「用藥看診」modal。
- 沿用既有 `useSearchParams`（檔案頂部已 import）。

## 🟡 #4 月曆選取日形狀（squircle）

設計圖 `docs/features/ui-mockups/diary-calendar-toggle.jpg` 為圓角方形。
- MonthCalendar 日 cell：`rounded-full` → `rounded-2xl`（同步 `w-8 h-8` → `w-9 h-9`）。
- WeekCalendar 日 cell：`rounded-full` → `rounded-2xl`（與月曆一致）。

## 🟡 #5 每日紀錄項目 icon 底色

設計圖 `docs/features/ui-mockups/diary-daily-record-block.jpg` 為淺奶油底 + 橘色 icon。
`src/components/diary/DailyChecklist.tsx`：
- icon 圓底由實心 `bg-[#C4714A]` + 白 icon → 改為 `ICON_BG[task.icon]`（淺奶油 / 淺色底）
  + 橘色 icon（`text-[#D98A53]`）。
- icon SVG 的 `stroke="white"` 全部改為 `stroke="currentColor"`，吃外層橘色文字色。
- 比照 `DailyTaskModal` 的 `ICON_BG` map（dental/grooming `#FEF1E2`、walk `#FDE8E8`、
  custom `#EDF3FB`），達成「與 DailyTaskModal icon 底色一致」。

## 驗證

- `npx tsc --noEmit`：**通過，零型別錯誤**。
- 變更檔案的 eslint：
  - `SmartMemo.tsx`、`DailyChecklist.tsx`：完全乾淨。
  - `page.tsx`、`diary/page.tsx`：僅剩**既有**的 unused-var / react-hooks 警告與錯誤，
    全位於我未觸碰的程式碼（被註解掉的飲食區塊 DietRecord/ProductLists/DietPlanActive、
    DayDetail 的 effect 等），非本次新增。新加的 deep-link effect 區段無 lint 問題。

## 動到的檔案

- `src/app/page.tsx`（#2 首頁兩入口 href）
- `src/app/diary/page.tsx`（#2 deep-link effect、#4 月/週曆 squircle、移除死碼 AiMemo）
- `src/components/diary/SmartMemo.tsx`（#1 Web Speech 實作）
- `src/components/diary/DailyChecklist.tsx`（#5 icon 底色）

## 未做 / 註明

- 未 commit、未動三份系統文件、未碰正式庫。
- AiMemo 為修改前即存在的確定死碼，已整段移除（含其專用的模組層 Speech 型別與 helper）。
