# Phase 0 收尾 — QA 驗證報告

- 驗證者：QA 測試工程師
- 日期：2026-06-04（伺服器時間，與 seed 相對日期一致）
- 方式：靜態分析 + 本機 `dev.db` 唯讀查詢（sqlite3）+ `tsc --noEmit`
- 環境鐵則遵守：未對 `.env` 的正式站 Turso 寫入任何資料；seed 防呆測試使用假 libsql URL。
- 整體結論：**PASS（含 1 項條件性問題，見項目 2）**

| # | 項目 | 結果 |
|---|------|------|
| 1 | Seed 防呆 | PASS |
| 2 | ProductReaction → /diary 顯示 | PASS（功能正確）／**條件性 FAIL（demo 6 筆只看得到 1 筆）** |
| 3 | AIInsight 顯示端 | PASS |
| 4 | /symptoms 抓 currentPetId | PASS |
| 5 | 手機頭像選單 | PASS |

`tsc --noEmit`：通過（EXIT 0）。

---

## 1. Seed 防呆 — PASS

`prisma/seed.ts` L21-27：若 `DATABASE_URL` 不以 `file:` 開頭即 `console.error` 並 `process.exit(1)`，且此判斷在建立 PrismaClient／adapter 之前。

實測（直接以 jiti 跑 seed 檔，避免 prisma 包裝層覆蓋 env）：
```
DATABASE_URL="libsql://fake-not-real.turso.io" node_modules/.bin/jiti prisma/seed.ts
→ ✋ 中止 seed：DATABASE_URL 不是本機 SQLite（file:）。
  EXIT=1
```
在連線前即中止，不會寫入。防呆有效。

備註：以 `npx prisma db seed` 帶入假 URL 時，prisma 的 seed runner 會載入 `.env`，出現 URL 解析錯誤（`H.replace`）而提前崩潰——同樣不會寫入，但錯誤訊息不如直接跑明確。守門邏輯本身正確；此為 prisma runner 載入 .env 的行為，非守門失效。

## 2. ProductReaction → /diary — 功能 PASS，資料顯示條件性 FAIL

元件鏈：`/diary` → `DailyReactionCard`（L1335，僅在「週曆頁面」tab 渲染）→ `GET /api/reactions?petId=&date=`。

- `/api/reactions` GET 依 `petId`(+`date`) 過濾；POST 用 `upsert({ where: petId_productId_date })`，**守 `@@unique([petId, productId, date])`**，新增/修改同日同產品評分為覆蓋而非重複。PASS。
- `DailyReactionCard` 對 `pet-products`（固定+試用清單）逐項渲染，並以 `reactions.find(r => r.productId === pp.productId)` 標示當日評分。demo 兩個產品(demo-prod-1/2)皆在 fixed 清單，故兩列都會出現。

**問題（顯示不出來的情況）**：`DailyReactionCard` 的 `date` 綁定 `/diary` 的 `selectedDate`，而 `selectedDate` 預設 = 今日且**從未被更新**——`WeekCalendar`/`MonthCalendar` 各自維護內部 `selectedDate`，沒有上拋給頁面的 `selectedDate` state。因此評分卡固定查「今日」。

本機 demo 6 筆 ProductReaction 日期分布（今日 2026-06-04）：
```
demo-prod-1  ok    2026-05-30
demo-prod-2  good  2026-05-31
demo-prod-1  bad   2026-06-01
demo-prod-2  good  2026-06-02
demo-prod-1  good  2026-06-03
demo-prod-2  ok    2026-06-04  ← 唯一落在今日
```
→ 卡片只會顯示 **demo-prod-2 = 😐（今日）** 這 1 筆已選評分；demo-prod-1 今日無評分顯示為未選；其餘 5 筆（05-30~06-03）在此 UI **無法被查看**。

再加上 `DailyReactionCard` 只在「週曆頁面」tab 出現（預設 tab 是「月曆頁面」），使用者需先切到週曆才看得到卡片。

結論：
- 「demo 的 6 筆是否真的會在 /diary 顯示」→ **否，只有今日那 1 筆**。其餘需有改變查詢日期的 UI 才看得到。屬 UI 限制（非資料或 API 錯誤）。
- 評分新增/修改守 `@@unique` → **PASS**。

