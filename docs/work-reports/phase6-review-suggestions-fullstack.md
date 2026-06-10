# Phase 6 — Code Review 三項🟡建議落實（全端）

對應待辦 6-8「8」前 3 項。第 4 項（醫療措辭）由 copywriter 處理，本次未動
`demoAnalysis` 與 `diet/page.tsx` 的 expertComment/評語文案。

## 建議 1：環境前綴改用顯式旗標

**現況問題**：`src/lib/email.ts` 錯誤回報信主旨原本用
`process.env.DATABASE_URL?.startsWith('file:')` 判斷 `[測試]`/`[正式]`，過於隱晦。

**改法**：
- 新增 `src/lib/env.ts`，集中環境判斷：
  - `isProductionEnv()`：優先採用明確訊號 `process.env.VERCEL_ENV === 'production'`；
    無 `VERCEL_ENV` 時 fallback 回看 `DATABASE_URL` 非 `file:` 開頭（本機/測試走
    SQLite file:、正式走 Turso）。
  - `appEnvLabel()`：回 `'[正式]'`（正式）或 `'[測試]'`（本機/測試）。
- `src/lib/email.ts` 的 `sendProductErrorReportEmail` 改呼叫 `appEnvLabel()`，
  並更新註解。
- **行為不變**：本機/測試 → `[測試]`、Vercel 正式 → `[正式]`，只是判斷集中且更明確。

**動到檔案**：`src/lib/env.ts`（新增）、`src/lib/email.ts`

## 建議 2：/api/analysis GET 失敗靜默無區分

**現況問題**：GET 失敗時前端靜默，把「無資料」與「載入失敗」混為一談。

**改法**：
- 後端 `src/app/api/analysis/route.ts` 已具備適當 status + 訊息：
  400（缺 petId）、404（查無寵物）、422（尚無使用中產品 → 空狀態）、
  500（伺服器錯誤，含錯誤訊息）。無需再改。
- 前端 `src/components/home/IngredientAnalysis.tsx`：以
  `fetchStatus: 'idle' | 'empty' | 'error'` 區分兩種情境——
  - HTTP 422 → `empty`，顯示空狀態引導（「尚未加入任何產品…」），非錯誤。
  - 其餘非 2xx 或 fetch reject → `error`，顯示錯誤提示卡（紅色 icon + 訊息）
    並提供「重新整理」按鈕（`setRefreshCount` 觸發重打）。
  - 保留既有空狀態與既有 crash 防護，最小改動。

**動到檔案**：`src/components/home/IngredientAnalysis.tsx`
（後端 `route.ts` 無變更）

## 建議 3：刪除配餐項目失敗未回滾

**現況問題**：`src/app/diet/page.tsx` 刪除配餐項目原本樂觀刪除但失敗不回滾，
且 DELETE 回應未檢查 `res.ok`，與數量編輯（有回滾）不一致。

**改法**：
- `handleDelete` 簽名由 `(itemId: string)` 改為 `(item: MealPlanItem)`，
  以便失敗時還原完整項目。
- 流程改為：先 `onItemDeleted(item.id)` 樂觀移除 UI →
  DELETE 後檢查 `if (!res.ok) throw` → catch 內 `onItemAdded(item)` 還原並
  `alert('刪除項目失敗，請稍後再試')`，與 `handleQuantityChange` 的回滾模式一致。
- 呼叫端 `onClick` 由 `handleDelete(item.id)` 改為 `handleDelete(item)`。

**動到檔案**：`src/app/diet/page.tsx`
（未動 expertComment/評語文案；該檔內醫療措辭調整為 copywriter 既有變更，未碰）

## 驗證結果

- `npx tsc --noEmit`：**通過（exit 0）**。
- `npm run build`：**Compiled successfully in 27.2s（exit 0）**。
- 改動檔單獨 lint（`eslint src/lib/env.ts src/lib/email.ts
  src/components/home/IngredientAnalysis.tsx src/app/api/analysis/route.ts
  src/app/diet/page.tsx`）：**0 error**，僅 1 個 pre-existing `<img>` warning
  （`IngredientAnalysis.tsx:524`，非本次改動行）。

## 邊界遵守

- 未 commit。
- 未動三份系統文件（系統架構/系統機制/版本紀錄）。
- 未動任何 expertComment/評語文案與 `demoAnalysis`（copywriter 已處理）。
