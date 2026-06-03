# 工作報告 — Phase 1 基礎層
**角色：** fullstack-engineer  
**日期：** 2026-06-02  
**負責人：** Phase 1 全端工程師

---

## 修改 / 新增的檔案

### `src/app/globals.css`（完整替換）
移除 Dr.Pet v1 色票變數與系統字型，改為 PurePaw 品牌設計令牌：
- `--pp-canvas`、`--pp-apricot`、`--pp-ink` 等 CSS 變數
- Google Fonts `@import`（Quicksand + Noto Sans TC）— 置於 `@import "tailwindcss"` 之前（CSS 規範要求）
- `hide-scrollbar` 工具類
- `fade-in` / `slide-in-from-bottom-4` 動畫 keyframes

### `src/app/layout.tsx`（完整替換）
- 移除 `max-w-[480px]`、`bg-[#FAF7F2]`、`Dr. Pet` 等 v1 殘留
- 新增 `<Sidebar />` + RWD 主體結構
- 桌面版 `md:ml-64` 推開內容區，手機版底部留 `pb-28` 供 BottomNav
- Metadata 改為 PurePaw 品牌文案

### `src/components/layout/BottomNav.tsx`（完整替換）
- v2 版 4 tab（首頁 `/`、日誌 `/diary`、營養師 `/nutritionist`、快訊 `/news`）+ 中央凸起黑色相機 FAB（`/scan`）
- Active 顏色 `text-[#111111]`，inactive `text-slate-400`
- 背景 `bg-white/95 backdrop-blur-md`，`var(--pp-shadow-nav)` 陰影
- `md:hidden` 桌面版隱藏
- `env(safe-area-inset-bottom)` 適配瀏海機型

### `src/components/layout/Sidebar.tsx`（新建）
- `hidden md:flex` 僅桌面顯示
- `fixed left-0 top-0 h-screen w-64` 固定左側欄
- 頂部 PurePaw Logo SVG + 品牌文字
- 導覽：首頁、日誌（active 狀態）+ 照相（特殊按鈕，永不顯示 active）+ 營養師、快訊
- 底部使用者頭像（取暱稱首字）+ 名稱，從 `localStorage.drpet_nickname` 讀取

### `src/components/layout/ClientShell.tsx`（完整替換）
- 登入判斷改用 `purepaw_user_ack` localStorage key
- `LoginPage`：左側 `HandDrawnGraphic` SVG 插圖（v2 設計稿完整還原），右側 Logo + Google Mock 按鈕，RWD 兩欄佈局
- `DisclaimerModal`：7 條款、滾動偵測（需滾到底啟用按鈕）、`purepaw_disclaimer_ack_v1` localStorage
- SSR/Hydration 安全：`ready` state 在 `useEffect` 後才渲染

### `tsconfig.json`
- 加入 `PurePaw` 至 `exclude` 陣列，防止設計稿 `.tsx` 被 TypeScript 掃描（依賴 `react-router` 未安裝）

---

## 驗收修正（總指揮審查後補修）

| 問題 | 嚴重度 | 修正 |
|---|---|---|
| `globals.css` Google Fonts `@import` 順序錯誤，build 警告 | 高 | 移到 `@import "tailwindcss"` 之前 |
| `tsconfig.json` 未排除 `PurePaw/`，build 失敗 | 高 | 加入 exclude |
| Sidebar 把 `/scan` 列為一般 nav item（有 active 狀態） | 中 | 改為特殊照相按鈕，永不 active |
| Sidebar 標籤 "AI 營養師" 應為 "營養師" | 中 | 對齊設計稿 |
| DisclaimerModal 標題錯誤、無 Logo、無數字圓圈、clause 2 局部粗體缺失、缺底部來源 | 中 | 全部對齊原始設計稿 |

---

## Build 結果
`npm run build` ✅ 乾淨通過，零 TypeScript 錯誤，零警告
