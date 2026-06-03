# 工作報告 — Phase 2 首頁 + 設定頁
**角色：** fullstack-engineer  
**日期：** 2026-06-02  
**負責人：** Phase 2 全端工程師

---

## 修改 / 新增的檔案

### `src/app/page.tsx`（完整替換）
完全改寫為 PurePaw Home.jsx 設計稿的 TypeScript 版本，七大版面區塊全部實作：

1. **Pet Profile Hero**（全幅）— 連接 `GET /api/pets`，無頭像時顯示品牌杏色背景 + 名字首字；性別映射（sex + isNeutered → ♂/♀/已結紮）；`calcAge()` 從 `birthday` 計算「N歲N個月」
2. **健康檔案概覽** — 飲食需知（allergies）、確診疾病（mainProblems）、日常症狀；空陣列時顯示靜默空狀態
3. **快速功能** — 毛孩成長分析卡（假資料）+ 飲食紀錄按鈕（Link /diary）
4. **重要日程** — 三格（年度疫苗/體外驅蟲/生日），生日從 `pet.birthDate` 取 MM-DD，其餘顯示「--」（後端尚無日程資料）
5. **未來日程表** — 醫療/美容/節日 tab，顯示空狀態
6. **健康指標** — 體態評分/活力指數/水分攝取，全部「未記錄」
7. **營養綜合分析** — 從 `GET /api/pet-products?petId=...` 取固定產品清單

API 串接：`GET /api/pets`、`GET /api/pet-products?petId=...`  
LocalStorage：`drpet_currentPetId`（讀寫），`window.addEventListener('storage')` 監聽切換

### `src/app/settings/page.tsx`（新建）
嚴格按照 Settings.jsx 設計稿：

**Tab 1 毛孩檔案：**
- 水平可滾動卡片（`-mx-6 overflow-x-auto`）
- 每張卡：頭像（Camera 按鈕 disabled，TODO）、基本資訊（名字/品種/性別）、生理晶片（生日/體重/晶片號碼）
- 儲存 → `PUT /api/pets/:id`，成功顯示 Toast（2 秒消失）
- 新增 → `POST /api/pets`
- 最後一張「新增毛孩檔案」虛線卡

**Tab 2 紀錄參數設定：**
- 13 個項目 toggle，狀態存 `localStorage purepaw_record_params`
- 拖曳排序圖示（Menu icon，裝飾）

---

## 取捨說明

| 項目 | 處理方式 |
|---|---|
| `chipNumber` 欄位 | Prisma schema 無此欄，顯示 disabled input 標注「功能開發中」 |
| `gender` vs `sex` | Schema 欄位為 `sex + isNeutered`，UI 選項正確映射 |
| `birthDate` vs `birthday` | Schema 欄位為 `birthday`，以 schema 為準 |
| 頭像上傳 | disabled，標注 TODO |
| 外部圖片 | 無頭像時用純色背景 + 文字首字，不引用外部 URL |

---

## Build 結果
`npx tsc -b` 零錯誤。`npx next build` 成功，`/` 與 `/settings` 均正常產出。
