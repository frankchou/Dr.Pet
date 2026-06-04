# Work Report — Phase 2-5 / 2-7 飲食頁前端硬化 + 配餐展開/收合顯示

- 角色：全端工程師
- 範圍：**只改** `src/app/diet/page.tsx`（含其內部子元件），未動其他檔案。
- 日期：2026-06-04

---

## 2-5 前端硬化：建立配餐計畫失敗不再無限轉圈

### 根因（前端側）
`SessionAccordionWithPlan` 點開時呼叫 `onEnsurePlan()`（→ 父層 `ensurePlan()` POST `/api/meal-plans`）。
原本失敗（回 `null`）時 `resolvedPlanId` 仍為 `null`，使用者按「繼續添加項目」→ 表單開啟但 `planId` 為 `null`
→ 進入 `showForm && !planId` 分支，顯示「建立配餐計畫中…」spinner，**永遠不會結束、無錯誤、無重試**。

### 改動
- `SessionAccordionWithPlan` 新增 `planError` state 與 `tryEnsurePlan()`：
  - 建立成功 → 寫入 `resolvedPlanId`。
  - 建立失敗（`onEnsurePlan()` 回 `null`）→ 設定錯誤訊息「建立配餐計畫失敗，請檢查網路後重試」。
- 透過新 props `planError` / `onRetryPlan` 傳給 `SessionAccordion`。
- `SessionAccordion` 的新增區塊邏輯改為四分支：
  1. `planId` 已就緒 → 顯示 `AddItemForm`
  2. 無 `planId` 且**有 `planError`** → 顯示**紅色錯誤框 + 「重試」/「取消」按鈕**（重試呼叫 `onRetryPlan`）
  3. 無 `planId` 且建立中（無錯誤）→ 維持「建立配餐計畫中…」spinner（瞬時狀態）
  4. 表單未開 → 「繼續添加項目」按鈕
- 後端 POST `/api/meal-plans` 為 upsert（idempotent），重試安全；後端正常時行為不變。

---

## 2-7 早/午/晚餐展開/收合顯示（依設計圖）

依 `diet-meal-session-expanded.jpg` / `diet-meal-session-collapsed.jpg` 重做 `SessionAccordion`。

### 展開狀態（expanded 圖）
每個品項一列：
- 左：圓角方框內的資訊（i）圖示。
- 中：產品名（粗體）+ 標籤 pills（如 狗飼料 / 無穀 / 保健品 / 鮮食）。
- 右：數量框（白底框、置中粗體數字）+ 單位文字 + 刪除（X）icon。
- 該列下方右對齊縮排顯示「↳ 預估約 N 克」（僅當 `estimatedGrams` 有值）。
- 底部「+ 繼續添加項目」虛線圓角按鈕。
- 無項目 → 「尚未添加配餐項目」。

### 收合狀態（collapsed 圖）
- Header：時段 icon + 中文標籤 + 英文副標 + chevron。
- 下方精簡 bullet 清單：`• 產品名(截斷) (數量 單位)`，數量單位右對齊。
- 無項目 → 「尚未添加配餐項目」。
- 移除原本「前 3 項 + 等 N 項」單行截斷摘要寫法。

### 備註（誠實回報）
- 設計圖中數量框「看起來像可編輯輸入框」。目前**無品項編輯 API**（items 路由僅有 POST / DELETE），
  且任務限定只改 `diet/page.tsx`、不得新增其他檔案，故數量框實作為**唯讀顯示框**（沿用既有新增表單來設定數量）。
  若日後要可即時編輯，需後端補 PATCH（不在本任務範圍）。

---

## 驗證

- `DATABASE_URL="file:./dev.db" npx tsc --noEmit` → **通過，無型別錯誤**（未碰正式 Turso）。
- ESLint（`src/app/diet/page.tsx`）：剩餘 3 個錯誤皆為**既有**問題類別
  （`react/no-unescaped-entities` 的 `"` 引號於 AI 專家點評；`react-hooks/set-state-in-effect` 的既有同步 effect），
  非本次新增。原始版本為 4 個同類錯誤。
- 未 commit、未動三份系統文件。

## 檔案清單
- `src/app/diet/page.tsx`（唯一改動的程式檔）
- `docs/work-reports/phase2-5-7-diet-fullstack.md`（本報告）
