# Phase 6-9 Code Review 修正 — 全端

修正人：fullstack-engineer（PurePaw AI 敏捷團隊）
對應審查：`docs/work-reports/phase6-9-codereview.md`
範圍：問題回報（feedback）+ 評論／評分（reviews）的六項修正。

## 新增共用常數檔

`src/lib/feedback.ts` —— 把分類白名單與各上限集中，供前後端對齊，避免漂移：

- `FEEDBACK_CATEGORIES`（4 個分類，與 FeedbackModal chips 一致）+ `isAllowedFeedbackCategory()`
- `FEEDBACK_CONTENT_MAX = 2000`、`REVIEW_COMMENT_MAX = 1000`
- `REVIEW_COOLDOWN_DAYS = 30`、`FEEDBACK_DEDUP_SECONDS = 60`

## 六項修正逐條

### 1. 長度上限（server 硬限 + 前端 maxLength + 字數）
- `src/app/api/feedback/route.ts`：`content.length > 2000` → 回 400，訊息「問題內容請勿超過 2000 字」。
- `src/app/api/reviews/route.ts`：`comment && comment.length > 1000` → 回 400，訊息「留言請勿超過 1000 字」。
- `FeedbackModal.tsx` textarea 加 `maxLength={FEEDBACK_CONTENT_MAX}` + 顯示「目前字數 / 2000」。
- `ReviewModal.tsx` textarea 加 `maxLength={REVIEW_COMMENT_MAX}` + 顯示「目前字數 / 1000」。

### 2. GET /api/reviews 不快取
- `src/app/api/reviews/route.ts` 頂層加 `export const dynamic = 'force-dynamic'`。
- 驗證：build 輸出 `/api/reviews` 由原本可能靜態化變為 `ƒ`（server-rendered on demand）。開旗後公開列表即時反映新審核通過評論，不回舊資料。

### 3. 防重複連發
- 前端：兩個 modal 送出鈕原本即 `disabled={... || submitting}`，送出期間 `submitting=true`、handler 開頭 `if (... || submitting) return`，in-flight 不可重複按。本次沿用未改弱。
- 後端 feedback 輕量防連發：寫入前查「同 userId + 完全相同 content + createdAt ≥ now-60s」是否已存在；有 → 不重複寫，直接回 `{ ok: true }`（對使用者透明，避免雙擊／重送造成重複信與重複資料）。

### 4. 評論一個月一則（最近 30 天，非永久唯一）
- `src/app/api/reviews/route.ts`：寫入前查該 `userId` 最近 30 天（`createdAt >= now - 30d`，伺服器時間）是否已有 AppReview。
- **未**使用 `@@unique([userId])`（那是永久唯一），改用查詢判定，符合 frank「一個月一則、非永久」拍板。
- 月限制判定與回訊：
  - 取最近一筆 review 的 `createdAt`，下次可評論時間 = `createdAt + 30 天`。
  - 回 **429**，訊息「每位使用者一個月僅能評論一次，下次可評論時間：YYYY年M月D日」（`toLocaleDateString('zh-TW')`）。
- demo 帳號一致適用（route 對 demo 不分流，與一般相同）。
- 前端 ReviewModal 將伺服器回傳的 `error` 訊息直接顯示給使用者（原本只顯示固定「送出失敗」）。

### 5. category 白名單
- 白名單集中於 `src/lib/feedback.ts` 的 `FEEDBACK_CATEGORIES`，前端 FeedbackModal 改引用同一常數。
- `src/app/api/feedback/route.ts`：trim 後若有值且非白名單 → 落為 `null`（不擋送出、不存髒資料）；空／未提供 → `null`。符合「空/未提供可接受、非白名單值落為 null」。

### 6. AppReviewsList 檢查 res.ok
- `src/components/feedback/AppReviewsList.tsx`：fetch 後先 `if (!r.ok) throw` 再 `r.json()`，失敗落入既有 `.catch(() => setData(null))` → 顯示「目前還沒有公開評論。」空狀態，不把 `{ error }` 當資料。

## 維持既有（未動）
- 驗權：userId 一律取自 `auth()` session，body 不含 userId。
- 寄信：escapeHtml、固定主旨、寄信失敗只 console.error 不擋 API、demo 一致、isDemo 僅作信件欄位標示。
- `SHOW_PUBLIC_REVIEWS` 旗標隱藏邏輯未動。

## 驗證結果
- `npx tsc --noEmit`：通過（EXIT 0）。
- 改動檔單獨 `eslint`：0 error 0 warning。
- `DATABASE_URL=file:./dev.db npm run build`：成功（EXIT 0），`/api/feedback`、`/api/reviews` 皆為 `ƒ` 動態。

## 改動檔清單
- 新增：`src/lib/feedback.ts`
- 改：`src/app/api/feedback/route.ts`
- 改：`src/app/api/reviews/route.ts`
- 改：`src/components/feedback/FeedbackModal.tsx`
- 改：`src/components/feedback/ReviewModal.tsx`
- 改：`src/components/feedback/AppReviewsList.tsx`

未 commit、未動三份系統文件。
