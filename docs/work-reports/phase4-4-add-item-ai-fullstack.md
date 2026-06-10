# Phase 4-4 — 飲食頁「添加項目」改 bottom-sheet modal + AI 產品搜尋選取（全端）

## 摘要
- 飲食頁的「添加項目／繼續添加項目」由原本 inline 展開的自由文字 `AddItemForm`，改為**從下方滑出的 bottom-sheet modal**（樣式比照日誌「用藥與看診」`MedicationModal`）。
- modal 內為 **AI 輔助搜尋選取**：搜尋框 + 分類 chips + 「AI 智能搜尋結果 (N)」+ 結果卡片，依設計圖實作收合／展開、驗證標章、數據出處、兩種風險樣式、找不到時自訂備援。
- 串接並擴充 `/api/products/web-search`：新增 **detailed 模式**，AI 一併抓回產品詳細資料（成分／營養添加物／營養成分表／商品規格／製造代理／每日餵食量／驗證標章／數據出處）與**依該毛孩健康狀態判定的風險樣式**。
- 選取後存**標準化產品**：建立 `Product`（綁 productId）+ 加入該毛孩試用清單（`PetProduct`）+ 寫入 `MealPlanItem`，讓營養／成分分析能對應真實產品。
- `npx tsc --noEmit` 通過（exit 0）。新元件 `AddItemModal.tsx` 通過 eslint；`diet/page.tsx` 剩 3 個 lint error 為**既有程式碼**（`result.expertComment` 引號、wrapper useEffect setState），非本次改動，已比對 HEAD 確認。

## 依設計圖實作對照
- `diet-add-item-ai-search.jpg`：搜尋框（放大鏡 + mic）、分類 chips（全部商品／飼料／保健品／鮮食／零食）、結果標題「AI 智能搜尋結果 (N)」、卡片收合態（分類標籤／已加入徽章／＋加入鈕／產品名／品牌規格／完整成分摘要 + 驗證標章 + AI 驗證數據出處 + 數據更新日期）。
- `diet-add-item-detail-info-1/2.jpg`：「完整成分資訊」展開顯示完整成分／營養添加物（每公斤）／營養成分表（雙欄 + 熱量）／商品規格／製造與代理資訊／每日建議餵食量（體重→餵食量表）／錯誤回報。
- `diet-add-item-ai-search-risk-1.jpg`（樣式 A 產品風險）：分類旁紅色「⚠️ 建議謹慎使用」chip + 卡內紅色「⚠️ 風險說明」段 + 數據出處指向風險來源。
- `diet-add-item-ai-search-risk-2.jpg`（樣式 B 品牌警示）：產品名上方紅色橫幅「⚠️ {品牌}（品牌警示：…）」，本品仍同時顯示正向驗證標章。
- 無風險：照正常卡片顯示，不出現 chip／風險段／品牌橫幅。

## mock / 正式環境分工
- **正式環境**：`/api/products/web-search` detailed 模式由 Claude（`claude-sonnet-4-6` + web_search）搜尋真實產品並回傳詳細資料；風險樣式由 AI 綜合「該毛孩物種＋主要問題＋近期症狀＋過敏原／飲食禁忌」與「產品成分／品牌合規／食安通報」判定（`risk.style = none|product|brand`）。
- **現階段 mock 降級**：`AddItemModal.tsx` 的 `mockDetail()` 會對 AI 未回傳的 detail 欄位補一份示意資料（規格／營養表／規格／餵食量／標章／出處），確保展開區塊與卡片長相可驗證。**未改 `prisma/seed.ts`**——mock 全在前端 `mockDetail()`，AI 回真資料時即被覆蓋。
- 風險文字目前完全依賴 AI 回傳；AI 回 `none` 或無資料時不顯示風險（符合「無風險照正常顯示」）。若需在無 API 金鑰時也能看到風險樣式長相，可日後在 `mockDetail` 旁加一個風險 mock 旗標（本次未加，避免污染正常流程）。

## 標準化產品儲存流程（選取後）
1. `POST /api/products`：以 AI 結果建立 `Product`（type/name/brand/variant + ingredientJson 存成分/標章/營養表/出處）→ 取得 `productId`。
2. `POST /api/pet-products`：把該 product 加入毛孩試用清單（`listType: 'trial'`），產品管理頁也看得到（非關鍵，失敗靜默降級）。
3. `POST /api/meal-plans/[id]/items`：以 `productId` 綁定寫入配餐品項（沿用既有流程）；若 Product 建立失敗則降級為 `customName`，仍可加入。
- 自訂備援（找不到產品）：直接以 `customName` 寫入品項。

## 動到的檔案
1. **`src/app/api/products/web-search/route.ts`**（擴充，未改動原非 detailed 流程）
   - 新增 export 型別：`NutrientRow`、`FeedingGuideRow`、`ProductDetail`、`RiskStyle`、`RiskInfo`、`WebProductDetailed`。
   - body 新增 `detailed?`、`category?`；pet 查詢加 `allergies`、保留 `mainProblems`。
   - `detailed:true` 時走新函式 `handleDetailedSearch()`（AI 抓詳細資料 + 風險判定，含陣列防呆與降級）。
2. **`src/components/diary/AddItemModal.tsx`**（新增）— bottom-sheet modal 主元件 + `ProductCard` + `DetailSections` + `mockDetail`。
3. **`src/app/diet/page.tsx`**（改寫新增流程）
   - 移除 inline `AddItemForm`（含 `UNIT_OPTIONS`、`TAG_OPTIONS` 常數）。
   - import `AddItemModal`。
   - `SessionAccordion`：`showForm`→`showModal`；新增 `petId`、`addedNames` props；按鈕改開 modal（保留 plan 建立硬化狀態）；掛載 `<AddItemModal>`。
   - `SessionAccordionWithPlan` + 三個呼叫點 + 主頁面：新增並傳遞 `petId`、`addedNames`（`addedNames` 由 `plan.items` 計算）。

## 給下一棒（4-5）的避讓提醒
- 我**只動**了 `diet/page.tsx` 的「新增項目」相關區塊：
  - 檔頭常數區（刪 `UNIT_OPTIONS`/`TAG_OPTIONS`，約原 77–79 行）。
  - 刪除原 `AddItemForm` 區塊（原約 182–328 行）。
  - `SessionAccordion`（約 184–415 行）：props、`showModal` 狀態、新增按鈕與 modal 掛載。
  - 主頁面 `addedNames` 計算（`itemsForSession` 之後）與三個 `SessionAccordionWithPlan` 呼叫點。
  - `SessionAccordionWithPlan` 定義（檔尾，約 1248–1320 行）。
- **未碰** 4-5 的「AI 智能分析配餐」相關：`AiAnalysisResult`、`DetailedReportModal`、`handleAiAnalyze`、底部「AI 智能分析配餐」按鈕、`DETAIL_REPORT_ITEMS`、`HOT_SEARCH_CHIPS`、`/api/diet-analysis`。可安全在這些區塊作業。

## 未完 / 待驗證
- 端對端真機驗證（需 `ANTHROPIC_API_KEY` 有額度）尚未跑——AI detailed 搜尋與風險判定的實際回傳品質待 QA／frank 實測。
- 風險樣式目前僅在 AI 主動回傳 risk 時呈現；無金鑰環境看不到風險長相（如需，後續可加風險 mock 旗標）。
- 未 commit、未動三份系統文件、未碰正式庫（依本任務指示）。
