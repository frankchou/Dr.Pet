# Phase 4-6 換食計畫串 AI + 結束計畫按鈕（全端工作報告）

**角色：** 全端工程師
**日期：** 2026-06-10
**對應待辦：** Phase 4-6（換食計畫串 AI；新增「結束計畫」按鈕）
**設計圖：** `docs/features/ui-mockups/diet-switch-plan-01.jpg`（畫面結構不變，僅把 mock 換成 AI/真實資料）

---

## 一、做了什麼

### 1. 新增 AI 換食建議 endpoint：`POST /api/switch-plan-ai`
- 檔案：`src/app/api/switch-plan-ai/route.ts`（新檔）
- **pet-scoped → 已加 `requirePetAccess`**（先驗權限再呼叫 anthropic，避免無權者燒 token，與既有 AI route 一致）。
- 輸入：`{ petId, dayCount }`（換食已進行到第幾天，1 起算、上限 14）。
- 處理：
  - 取該毛孩近 7 日 `DailyHealthLog`（排便型態 `stoolType`/排便細節 `stoolDetails`/皮膚毛髮 `skinHair`/消化 `digestion`/胃口/精神），用 `parseJson` 安全讀 JSON array 欄位。
  - 整理寵物基本資料（含 `mainProblems`、`allergies`）+ 日誌摘要，組 prompt 交 `claude-sonnet-4-6`。
  - prompt **附 `VET_REFERENCE_SCOPE`**。
- 輸出（`SwitchPlanResult`）對應 DietSwitchPlan 三區塊：
  - `schedule`：今日建議比例（新:舊）+ `label` + 進度條百分比。
  - `bodyMetric`：大便分數（0–7）、狀態、抓癢頻率（次/日）、趨勢、是否惡化。
  - `verdict`：晉升/淘汰建議（`suitable`/`monitor`/`discard` + 文字提示）。
- **降級（資料不足）：** 近 7 日日誌少於 3 天 → 直接回 `degradedResult()`（沿用線性排程比例 + 身體監控標示「尚無足夠日誌」+ 待觀察提示，`degraded: true`），不打 AI。
- 錯誤處理沿用既有慣例（402 餘額不足 / 401 API key / 500）。

### 2. `DietSwitchPlan` 改吃 AI（mock 留作 fallback）
- 檔案：`src/components/diary/DietSwitchPlan.tsx`
- `DietPlanActive` 內以 `fetch('/api/switch-plan-ai')` 取 AI 資料：
  - **排程比例** / **身體特徵監控** 兩區塊改吃 AI；AI 載入中／失敗時回退既有 mock（`recommendedRatio()` / `MOCK_BODY_METRIC`），維持設計圖長相不破。
  - 新增第三類資訊「**晉升/淘汰建議**」：在身體特徵監控區塊下方顯示 AI `verdict`（綠=適應良好 / 紅=建議淘汰 / 米=持續觀察）。
  - 排程區標題列加 AI 狀態：載入中顯示「AI 分析中」spinner；失敗或資料不足顯示可點重試。
- **當前測試商品** 仍為 mock（換食商品來源尚未串接，屬待辦 4-4 範圍，本次未動），已在註解標明。
- 畫面結構、配色、區塊順序維持與設計圖一致。

### 3. 「結束計畫」按鈕
- 在換食計畫畫面底部行動鈕下方新增「結束計畫」文字入口。
- 點下 → 展開**確認框（確認 + 取消）**，避免誤按；確認後呼叫 `onEnd`（= 既有 `endPlan`），清除進行中計畫的 localStorage 狀態（`drpet_hasPlan` / `drpet_planStart`），回到未啟動換食畫面。
- 與「晉升日常飲食 / 淘汰並更換」區隔：單純臨時中止，不視為有結論的結束。

---

## 二、檔案清單

| 檔案 | 動作 |
|------|------|
| `src/app/api/switch-plan-ai/route.ts` | 新增（AI 換食建議 endpoint，pet-scoped + requirePetAccess + VET_REFERENCE_SCOPE + 降級） |
| `src/components/diary/DietSwitchPlan.tsx` | 修改（三區塊改吃 AI、mock 作 fallback、晉升/淘汰建議區、結束計畫按鈕） |

> 未動 `diary/page.tsx`、`diet/page.tsx`、首頁、其他頁；未動 `prisma/seed.ts`、系統三文件、正式庫；未 commit。

---

## 三、驗證

- `npx tsc --noEmit`：**通過，無錯誤**。
- `npx eslint`（變更檔）：唯一一則 `react-hooks/set-state-in-effect` 屬**既有 hydration `useEffect`**（非本次新增；stash 對照確認改動前即存在，且本次未新增此類 lint）。

---

## 四、需總指揮 / 其他角色後續

1. **mock 資料補充（不由我改 seed.ts，列此供總指揮統一補）：**
   - 要看到 AI 換食建議（非降級）的完整長相，demo 毛孩「布丁」需有**近 7 日 ≥ 3 天的 `DailyHealthLog`**，且包含排便型態與皮膚搔抓相關欄位變化（Phase 2-4 已補 6/1~6/4 輪替樣態；若要更明顯的趨勢可再加幾天搔抓遞增/排便偏軟的紀錄）。
   - 目前日誌不足時會走降級分支（畫面正常、顯示「資料不足，點此重試」），不影響驗收降級行為。
2. **「當前測試商品」串接**屬待辦 4-4（飲食頁 AI 產品搜尋/綁定 productId）範圍，本次刻意不動，維持 mock。
3. QA 可驗：有日誌 → AI 三區塊與建議；無日誌 → 降級；結束計畫 → 確認/取消 → 回未啟動畫面。
