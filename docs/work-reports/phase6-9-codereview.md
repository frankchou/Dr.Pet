# Phase 6-9 程式碼審查報告 — 問題回報 + 評論／評分

審查人：code-reviewer（PurePaw AI 敏捷團隊）
審查對象：待辦 6-9（使用者選單「問題回報」+「評論／評分」）
基準文件：`docs/work-reports/phase6-9-feedback-review-fullstack.md`、`coding-conventions` skill

## 總結

整體實作品質高、與既有 `product-report` 通報流程一致，安全面（escapeHtml、主旨無 user 輸入、GET 只 select 公開欄位）做得確實。

- 🔴 必修：**0**
- 🟠 應修：**2**
- 🟡 建議：**4**

無阻擋上線的嚴重問題。建議在上線前處理兩項「應修」（輸入長度上限、GET 快取/隱私語意），其餘為加值建議。

---

## 逐項對照（審查重點 1–7）

### 1. 驗權／身分 — 通過
- `feedback/route.ts:12-16`、`reviews/route.ts:12-16`：皆 `await auth()` 取 `session.user.id`，未登入回 401。
- `feedback/route.ts:27`、`reviews/route.ts:27`：`userId` 一律取自 server-side session，body 無 `userId` 欄位、無法被前端偽造。**無越權風險。**
- demo 身分由 `isDemoUser(session)` 在 server 端判定（非信任 client）。正確。

### 2. 輸入驗證 — 大致通過，缺長度上限（見 🟠-1）
- content 非空：`feedback/route.ts:19-24` `trim()` 後檢查、空字串擋 400。正確。
- rating 驗證：`reviews/route.ts:22` `typeof === 'number' && Number.isInteger && 1..5`，已涵蓋非整數、超範圍、缺漏、NaN（`typeof NaN==='number'` 但 `Number.isInteger(NaN)` 為 false，會被擋）。**邊界完整。**
- **缺**：content / comment / category 皆無長度上限（見 🟠-1）。

### 3. 資安 — 通過
- 寄信 HTML：`email.ts:222-226`（feedback）、`244-247`（review）所有 user 可控欄位（content/comment/category/userId）皆走 `escapeHtml`。rating 為已驗證整數且再經 `Math`/`repeat` 重建（`email.ts:242-243`），不直出。正確。
- 信件主旨：`email.ts:169`、`185` 主旨為**固定字串**（`appEnvLabel()` + 常數），**不含任何 user 輸入**，無 header injection 面。正確。
- `GET /api/reviews`：`reviews/route.ts:67` where 限定 `isPublic:true && status:'approved'`；`select` 只取 `id/rating/comment/createdAt`（`:69`），**未回傳 userId / email**。無他人隱私外洩。正確。

### 4. demo 行為 — 通過
- 規格要求「demo 與一般一致：照常寫 DB + 寄信，主旨標 `[測試]`」。
- 兩 route 對 demo 不分流，照常 `create` + 寄信；`isDemo` 僅作為**信件內欄位**標示（`email.ts:225`、`246`）。
- 主旨前綴由 `appEnvLabel()`（依環境，非依帳號）決定 `[測試]/[正式]`，符合既有 `product-report` 慣例。正確。

### 5. 寄信失敗不擋 API — 通過
- `feedback/route.ts:31-40`、`reviews/route.ts:31-40`：寄信包在內層 `try/catch`，DB `create` 在外、寄信在後；寄信失敗只 `console.error`，仍回 `{ ok: true }`。語意正確（DB 已寫即成功）。

### 6. 濫用防護 — 缺（見 🟡-1）
- 無 rate limit / 重複提交防護。前端有 `submitting` 旗標（`FeedbackModal.tsx:31`、`ReviewModal.tsx:44`）擋連點，但 server 端無防護。依任務指示標 🟡 建議，不阻擋。

### 7. 旗標隱藏 `SHOW_PUBLIC_REVIEWS` — 通過
- `settings/page.tsx:30` `const SHOW_PUBLIC_REVIEWS: boolean = false`；`:941` `{SHOW_PUBLIC_REVIEWS && (...)}` 條件渲染。
- 旗為 false 時 `<AppReviewsList />` 不掛載 → `useEffect` 的 `fetch('/api/reviews')` 不會觸發（`AppReviewsList.tsx:36-44`）。**不會誤 fetch、不會誤顯示。** 正確。

---

## 問題明細

### 🟠 應修

