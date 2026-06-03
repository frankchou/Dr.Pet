# 工作報告 — Phase 4 即時分析 + AI 營養師 + 快訊
**角色：** fullstack-engineer  
**日期：** 2026-06-02  
**負責人：** Phase 4 全端工程師

---

## 修改 / 新增的檔案

### `src/app/scan/page.tsx`（完整替換）

**做了什麼：**
- 以 PurePaw v2 視覺語言完整重寫，保留原本 API 邏輯（`/api/instant-analyze` GET/POST、`/api/pet-products` POST）
- 三段 Modal 流程：`capture → analyzing → result`，與 `Features.jsx` 的 `Scan` 元件一致
- 歷史記錄卡片照設計稿（verdict 顏色背景 + 分數 badge + `line-clamp-2`）
- 圖片預覽在上傳區顯示（stage 為 `capture` 時）；分析中改為 spinner
- 錯誤訊息 `bg-[#FEF2F2]` 樣式，API 失敗 stage 退回 `capture`
- 全部 SVG 圖示 inline，不依賴外部套件
- 點擊歷史記錄卡片觸發新分析（與設計稿行為一致）

### `src/app/nutritionist/page.tsx`（新建）

**做了什麼：**
- 完整 AI 對話頁，接 `/api/chat` 真實 API
- **API 簽章注意**：現有 `/api/chat` POST 接受 `{ petId, messages }` 陣列（不是 `{ petId, message }`），已按實際 API 簽章傳遞完整訊息歷史，確保 AI 有完整對話上下文
- 寵物切換 pills（`GET /api/pets`，切換時清空對話）
- 空狀態建議問題（第三題依 `mainProblems` 動態調整）
- PurePawLogo SVG（28px 版本）
- 三個彈跳點 loading 動畫（delay 0/0.15/0.30s）
- `Enter` 鍵送出
- `localStorage drpet_currentPetId` 在 `useEffect` 中讀取（SSR 安全）

### `src/app/news/page.tsx`（新建）

**做了什麼：**
- 全靜態示範頁，兩個分區（與毛孩相關 / 其他通知）
- 示範資料與設計稿完全一致（7 筆）
- 圖示皆用 inline SVG（AlertTriangle/Award/ShieldAlert/BookOpen/Tag/Bell）
- 未讀紅點（`absolute top-4 right-4 w-2.5 h-2.5 bg-[#DC2626]`）
- 「您的毛孩正在食用」黑底 chip（`used: true` 時顯示）

---

## Build 結果
`npx tsc -b` 無任何型別錯誤（空白輸出）。
