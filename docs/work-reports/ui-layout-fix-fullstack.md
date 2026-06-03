# 工作報告 — UI Layout 結構修復
**角色：** fullstack-engineer（總指揮自行修復）  
**日期：** 2026-06-02

---

## 問題根源
Phase 2-5 實作的 layout.tsx 結構不完整，缺少 Layout.jsx 的三個關鍵部分：
1. Sticky 透明 header（頁面標題 + 用戶頭像 + 鈴鐺 + scroll fade 動畫）
2. 桌面版白色圓角內容卡（`md:bg-white md:rounded-[40px]`）
3. `h-[100dvh] overflow-hidden` 滾動容器（main 作為 scroll container）

## 修改檔案

### `src/components/layout/AppShell.tsx`（新建）
完整還原 PurePaw UI Kit 的 Layout.jsx：
- 所有 React hooks 在條件判斷前呼叫（符合 Rules of Hooks）
- scroll event 掛在 `main ref` 而非 window
- `NO_SHELL_PATHS = ['/landing']` 跳過 App chrome
- 桌面側欄 + 底部導覽整合在此元件

### `src/app/layout.tsx`
從多元件堆疊（Sidebar + BottomNav 分開）改為統一的 `AppShell`。

### `next.config.ts`
補上剩餘 v1 路由 redirect：
- `/pet` → `/settings`
- `/pet/new` → `/settings`
- `/pet/:id` → `/settings`
- `/analysis` → `/`

### `src/components/layout/ClientShell.tsx`
新增 `/invite` 公開路徑跳過登入檢查，避免邀請接受頁被擋住。

---

## 其他修復
- `src/app/diary/page.tsx` — 成分 JSON 亂碼問題：`parseIngredientText()` 解析 markdown code fence，成分以標籤顯示而非 raw JSON
- `src/components/layout/PetGuard.tsx`（新建）— 日誌/即時分析/營養師/快訊路由在無毛孩時導回設定
- `src/app/diary/layout.tsx`、`/scan/layout.tsx`、`/nutritionist/layout.tsx`、`/news/layout.tsx`（新建）— PetGuard 保護

---

## Build 結果
`npm run build` ✅ 乾淨通過
