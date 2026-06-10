# Phase 5 — Demo 推播改走真實觸發 + Mock 內容（全端）

## 決策背景
frank 拍板：demo 帳號的推播改成「**也走觸發、但內容 mock**」，不再是 no-op 排除。
目的：demo 帳號的 OS 也要真的收到推播（驗證完整流程），但內容一律換成具代表性的
固定範例，不外洩真實食安內容、回應穩定可重現。

## 變更內容

### 1. `src/lib/demo.ts`
- 新增 `isDemoUserId(userId: string): boolean`（判定 `userId === 'demo-user'`）。
- 供只拿得到 userId（非整個 session）的流程使用，如推播發送與食安觸發。

### 2. `src/app/api/push/subscribe/route.ts`
- **移除 POST 的 demo no-op**：demo 帳號也真的 upsert 訂閱進 DB（OS 才收得到）。
- **移除 GET 的 demo 固定狀態分支**：demo 訂閱狀態與真實使用者一視同仁，避免訂閱後
  設定頁仍顯示「未訂閱」的不一致。
- 移除不再使用的 `isDemoUser` import。
- 其餘行為（驗證、欄位檢查、偏好開關 upsert）不變。

### 3. `src/lib/push.ts`
- 新增 `DEMO_MOCK_PAYLOAD: Record<PushKind, PushPayload>` 固定 mock 內容：
  - `foodAlert` → 範例食安警報 mock（title/body/url=`/news`/tag）。
  - `reminder` → 範例每日提醒 mock（title/body/url=`/log`/tag）。
  - 結構與正常 payload 完全一致（沿用既有 `PushPayload` 型別：title/body/url/tag）。
- `sendPushToUser(userId, payload, kind)` 發送前判斷 `isDemoUserId(userId)`：
  - 若是 demo → 將 payload 換成該 kind 的固定 mock，再送。
  - 非 demo → 用原 payload。
- **一處統一**：所有觸發流程（食安、未來提醒 cron）對 demo 一律送 mock，呼叫端無需各自處理。

### 4. `src/app/api/news/crawl/route.ts`
- **移除「排除 demo 訂閱者」的過濾**：訂閱者查詢由
  `where: { foodAlertEnabled: true, user: { id/email not demo } }`
  改為 `where: { foodAlertEnabled: true }`，demo 訂閱者納入發送對象。
- 移除不再使用的 `DEMO_USER_ID` / `DEMO_EMAIL` 常數。
- 真實使用者仍收真實食安內容 + 個人化頭條比對邏輯（PetProduct ∩ affectedBrands）不變；
  demo 的內容由 push.ts 自動換成 mock。

## 驗證
- `npx tsc --noEmit`：通過（無輸出）。
- `npm run build`：✓ Compiled successfully in 18.2s。

## 範圍說明 / 未做
- **未動提醒 cron**（依指示留待下一波）；但 push.ts 的 mock 切換已涵蓋 `reminder` kind，
  屆時提醒 cron 走 `sendPushToUser(..., 'reminder')` 即自動套用 mock，無需再改 push.ts。
- 未 commit、未動三份系統文件、未碰正式庫。

## 動到的檔案
- `src/lib/demo.ts`
- `src/lib/push.ts`
- `src/app/api/push/subscribe/route.ts`
- `src/app/api/news/crawl/route.ts`
