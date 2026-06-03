# 工作報告 — Phase 3 日誌頁
**角色：** fullstack-engineer  
**日期：** 2026-06-02  
**負責人：** Phase 3 全端工程師

---

## 新增的檔案

### `src/app/diary/page.tsx`（新建，約 670 行）

嚴格對照 Diary.jsx 設計稿，六大功能區塊全部實作。

---

## 實作內容

### 1. 月曆 / 週曆
- 月曆：可左右切換月份，今日黑底圓，有記錄的日期下方顯示藍點（`#7C9CE3`）
- 週曆：從今天所在週起算，相同標記邏輯
- 記錄打點：從 `GET /api/usages?petId=...&limit=100` 取本月記錄，抽取日期放入 `Set`

### 2. AI 隨記
- `onBlur` 觸發 `POST /api/chat`（送 `messages` 陣列）
- Loading 顯示三個彈跳點動畫
- 回傳後顯示黑底白字回覆卡，含「確認」與「重新辨識」按鈕

### 3. 用藥與看診
- 歷史標籤從 `GET /api/symptoms?petId=...&symptomType=medication&limit=3` 取得，點擊自動帶入欄位
- 四個 input（疫苗/驅蟲/處方/看診），任一有值顯示「新增紀錄」按鈕
- 提交 → `POST /api/symptoms`（`symptomType: "medication"`, `notes: JSON.stringify(fields)`）

### 4. 洗澡美容
- 居家自洗 / 送洗 radio；居家展開多選含「全選」邏輯
- 提交 → `POST /api/symptoms`（`symptomType: "grooming"`, `notes: JSON.stringify({mode, items})`）

### 5. 日常飲食紀錄
- 換食計畫橫幅（PlanBanner），`hasPlan` 持久化至 `localStorage`（`drpet_hasPlan` / `drpet_planStart`）
- 搜尋欄 debounce 300ms → `GET /api/products?search=...`
- 危險詞偵測（12 個關鍵字）→ 紅色警告卡
- 每個產品卡含成分 Accordion（展開顯示 `ingredientText`，含認證 badge）
- 「加入試用清單」→ `POST /api/pet-products`
- `+` 按鈕 → `POST /api/usages`

### 6. 使用中產品
- 從 `GET /api/pet-products?petId=...` 拉資料，按 `listType` 分 fixed / trial tab
- 「新增產品」虛線按鈕 → `scrollToDiet()` scroll 到飲食紀錄區塊

### 7. 換食計畫啟動後（DietPlanActive）
- 計算天數（`startDate` → 今天）
- 呼叫 `GET /api/recommend?petId=...` 取推薦，loading spinner + RecCard

### 8. URL Deep Link
- `useSearchParams` 偵測 `?section=diet`，自動 scroll 到飲食紀錄區塊（delay 120ms）

---

## 重要技術決策

**用藥 / 美容改用 `POST /api/symptoms` 儲存**  
原因：現有 `POST /api/usages` 的 DB schema 要求 `productId NOT NULL`，無法在不做 migration 的前提下儲存無商品的紀錄。`SymptomEntry.symptomType` 是自由字串，用 `medication` / `grooming` 做區分，`notes` 存 JSON payload，完全符合現有 schema，無需改動資料庫。

---

## Build 結果
`npx tsc -b` 通過，無型別錯誤。
