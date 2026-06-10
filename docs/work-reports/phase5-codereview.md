# Phase 5 Web Push — Code Review（PurePaw Code Reviewer / 兼資安視角）

對象：Phase 5（5-B 基礎 / 5-C 食安 / demo 推播 / 5-D 提醒）整批未 commit 改動。
審查方式：對照 `git diff` 全貌、`docs/features/push/push-spec.md`、`architecture`/慣例，並實跑型別檢查與 build。

## 驗證結果（實跑）

| 項目 | 指令 | 結果 |
|---|---|---|
| 型別檢查 | `npx tsc --noEmit` | ✅ EXIT 0，零錯誤 |
| production build | `npm run build` | ✅ EXIT 0，全 route 編譯成功（含 `/api/push/*`、`/api/reminders/check`） |
| 相依 | `web-push` + `@types/web-push` | ✅ 已安裝、已列入 package.json |
| 資產 | `public/app-logo.png`（manifest/sw icon） | ✅ 存在 |

## 結論：可否 commit

**可以 commit。** 未發現 🔴 必修（阻擋上線）的問題。下列 🟡 建議多為一致性 / 死碼 / 體驗瑕疵，不影響功能正確性與資安，可本批一起修或排後續。轉交全端工程師處理（我只審查、不改碼）。

---

## 資安檢查（逐項）

| 檢查點 | 結果 | 說明 |
|---|---|---|
| VAPID 私鑰只在後端 | 🟢 OK | `VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`/`VAPID_PUBLIC_KEY` 僅出現在 `src/lib/push.ts:11-13`（server-only，import prisma+web-push，client 引用會 build 失敗，build 已通過代表無 client 引用）。前端只用 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（`PushSettings.tsx:130`）。 |
| 訂閱/退訂限本人 | 🟢 OK | subscribe `upsert` 一律寫 `userId: session.user.id`（`subscribe/route.ts:72,80`）；unsubscribe 用 `deleteMany where { endpoint, userId: session.user.id }`（`unsubscribe/route.ts:33-35`），無法刪別人 endpoint。 |
| 未登入拒絕 | 🟢 OK | subscribe GET/POST 與 unsubscribe 皆先 `auth()`，無 session 回 401（`subscribe/route.ts:16,40`、`unsubscribe/route.ts:13`）。 |
| cron 授權 | 🟢 OK | `reminders/check/route.ts:7-11` 與 `news/crawl/route.ts:76-80` 皆檢查 `Authorization: Bearer ${CRON_SECRET}`，且 `CRON_SECRET` 未設時 `return false`（fail-closed，不會誤開）。 |
| 不外洩他人訂閱/資料 | 🟢 OK | 個人化頭條比對只查訂閱者自己有權限的毛孩產品（`news/crawl/route.ts:300-303` 的 `pet: { OR: [{userId},{members.some.userId}]}`），無跨使用者外洩。推播 payload 不含他人資料。 |

資安面無 🔴。

---

## 功能正確性檢查（逐項）

### demo 分流
- 🟢 `sendPushToUser`（`push.ts:111`）對 demo userId 一律以 `DEMO_MOCK_PAYLOAD[kind]` 取代整個 payload，單點統一涵蓋食安與提醒兩條觸發流程；非 demo 用真實內容。
- 🟢 subscribe 對 demo 不再 no-op：真的存訂閱（OS 才收得到），符合「走真實觸發、內容換 mock」拍板。

### 食安觸發（5-C）
- 🟢 只取 `category=food_safety AND isUrgent AND foodAlertPushedAt IS NULL`（`news/crawl/route.ts:282`）。
- 🟢 每篇推完（即使 0 訂閱）`update foodAlertPushedAt`（`:336-339`），防重複。
- 🟢 失效訂閱（410/404）於 `push.ts:79-83` 以 endpoint `delete().catch(()=>{})` 清除，冪等。
- 🟢 推播失敗以 try/catch 包住（`:357-362`），不會讓已生成文章的 crawl 整體回錯。
- 🟢 個人化頭條比對：`brandsHitProducts` 設長度下限 ≥2、雙向 includes，邏輯合理（`:234-244`）。

### 提醒 cron（5-D）
- 🟢 時區：`vercel.json` `0 0 * * *`（UTC 00:00 = 台灣 08:00），與 `reminders/check` 註解一致；`taiwanTodayEndUtc` 以台灣當日結束為上界（`:21-29`）。`nextReminder` 由 `'YYYY-MM-DD'` 經 `new Date()` 存 UTC 午夜，比對語意正確。
- 🟢 一次性清除 / 週期順延：`computeNextReminder`（`:51-61`）intervalDays 為 null/≤0 回 null（清除）；>0 以 while 連推到 `> dueBefore`，避免漏推累積後下次又判到期狂推。
- 🟢 record route 寫入時 `reminderIntervalDays` 僅 >0 才存、否則 null（medication/grooming route），與 cron 假設一致。