建議（交全端評估，QA 不改碼）：讓週曆/月曆選取的日期上拋以驅動 `DailyReactionCard` 的 `date`；或 seed 將示範評分集中於今日，使 demo 一眼可見多筆。

## 3. AIInsight 顯示端 — PASS

- 顯示端：`/nutrition` → `CorrelationInsights`（讀 `drpet_currentPetId`，listen storage event）→ `GET /api/analyze?petId=`。
- `GET /api/analyze`（route.ts L7-24）`findFirst({ where: { petId }, orderBy: createdAt desc })` → **僅回傳當前寵物最新一筆**，不洩漏他寵物資料。PASS。
- demo 資料：`demo-insight-1`（petId=demo-pet-pudding, symptomType=skin, confidence=medium, 含 rationale / suspectedTriggers / helpfulFactors / recommendedActions）確實存在於 dev.db。
- `CorrelationInsights` 以 `triggerName()` 同時相容 seed 的「字串陣列」與 AI 產出的「物件陣列」trigger 格式；`parseJson` 安全解析。
→ demo AIInsight 會正確顯示。前提是 `drpet_currentPetId` 已設為 demo-pet-pudding（見項目 4，登入 demo 帳號時成立）。

## 4. /symptoms 抓 currentPetId — PASS

- `src/app/symptoms/page.tsx` L40-67：改以 `localStorage.getItem('drpet_currentPetId')` 為準（並 listen storage event），**已無「抓最舊寵物」的 fallback**。
- `GET /api/symptoms?petId=` 依 petId 過濾、`createdAt desc`。
- demo 5 筆症狀（皆 petId=demo-pet-pudding）：skin×2、digestive、ear、tear。`summarizeByType` 每型取最新一筆 → 顯示 4 張類型卡（skin 合併 2 筆並算趨勢 改善/持平），oral/joint/other 無資料歸入「尚未記錄」區。符合預期。
- currentPetId 解析正確性：demo 帳號 `/api/pets` 以 `session.user.id` 過濾，`布丁`(userId=demo-user) 會回傳、`咚咚`(無 userId 之 legacy) 不回傳；首頁以 stored 或 `data[0]` 設 currentPetId → 落在 `demo-pet-pudding`。→ 布丁的 5 筆症狀能顯示。**修正先前抓最舊寵物導致看不到的問題，PASS。**

## 5. 手機頭像選單（切換毛孩 / 設定 / 登出）— PASS

`src/components/layout/AppShell.tsx`：
- 切換毛孩 `switchPet()` L80-85：`localStorage.setItem('drpet_currentPetId', petId)` + `window.dispatchEvent(new StorageEvent('storage', { key:'drpet_currentPetId', newValue: petId }))` + 更新本地 state + 關閉選單。同分頁手動派發 storage event，使 /、/symptoms、/nutrition、/diary 等同頁監聽者即時同步。邏輯正確。
- 設定 L166：`router.push('/settings')` 並關閉選單。正確。
- 登出 L173：`signOut({ callbackUrl: '/' })`（next-auth）。正確。
- 目前毛孩以 `(目前)` 標示、深色頭像 highlight；選單外點擊 (mousedown) 關閉。
→ 三項邏輯皆正確，PASS。

---

## 仍可能「顯示不出來」的情況彙整

1. **/diary 評分卡（項目 2）**：固定查今日 + 僅在週曆 tab → demo 6 筆只看得到今日 1 筆，且需先切到「週曆頁面」。其餘 5 筆無查看路徑。建議交全端讓選取日期驅動卡片 date。
2. **共通前提**：所有顯示端（symptoms / nutrition / diary 評分卡）都依賴 `drpet_currentPetId` 已寫入 localStorage。首次進站若先到的頁面不是首頁、且尚未設定 currentPetId，可能短暫空白；登入 demo 帳號並經首頁後即正常。此為既有行為，非本次回歸。

## 未測 / 範圍外
- 未啟動 server 跑端對端點擊流程（依任務以靜態 + 唯讀 DB 驗證為主）。
- `api/pets/[id]/invitations`、`src/lib/email.ts`、`diet/page.tsx` 等 Phase 0 其他改動不在本 5 項驗收範圍，未驗。
