# Phase 4-1 快訊 AI 生成機制 — 全端工作報告

## 摘要
讓 AI 定期生成寵物食安/危險禁忌/健康知識三類快訊，寫入 `NewsArticle`，取代目前空 DB；`/news` 三分類即可顯示真實生成內容。觸發採 Vercel Cron（每日）+ 可手動觸發的受保護 endpoint，沿用既有 `CRON_SECRET` 授權樣式。

## 現況確認（動工前）
`src/app/api/news/crawl/route.ts` 已存在，原本就會：用 `claude-sonnet-4-6` 一次生成三類文章、`isValidArticle` 過濾髒資料、近 7 天同標題去重、寫入 `NewsArticle`，並用 `Authorization: Bearer <CRON_SECRET>` 授權。`/api/news`（GET 依 category 撈最新 20 筆）與 `/news` 頁（三 tab、骨架載入、空狀態）皆已可運作。`vercel.json` 已有 cron 設定。

也就是說機制骨架已在，但有幾個會讓它實際跑不起來/不合規格的缺口，已修正如下。

## 本次變更

### `src/app/api/news/crawl/route.ts`
1. **補上 `VET_REFERENCE_SCOPE`**（任務硬性要求）：原 prompt 未附權威獸醫來源範圍，現已 `import { VET_REFERENCE_SCOPE } from '@/lib/utils'` 並附加到 prompt 末端，與其他 AI route 一致。
2. **新增 GET handler（關鍵修正）**：Vercel Cron 是以 **GET** 觸發排程 endpoint，原檔只有 POST，cron 實際會打不到（方法不符）。現抽出共用 `handle()`，同時 export `GET`（給 Cron）與 `POST`（給手動觸發），兩者都走同一套 `CRON_SECRET` 授權，避免被任意呼叫。
3. **JSON 防呆**：新增 `stripCodeFence()`，AI 偶爾仍把 JSON 包在 ```` ```json ```` fence 內，先剝除再 parse，降低 502 機率。
4. **去重更精準**：重複判斷由「近 7 天同標題」改為「近 7 天**同分類**同標題」，同主題/同日不重複塞，符合任務防重複要求。
5. **錯誤分流**：以 `ParseError` 區分「AI 格式錯誤 → 502」與「其他例外 → 500」。

快訊維持全站公開、非 pet-scoped，未引入 `requirePetAccess`（符合需求）。

### 觸發方式與 cron 設定（`vercel.json`，沿用既有）
```json
{
  "crons": [
    { "path": "/api/news/crawl", "schedule": "0 2 * * *" }
  ]
}
```
- 每日 02:00 UTC（台灣 10:00）由 Vercel Cron 以 GET 觸發。Vercel 在正式站會自動帶 `Authorization: Bearer $CRON_SECRET`。
- 手動觸發（測試用）：
  ```bash
  curl -X POST https://<domain>/api/news/crawl \
    -H "Authorization: Bearer $CRON_SECRET"
  # 或 GET，行為相同
  ```
- 回傳：`{ "created": <寫入筆數>, "skipped": <去重/不合格略過筆數> }`。

> 註：Vercel Hobby 方案 cron 上限為每日一次；目前每日一次符合限制。若改 Pro 想更頻繁，調整 `schedule` 即可（程式無需改）。

## 環境變數
- `CRON_SECRET` —— 本機 `.env` 已有（`dev-cron-secret-2024`）。**正式站需在 Vercel → Settings → Environment Variables 設定同名變數**，否則 `isAuthorized` 因 secret 未設一律回 401（已防呆：未設 secret 不放行）。
- `ANTHROPIC_API_KEY` —— 既有。

## tsc 結果
`npx tsc --noEmit` 通過（EXIT 0）。

## 邊界遵守
- 只動 news 相關：僅改 `src/app/api/news/crawl/route.ts`。`vercel.json` 既有設定已正確，本次未改動。`/api/news`、`/news` 頁未改（原本即可用）。
- **未改 `prisma/seed.ts`**（並行衝突）。
- 未碰 diary/diet/首頁/symptoms。
- 未 commit、未動三份系統文件、未對正式庫寫入。

## 待總指揮 / 後續
1. **正式站環境變數**：請於 Vercel 補 `CRON_SECRET`。
2. **Demo 假快訊**：本次未動 seed。若需在 demo/本機立即看到資料，有兩條路（擇一，請總指揮統一處理）：
   - 由有 `ANTHROPIC_API_KEY` 的環境手動觸發一次 `POST /api/news/crawl`（會寫真實 AI 內容）。
   - 在 `prisma/seed.ts` 補 demo `NewsArticle`（依待辦 0-3：三分類各 2 筆，共 6 筆）—— 因並行衝突，留給總指揮統一補。
3. **Phase 5（食安警報推播）相依**：本機制已產出 `category="food_safety"` 且帶 `isUrgent` 旗標的快訊，可作為推播來源。

## 相關檔案（絕對路徑）
- `/workspaces/Dr.Pet/src/app/api/news/crawl/route.ts`（本次修改）
- `/workspaces/Dr.Pet/vercel.json`（既有 cron 設定，未改）
- `/workspaces/Dr.Pet/src/app/api/news/route.ts`（消費端 GET，未改）
- `/workspaces/Dr.Pet/src/app/news/page.tsx`（顯示端，未改）
- `/workspaces/Dr.Pet/prisma/schema.prisma`（`NewsArticle` model，未改）
