# 工作報告：Phase 3-5 / 3-7 日誌頁 AI 諮詢浮動入口 + 每日任務管理 modal

**角色：** 全端工程師
**日期：** 2026-06-09
**範圍：** 待辦 3-5、3-7（皆位於日誌頁）

---

## 3-5 AI 諮詢移為日誌頁浮動入口 + bottom-sheet modal

### 做法
1. **抽共用元件 `NutritionistChat`**（`src/components/chat/NutritionistChat.tsx`）：
   把原 `/nutritionist/page.tsx` 的對話 UI/邏輯整段抽出為共用元件，邏輯不變（取寵物清單、依寵物載入歷史、送 `/api/chat`、寵物 context 切換、建議問題、生成觀察計畫）。
   - 新增兩個 props 讓 modal 與整頁共用同一份實作：
     - `showHeader`（modal 內由 modal header 取代內部標題，故隱藏）
     - `inputPaddingClassName`（整頁版需 `pb-28` 避開 BottomNav；modal 版 `pb-4` 貼齊底部）
2. **`/nutritionist/page.tsx` 改為薄殼**：直接 render `<NutritionistChat />`，行為與外觀不變。
3. **日誌頁浮動入口**：在 `DiaryPage` 加 `fixed` 定位的圓形 icon 按鈕（右下、`bottom-24`，上移避開中央相機 FAB / BottomNav；含 `safe-area-inset-bottom`），捲動時固定。
4. **bottom-sheet modal**：點按鈕從下方滑出（樣式同「用藥看診」modal：`fixed inset-0 bg-black/40 justify-end` + `rounded-t-3xl`），內含 `<NutritionistChat showHeader={false} inputPaddingClassName="pb-4" />`，接同一支 `/api/chat`，送訊息 / 歷史 / 寵物 context 皆正常。

---

## 3-7 每日任務管理 modal

> 已先用 Read 開啟三張設計圖按圖施工：入口 `diary-daily-record-block.jpg`、modal `diary-daily-task-modal-1.jpg` / `-2.jpg`。

### 持久化採用方案（重點說明）
- **新建 `useDailyTasks` hook**（`src/hooks/useDailyTasks.ts`），localStorage key `purepaw_daily_tasks`，存「任務定義」：`{ key, label, icon, enabled, note }[]`。
- **為什麼新建而非沿用既有結構：**
  - `useRecordParams`（`purepaw_record_params`）管的是「哪些大區塊顯示」（用藥/飲水/症狀…），顆粒度不符；且不含「備註」「自訂新增」。
  - 既有 `dailyChecklist` 欄位（存在 daily-health-log）管的是**每日完成勾選**，是 per-day 狀態，不適合放全域的任務清單定義。
  - 故任務「定義」獨立成 hook（與 `useRecordParams` 同一套 localStorage 模式，讀起來一致），任務「完成勾選」**維持原機制不動**。
- **與既有 DailyChecklist 完成勾選相容：** 完成勾選仍以 `task.key` 為鍵，沿用 `DailyChecklist` 的 `value`（已完成 key 陣列）/ `onChange`；內建三項 key 維持 `dental` / `walk` / `grooming`，舊資料完全相容；自訂任務 key 用 `custom_<timestamp>`。

### 元件
- **`DailyTaskModal`**（`src/components/diary/DailyTaskModal.tsx`，新檔）：bottom-sheet，每任務一列 = icon + 名稱 + 開/關 toggle + 備註欄；支援「新增自訂任務」（含 + 按鈕、Enter 送出）、「全部取消」、底部「完成設定」。自訂任務可刪除。採 draft 暫存，按「完成設定」才寫回，關閉不儲存（符合圖示流程）。
- **`DailyChecklist`**（改）：改接 `tasks` + `onOpenSettings` props；「設定」連結由 `alert` 改為開 modal；區塊**只顯示 enabled 的任務**（開幾個顯示幾個），關閉的隱藏；無開啟任務時顯示引導空狀態；備註若有則顯示於項目下。
- **`HealthLogSection`**（改）：透傳 `dailyTasks` / `onOpenTaskSettings` 到 `DailyChecklist`。
- **`DiaryPage`**（改）：`useDailyTasks()` 取狀態；`showTaskModal` 控制；render `DailyTaskModal`。

### 連動驗證（邏輯層）
- 新增任務 → 預設 `enabled: true` → 區塊立即顯示 ✅
- 關閉任務 → 區塊隱藏 ✅
- 區塊只顯示開啟任務 ✅
- 完成勾選與舊 `dailyChecklist` 資料相容 ✅

---

## 動到的檔案

| 檔案 | 動作 |
|---|---|
| `src/components/chat/NutritionistChat.tsx` | 新增（抽出的共用對話元件） |
| `src/app/nutritionist/page.tsx` | 改為薄殼 render NutritionistChat |
| `src/hooks/useDailyTasks.ts` | 新增（任務定義持久化） |
| `src/components/diary/DailyTaskModal.tsx` | 新增（每日任務管理 modal） |
| `src/components/diary/DailyChecklist.tsx` | 改（接任務定義、開 modal、只顯示開啟項目） |
| `src/components/diary/HealthLogSection.tsx` | 改（透傳 tasks / onOpenTaskSettings） |
| `src/app/diary/page.tsx` | 改（浮動入口 + AI 諮詢 modal + 任務 modal 接線） |

**未動：** 健康卡片、首頁、nav、三份系統文件、正式庫。前一棒的 MonthCalendar / WeekCalendar / AiMemo 語音 / switchToMonth-WeekView 區段均未改動。

---

## 驗證

- `npx tsc --noEmit`：**通過（exit 0）**。
- ESLint：新檔僅出現 `set-state-in-effect` 提示，與既有 `useRecordParams` / `HealthLogSection` 同一既有模式（localStorage 於 mount 後 hydrate，避免 SSR mismatch），屬專案既有慣例；無新增阻斷性錯誤。其餘 lint warning（DietRecord/ProductLists/AiMemo 等 unused）為前面已隱藏功能的既有狀況，非本次新增。
- **未做實機/瀏覽器驗收**（交 QA / frank 實機）：浮動按鈕避位、modal 手機捲動、AI 對話實際往返、任務連動畫面，建議實機確認。

---

## 待後續 / 備註
- AI 諮詢 modal 內的麥克風按鈕沿用原 `/nutritionist` 既有（目前為佔位、未接語音），與本次範圍無關，未改動。
- 任務定義存 localStorage（單裝置）；若未來要跨裝置 / 共同飼主同步，需改 API 持久化（已在 hook 內加 `storage` 事件做同分頁/跨分頁同步）。
