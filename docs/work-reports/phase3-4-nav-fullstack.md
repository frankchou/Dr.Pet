# Phase 3-4 導覽重排 + 隱藏「營養分析 / AI 諮詢」入口（全端）

## 目標
1. 從 nav 隱藏「營養分析」(`/nutrition`)、「AI 諮詢」(`/nutritionist`) 入口（保留頁面/路由，日後可加回）。
2. nav 重排為固定 5 項：**毛孩(`/`) ｜ 飲食(`/diet`) ｜ 照相(`/scan`) ｜ 日誌(`/diary`) ｜ 快訊(`/news`)**。
3. Sidebar（電腦版）與 BottomNav（手機版）兩邊一致。
4. 不刪 `/nutrition`、`/nutritionist` 頁面檔，只動 nav 設定。

## 變更內容

### `src/components/layout/Sidebar.tsx`（電腦左側 nav）
- `NAV_ITEMS` 移除 `/nutrition`（營養分析）與 `/nutritionist`（AI諮詢）兩項，加註解說明已隱藏、日後可加回。
  - 結果 `NAV_ITEMS` = 毛孩、飲食、日誌、快訊。
- 調整 nav 渲染：`slice(0, 2)` 渲染「毛孩、飲食」→ 中間插入特殊「照相」按鈕（沿用原樣式，永不顯示 active）→ `slice(2)` 渲染「日誌、快訊」。
- 最終視覺順序：毛孩 ｜ 飲食 ｜ 照相 ｜ 日誌 ｜ 快訊。

### `src/components/layout/BottomNav.tsx`（手機下方 nav）
- 左側 `NAV_ITEMS` 改為僅「毛孩、飲食」（原本是 毛孩、飲食、日誌）。
- `RIGHT_NAV_ITEMS` 移除 `/nutrition`、`/nutritionist`，改為「日誌、快訊」，加註解說明已隱藏、日後可加回。
- 中央凸起相機 FAB（`/scan`）位置與特殊樣式維持不變，落在「飲食」與「日誌」之間。
- 更新對應註解（左側 tab / 右側 tab）。
- 最終視覺順序：毛孩 ｜ 飲食 ｜ 照相(FAB) ｜ 日誌 ｜ 快訊。

## 未變更（依指示保留）
- `/nutrition`、`/nutritionist` 頁面與路由程式碼皆保留，未刪除。
- 未動 diary/settings/home/卡片等其他檔案（由並行 agent 處理）。

## tsc 結果
`npx tsc --noEmit`：
- 我變更的兩個檔案（Sidebar.tsx、BottomNav.tsx）**無任何型別錯誤**。
- 唯一錯誤為 `src/app/page.tsx(696,16): error TS2304: Cannot find name 'SHOW_VITALITY_HYDRATION'`，屬首頁（home）由並行 agent 編輯中的檔案，不在本任務範圍，未由本次變更引入。

## 檔案清單
- 修改：`/workspaces/Dr.Pet/src/components/layout/Sidebar.tsx`
- 修改：`/workspaces/Dr.Pet/src/components/layout/BottomNav.tsx`
- 新增：`/workspaces/Dr.Pet/docs/work-reports/phase3-4-nav-fullstack.md`
