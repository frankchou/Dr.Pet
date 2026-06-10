# Phase 6-9 評論資格預檢（全端）

## 目標
評論月限制提示前移：原本是填完按送出才回 429，frank 要求打開評論 modal 當下就先告知已評論過的使用者，避免白填。

## 改動內容

### 1. 共用冷卻邏輯抽出 — `src/lib/feedback.ts`
新增兩個純函式，供 POST backstop 與 GET eligibility 共用，避免兩處天數計算漂移：
- `reviewCooldownSince(now?)` — 回傳冷卻起算時間（now − 30 天）。
- `reviewNextAvailable(latestCreatedAt)` — 由最近一筆 review 的 createdAt 推算下次可評論時間（createdAt + 30 天）。

`REVIEW_COOLDOWN_DAYS = 30` 維持不變。

### 2. 新增預檢 API — `GET /api/reviews/eligibility`（新檔）
選用「獨立輕量端點」而非塞進公開 GET，理由：公開 `GET /api/reviews` 是回傳已審核公開評論列表（給 AppReviewsList），語意與「我的資格」不同，混在一起會讓快取與回傳型別變雜。

- 需登入；未登入回 `401`（前端本就不顯示 modal 入口，比照處理）。
- 判定沿用既有冷卻邏輯：最近 30 天內有 review → `canReview=false`，`nextAvailable = 最近一筆 createdAt + 30 天`（ISO 字串）；否則 `canReview=true` 且不帶 `nextAvailable`。
- demo 與一般帳號一致適用（查 `appReview` 不分帳號類型）。
- 匯出 `ReviewEligibilityResponse` 型別供前端共用。
- `export const dynamic = 'force-dynamic'`，build 確認為 ƒ 動態路由。

### 3. ReviewModal 開啟即預檢 — `src/components/feedback/ReviewModal.tsx`
modal 為條件掛載（`showReview` 為 true 才 mount），故在 mount 的 `useEffect` 內呼叫 `/api/reviews/eligibility`，以 `Precheck` discriminated union 管理狀態：
- `loading` → body 顯示「確認評論資格中…」，送出鈕停用。
- `blocked` → 顯眼 amber 告警橫幅（`border-amber-200 / bg-amber-50`）：「你這個月已評論過」+「下次可評論時間：YYYY年M月D日」（`toLocaleDateString('zh-TW')`），並**停用星等、留言 textarea、送出鈕**。
- `open` → 正常表單。
- 預檢失敗（網路 / 5xx）退回 `open`，不因預檢掛掉就鎖死，交由送出時的後端 429 把關。
- `useEffect` 以 `active` 旗標處理 cleanup，避免卸載後 setState。

### 4. 後端 429 backstop 保留
`POST /api/reviews` 的冷卻檢查與 429 回傳維持不變（僅改為呼叫共用 helper），仍是最終防線。

## modal 開啟攔截與告警長相
- 開啟瞬間 → body 顯示「確認評論資格中…」（loading）。
- 已評論者 → 頂部 amber 告警橫幅，下方星等/留言/送出全部變淡停用，無法白填。
- 可評論者 → 與原本一致的星等 + 留言表單。

## 驗證結果
- `npx tsc --noEmit`：通過（EXIT 0）。
- 改動檔單獨 `eslint`（reviews route / eligibility route / ReviewModal / feedback.ts）：0 error（EXIT 0）。
- `DATABASE_URL=file:./dev.db npm run build`：成功（EXIT 0）；`/api/reviews` 與 `/api/reviews/eligibility` 皆為 ƒ 動態路由。

## 異動檔案
- `src/lib/feedback.ts`（新增兩個共用 helper）
- `src/app/api/reviews/route.ts`（POST backstop 改用 helper，行為不變）
- `src/app/api/reviews/eligibility/route.ts`（新檔，預檢 API）
- `src/components/feedback/ReviewModal.tsx`（開啟即預檢 + 告警橫幅 + 停用）

未 commit、未更動三份系統文件。
