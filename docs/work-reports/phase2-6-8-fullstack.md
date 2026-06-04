# Phase 2-6 / 2-8 全端實作報告

實作者：全端工程師
日期：2026-06-04
範圍限制：僅改三個 bottom-sheet modal 元件與 `DietSwitchPlan`；未動 `diet/page.tsx`、`diary/page.tsx`、首頁、系統文件。

---

## 2-6 手機版 bottom-sheet modal 無法捲動、完成按鈕被擋（P1 bug）

### 問題根因
三個 modal 的外層面板都用：
```
<div className="bg-white rounded-t-3xl overflow-y-auto max-h-[90vh] flex flex-col">
```
1. `max-h-[90vh]` — `vh` 在手機瀏覽器把網址列／工具列也算進可視高度，導致 90vh 實際延伸到可視範圍以下，底部「完成紀錄」按鈕落在看不到也捲不到的區域。
2. 捲動容器同時掛在「外層面板」上、`header` 為 `shrink-0`、但內容區是預設 `min-height:auto` 的 flex child，捲動行為在手機上不穩定。
3. 底部 `pb-8` 未預留 home indicator / safe-area 空間。

### 修法（三個 modal 一致）
- 外層面板改 `flex flex-col` + `max-h-[90dvh]`（`dvh` 動態追蹤實際可視高度），移除面板上的 `overflow-y-auto`。
- 內容區改為獨立捲動區：`flex-1 min-h-0 overflow-y-auto overscroll-contain`，header 維持固定（`shrink-0`），確保可一路捲到底部按鈕。
- 內容區底部 padding 改 `calc(2rem + env(safe-area-inset-bottom))`，讓「完成紀錄」按鈕清開 home indicator。
- 桌面版不受影響（`dvh` 等同 `vh`、`flex-1` 捲動行為一致）。

備註：`env(safe-area-inset-bottom)` 需 viewport `viewport-fit=cover` 才會大於 0；目前 `src/app/layout.tsx` 未設定 `viewport` export（不在本次允許改動範圍）。未設定時該值降級為 0，本修法仍可正常捲到底；若要讓 safe-area padding 真正生效，建議後續在 layout 補 `export const viewport = { viewportFit: 'cover' }`。

### 改動檔案
- `src/components/diary/MedicationModal.tsx`
- `src/components/diary/GroomingModal.tsx`
- `src/components/diary/MeasurementModal.tsx`

---

## 2-8 飲食頁「換食計畫」畫面對照設計圖（按圖施工）

依設計圖 `docs/features/ui-mockups/diet-switch-plan-01.jpg` 重寫 `DietSwitchPlan` 的「計畫進行中」畫面（`DietPlanActive`）。原本只顯示「AI 產品替代推薦」清單，與設計圖完全不符，已整段替換為設計圖四大區塊：

1. 當前測試商品 — 商品圖位、配方名（低敏無穀鮭魚配方 (鮮魚)）、替換目標、標籤（高品質蛋白／腸胃適應期），右上「測試中 (第 N/14 天)」藍色 badge（N 由 `startDate` 推算、上限 14 天）。
2. 7 天換食排程建議 — 卡片含「今日建議比例」+ 比例文字（如 `1:3 (新:舊)`）+ 進度條 + 新/舊配方百分比。比例由 `recommendedRatio(dayCount)` 依天數線性推估後就近取四分位呈現。
3. 身體特徵監控 (最近 7 日) — 兩欄卡片：大便分數（3.5，形狀理想）／抓癢頻率（2.1 次/日，趨勢略微增加，惡化以紅色呈現）。
4. 底部兩鈕 — 「晉升日常飲食」（橄欖綠實心）、「淘汰並更換」（白底紅字外框）。兩者目前都呼叫 `endPlan()` 結束計畫。

### mock 資料
設計用 mock 集中於檔案上方常數（`MOCK_TEST_PRODUCT`、`MOCK_BODY_METRIC`、`SWITCH_PLAN_TOTAL_DAYS`），正式環境改接真實 API。`petId` 仍保留於 props（標 `void petId` 註明未來用途）。

### 其他
- 入口卡片（未啟動計畫時的「AI 換食計劃」黑卡）與 `localStorage` 啟動/結束邏輯維持不變。
- 新增 hydrate 前的 spinner，避免 `localStorage` 造成的閃爍。
- 移除原本未再使用的 `RecCard` / `RecommendedProduct` / API 抓取邏輯（`diary/page.tsx` 內另有獨立同名定義，不受影響）。

### 改動檔案
- `src/components/diary/DietSwitchPlan.tsx`

---

## 驗證
- `DATABASE_URL="file:./dev.db" npx tsc --noEmit` → 通過（exit 0），無型別錯誤。
- 未碰正式 Turso、未 commit、未動三份系統文件。

## 尚未做 / 需 QA 注意
- 手機實機捲動需 QA 在真機（iOS Safari 帶網址列）驗收 2-6。
- 2-8 為 mock 展示，未接真實換食資料 API。
- `env(safe-area-inset-bottom)` 生效前提（viewport-fit=cover）尚未在 layout 設定（不在本次範圍）。
