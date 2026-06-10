# Phase 5 Web Push — Code Review 修正（PurePaw 全端工程師）

對應 `docs/work-reports/phase5-codereview.md` 的 5 項 🟡 建議，全部修畢。
未 commit、未動三份系統文件、未碰正式庫。

## 驗證結果（實跑）

| 項目 | 指令 | 結果 |
|---|---|---|
| 型別檢查 | `npx tsc --noEmit` | EXIT 0，零錯誤 |
| production build | `npm run build` | EXIT 0，全 route 編譯成功（含 `/api/push/*`、`/api/news/crawl`、`/api/reminders/check`） |

## 各項修正

### #1 demo 退訂與訂閱一致
- `src/app/api/push/unsubscribe/route.ts`：移除 demo no-op 特例（原本 demo 直接回 `{ok:true, demo:true}` 不刪 DB）。
- demo 退訂現在與真實帳號走完全相同的 `deleteMany where {endpoint, userId}` 流程，真的刪 DB 訂閱，不再殘留孤兒訂閱列。
- 同步移除已不再使用的 `isDemoUser` import。
- 確認 subscribe/unsubscribe 兩端 demo 皆走正常 DB 流程；唯一差異是「送出的推播內容」在 `src/lib/push.ts` 由 `DEMO_MOCK_PAYLOAD` 換成 mock。

### #2 設定頁死碼 + 文案矛盾
- `src/components/settings/PushSettings.tsx`：
  - `SubscribeStatus` 移除 `demo?` 欄位（GET 從不回此欄位，為死碼）。
  - 移除 `enableKind` 內 `data.demo` 分支與「示範帳號不收真推播」誤導訊息。
  - `handleToggle` 的 `displayedOn` 與狀態回寫移除 `status.demo` 分支，統一以「有訂閱且旗標為 true」判斷顯示開關，並一律 `loadStatus()` 以後端為準。
  - 顯示用 `foodAlertOn` / `reminderOn` 移除 `status.demo` 三元分支。
  - 移除底部「示範帳號可切換開關展示，但不會收到真實推播」的矛盾文案區塊。
  - 結論：採「demo 收 mock 真推播」設計，全部 demo 死碼與矛盾文字收斂移除（符合 coding-conventions 不留死碼）。

### #3 headline 旗標納入型別
- `src/lib/push.ts`：`PushPayload` interface 正式新增 `priority?: 'high'` 與 `headline?: boolean`，附註解說明用途與資料流（隨 `JSON.stringify` 帶到 `sw.js`）。
- `src/app/api/news/crawl/route.ts`：`headlineFoodAlertPayload` 回傳型別由 `PushPayload & {priority,headline}` 交集改為 `PushPayload`，旗標改由 interface 表達，避免日後 `{...payload}` 重組或型別收斂默默掉旗標。
- `public/sw.js` 讀取端（`data.headline` / `data.priority`）無需改動，已與型別對齊。

### #4 + #5 推播送出改分批並行
- `src/lib/push.ts`：新增 `sendInBatches<T>(items, worker)` 工具——每批上限 `PUSH_BATCH_SIZE = 50`，逐批 `Promise.allSettled`，單一目標失敗（含內部拋錯）不影響同批其他目標；各 worker 回傳「成功送達筆數」，最後加總。失效訂閱（410/404）清除沿用 `sendPush` 既有行為。
- `src/app/api/news/crawl/route.ts`（食安觸發）：每篇文章對訂閱者改用 `sendInBatches` 並行送出；headline 命中數於 worker 內依送達筆數累加，語意與原序列版本一致。
- `src/app/api/reminders/check/route.ts`（提醒 cron）：用藥與美容兩條送出路徑各自對該毛孩的有權限使用者改用 `sendInBatches` 並行送出。
- 註：本次聚焦發送並行化（frank 指定的 #4/#5）。code review #4 另提及的「產品關鍵詞預載改批次查詢」屬非必修最佳化，未在本批處理，逐使用者 `petProduct.findMany` 維持原狀。

## 更新檔案
- `src/lib/push.ts`
- `src/app/api/push/unsubscribe/route.ts`
- `src/components/settings/PushSettings.tsx`
- `src/app/api/news/crawl/route.ts`
- `src/app/api/reminders/check/route.ts`