#### 🟠-1 content / comment / category 無長度上限（濫用 / 巨量寫入 / 信件破版）
- 位置：`src/app/api/feedback/route.ts:19-24`、`src/app/api/reviews/route.ts:20-21`
- 問題：textarea 無 `maxLength`（`FeedbackModal.tsx:112`、`ReviewModal.tsx:122`），API 也未限長。攻擊者或誤貼可送入數 MB 字串，造成 DB 巨量寫入與通知信過大。雖非高危，但屬輸入驗證應補的缺口（審查重點 2 明列「過長輸入是否該設上限」）。
- 建議修法（轉交全端）：server 端硬限，例如
  ```ts
  // feedback
  if (content.length > 2000) {
    return NextResponse.json({ error: 'content too long' }, { status: 400 })
  }
  // reviews（若有 comment）
  if (comment && comment.length > 1000) {
    return NextResponse.json({ error: 'comment too long' }, { status: 400 })
  }
  // category 為固定 4 選項，建議白名單檢核（見 🟡-3）
  ```
  並在兩個 textarea 加 `maxLength` 與字數提示，前後端一致。
- 註：既有 `product-report/route.ts` 同樣未限 `note` 長度，屬全專案共通缺口；可一併補。

#### 🟠-2 `GET /api/reviews` 缺 no-store，公開列表開啟後恐回舊 / 被誤快取
- 位置：`src/app/api/reviews/route.ts:64-87`
- 問題：此 GET 無動態宣告也無 cache header。Next.js App Router 對無 cookie/動態訊號的 GET route 可能於 build 期靜態化或被中間層快取；公開評論列表一旦開旗（`SHOW_PUBLIC_REVIEWS`），新審核通過的評論可能不即時反映。雖目前旗標關閉、不影響上線，但屬「開旗即用」前該補的正確性問題。
- 建議修法（轉交全端）：在 route 加
  ```ts
  export const dynamic = 'force-dynamic'
  ```
  或回應帶 `Cache-Control: no-store`。與專案其他讀 DB 的 GET route 寫法對齊即可。

### 🟡 建議

#### 🟡-1 無 server 端防連發 / 重複提交
- 位置：`src/app/api/feedback/route.ts`、`src/app/api/reviews/route.ts`（整體）
- 說明：前端 `submitting` 旗標只能擋同頁連點，繞過前端可連發。建議日後加簡單 rate limit（如同 userId 短時間內限次）或 review 採 `@@unique` 約束防同人洗評。依任務指示僅標建議，不阻擋上線。

#### 🟡-2 評分可重複提交、無去重
- 位置：`src/app/api/reviews/route.ts:26-28`、`prisma/schema.prisma:462-470`
- 說明：`AppReview` 無 `@@unique([userId])`，同一使用者可送出多筆評論，未來公開列表 / 平均星等可能被單一使用者灌量影響。若產品定位為「每人一則評分」，建議改為 upsert + unique；若刻意允許多則回饋則無需處理。屬產品決策，回報 product-manager 確認。

#### 🟡-3 category 未做白名單校驗
- 位置：`src/app/api/feedback/route.ts:20`
- 說明：category 來自前端固定 4 chips（`FeedbackModal.tsx:16`），但 API 接受任意字串。雖已 escapeHtml 無 XSS 風險，建議仍以白名單校驗（非清單值丟棄或回 400），確保資料乾淨、利於日後分類統計。

#### 🟡-4 `AppReviewsList` fetch 未檢查 `res.ok`
- 位置：`src/components/feedback/AppReviewsList.tsx:38-41`
- 說明：直接 `.then(r => r.json())`，當 GET 回 500（route 走 catch 回 `{ error }`）時，`r.json()` 會得到非 `PublicReviewsResponse` 形狀的物件並被當成 `data`，後續 `data.count` / `data.averageRating.toFixed` 可能 runtime 出錯。建議補 `if (!r.ok) throw ...`，落入既有 `.catch(() => setData(null))` 顯示空狀態。目前旗標關閉故不觸發，開旗前宜補。

---

## 慣例 / 可維護性

- 命名、回傳型別標註、繁中註解密度、discriminated-union 風格（`{ ok } | { error }`）皆貼合 `coding-conventions` 與既有 `product-report` route，無重複造輪子（共用 `escapeHtml` / `buildNotifyShell` / `notifyRow`）。良好。
- `PublicReviewsResponse` 由 route 匯出供前端共用、避免型別漂移，做法正確。
- `email.ts:87-88` `PRODUCT_REPORT_RECIPIENT` 與 `INTERNAL_NOTIFY_RECIPIENT` 為同一信箱、各自宣告，語意清楚但略重複；非問題，可日後合併為單一 `INTERNAL_NOTIFY_RECIPIENT`。
- 選單入口在 `Sidebar.tsx` 與 `AppShell.tsx` 各重複一份相同 markup（含 SVG）；屬既有桌面/手機雙版型重複，本次沿用、未新增技術債。

## 與工作報告對照
- 報告第 6 點宣稱 `tsc --noEmit` 通過、build 成功、新檔 eslint 0/0；未在本次審查重跑（屬 QA 範疇），程式碼層面與報告描述一致，無發現與報告矛盾之處。