### migration（安全性）
- 🟢 三個 migration 皆「只新增資料表 / nullable 欄位」：`PushSubscription` 為 CreateTable；`affectedBrands`/`foodAlertPushedAt`/`reminderIntervalDays` 皆 `ADD COLUMN` 且 nullable，對既有資料無破壞性，`prisma migrate deploy` 安全。schema 與 migration 欄位/索引一致（`PushSubscription` endpoint unique + userId index）。

### PWA / SW
- 🟢 `manifest.webmanifest` 欄位完整（name/short_name/start_url/display/icons 192+512）；`layout.tsx` 以 metadata 掛 `manifest` 與 appleWebApp。
- 🟢 `sw.js` push 事件解析 JSON、headline 旗標放大顯示（requireInteraction/renotify/vibrate）；notificationclick 先聚焦既有同源視窗再導向，fallback openWindow，邏輯正確。

---

## 🟡 建議（不阻擋 commit）

1. **demo 退訂與訂閱行為不對稱 → 可能殘留孤兒訂閱列**
   `unsubscribe/route.ts:18-20` 對 demo 直接回 `{ok:true, demo:true}` 不刪 DB；但 `subscribe` 對 demo 卻真的寫入訂閱列。結果：demo 帳號「關閉推播」後，瀏覽器端 `sub.unsubscribe()` 已退，但 DB 仍留該 endpoint 列，且 demo 之後仍會收到（mock）推播，且孤兒列會累積。
   建議：unsubscribe 對 demo 也走 `deleteMany where {endpoint, userId}`（與真實帳號一致），移除特例。

2. **`status.demo` 在前端是死碼，且設定頁文案誤導**
   `subscribe/route.ts` 的 GET 從不回 `demo` 欄位（刻意把 demo 當真實訂閱者處理），故 `PushSettings.tsx` 內所有 `status.demo` 分支（`:161-163,212-218,228-231,273-278,305-307`）永遠走不到，屬死碼；同時 `:162` 文案「示範帳號不收真推播」、`:306`「不會收到真實推播」與實際「demo 會收到 mock 推播」矛盾。
   建議：擇一收斂——若維持「demo 收 mock 真推播」設計，移除 `status.demo` 死碼與矛盾文案；若要顯示 demo 提示，則 GET 應回 `demo` 並讓行為自洽。慣例上不留死碼（coding-conventions）。

3. **headline 旗標靠「結構性多餘屬性」傳遞，型別上不可見**
   `headlineFoodAlertPayload` 回傳 `PushPayload & {priority,headline}`，但 `sendPushToUser`/`sendPush` 形參型別為 `PushPayload`，`priority`/`headline` 不在型別內、僅靠 runtime 物件多帶屬性 + `JSON.stringify` 才到 `sw.js`。功能正確（build 通過），但任何 `{...payload}` 重組或日後加 `select`/型別收斂都會默默掉旗標。
   建議：把 `priority?: 'high'`、`headline?: boolean` 正式納入 `PushPayload` interface（`push.ts:21-28`），讓資料流型別可見、避免回歸。

4. **食安推播為逐使用者序列 `await`（潛在效能）**
   `triggerFoodAlertPush` 對每位 userId 先一筆 `petProduct.findMany`（`:298-316`），再對每篇文章逐 userId 序列 `await sendPushToUser`（`:320-334`）。訂閱者多時為 N+M 次序列往返。目前規模可接受，但屬已知擴充點。
   建議：產品關鍵詞預載可改批次查詢；發送可比照 `sendPush` 的 `Promise.all` 併發。非必修。

5. **`reminders/check` 內亦為逐毛孩序列 `await`（同上，規模小可接受）**
   `:88-133` 逐筆 record → 逐 userId 序列發送。同 4 的觀察，目前可接受。

---

## 🟢 其它確認 OK
- 慣例：公開函式皆標回傳型別、註解寫「為什麼」、無 `any` 濫用、命名清楚、提早 return；新元件 `PushSettings`/`ReminderSetter` 風格貼合既有 mobile-first/Tailwind 寫法。
- `ReminderSetter` 抽出共用、移除兩 Modal 重複的 `BellIcon` 與 `alert('即將推出')` 佔位，DRY 改善。
- 錯誤處理：API 對 JSON parse、缺欄位、AI 格式錯誤（ParseError→502）皆有明確狀態碼，不洩漏堆疊。
