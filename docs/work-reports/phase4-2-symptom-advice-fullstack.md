# Phase 4-2 症狀詳情頁 AI 建議 — 全端工作報告

**角色：** 全端工程師
**日期：** 2026-06-10
**對應待辦：** Phase 4-2（症狀詳情頁 AI 建議）

## 目標
症狀詳情頁（`/symptoms/[type]`）依該毛孩、該症狀類型的紀錄，產生 AI 的「可能原因 / 建議做法」一段建議；附 `VET_REFERENCE_SCOPE`、非醫療診斷語氣；結果快取避免每次重打 AI；處理無資料/載入中/失敗狀態。

## 變更內容

### 1. 新增 endpoint：`GET /api/symptoms/advice`
檔案：`src/app/api/symptoms/advice/route.ts`（新增）

- 參數：`petId`、`symptomType`（必填）、`refresh=1`（選填，強制重生）。
- **pet-scoped → 已加 `requirePetAccess`**（先驗權限再呼叫 anthropic，避免無權者燒 token，沿用 `/api/chat`、`/api/analyze` 既有寫法）。
- 撈該毛孩該症狀類型近 30 筆紀錄；無紀錄回 `{ advice: null }`，不打 AI。
- prompt 用 `claude-sonnet-4-6`，注入毛孩資料 + 歷次紀錄（由舊到新呈現趨勢），附 `VET_REFERENCE_SCOPE`，並明確要求「非醫療診斷、嚴重請立即就醫」語氣。
- 要求回傳 JSON `{ possibleCauses[], recommendedActions[] }`；解析失敗時退化為純文字塞進可能原因，仍可顯示。
- 錯誤處理沿用 `/api/chat` 模式：餘額不足 402、API key 缺 401、其餘 500。

### 2. 症狀詳情頁
檔案：`src/app/symptoms/[type]/page.tsx`（修改）

- **順帶修正 Phase 0-5 同類 bug**：原本用 `fetch('/api/pets')` 取 `pets[0]`（最舊寵物，抓錯毛孩）→ 改為讀 `localStorage` `drpet_currentPetId` + `storage` 事件同步，對齊 `/symptoms` 列表頁與全站做法。
- 新增「AI 觀察建議」卡片，置於統計與記錄列表之間，分「可能原因」「建議做法」兩段，底部固定一行免責聲明。
- 有紀錄時自動抓建議；提供「重新生成」按鈕（帶 `refresh=1`）。
- 狀態處理：載入中（「AI 分析中…」）、失敗（紅字 + 重試鈕）、無建議（「暫無 AI 建議」）、無紀錄則整張卡不顯示。

## 快取方式（重點）

沿用既有 `AIInsight` 模型，**不新增資料表**：

- 每筆建議存成一列 `AIInsight`，`symptomType` = 該症狀類型。
- 以 `petId + symptomType + 各紀錄(id/severity/notes/createdAt)` 算 **sha1 dataHash**（任何新增/刪除/編輯紀錄都會改變雜湊）。
- dataHash 存進本功能未使用的 `suspectedTriggers` 欄位（格式 `["__hash__:<hash>"]`）；`rationale` 存「可能原因」整段、`recommendedActions` 存建議陣列。
- GET 時先撈該 `(petId, symptomType)` 最新一列：**雜湊相同 → 直接回快取（不打 AI、回 `cached: true`）**；不同或 `refresh=1` → 重新生成並寫入新列。

效果：同一症狀類型在沒有新紀錄時，反覆進頁面只會打一次 AI。

## 驗證

- `npx tsc --noEmit`：**通過，無錯誤**。
- `eslint`（兩支變更檔）：**無問題**。
- 未對正式庫寫入；未動 `prisma/seed.ts`（並行衝突）；未 commit；未動三份系統文件。

## Mock / 待補
- **無新增 mock**。建議由真實 `SymptomEntry` 紀錄即時生成（demo 寵物「布丁」已有 seed 的症狀紀錄可驗證）。
- 需 `ANTHROPIC_API_KEY` 有效且有餘額才能實際生成；無餘額時前端會顯示「AI 服務餘額不足」錯誤 + 重試（已處理）。

## 動到的檔案
- `src/app/api/symptoms/advice/route.ts`（新增）
- `src/app/symptoms/[type]/page.tsx`（修改）
- `docs/work-reports/phase4-2-symptom-advice-fullstack.md`（本報告）

## 邊界遵守
- 只動 symptoms 相關（`symptoms/[type]` page + 新 endpoint）。
- 未碰 diary / diet / 首頁 / news（其他 agent 並行中的檔案 `news/crawl`、`DietSwitchPlan`、`switch-plan-ai` 皆未動）。
