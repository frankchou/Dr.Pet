# Phase 1-F 共同飼主整體流程 QA 驗收報告

- 日期：2026-06-04
- 角色：QA 測試工程師
- 方法：靜態分析（程式碼）+ 本機 dev.db 邏輯層模擬（jiti 臨時腳本，用完即刪）
- 環境鐵則遵守：全程 `DATABASE_URL="file:./dev.db"`，**未碰正式 Turso**；模擬資料以反序 cleanup 全數刪除，驗證後 dev.db 邏輯狀態與原始完全一致（users/pets/members 不變、PetInvitation 仍為 0）。

> 限制：本環境無法開瀏覽器做跨帳號點擊、真實 Google 登入、真實寄信、跨瀏覽器即時同步。
> 凡屬 UI / 端對端 / 寄信投遞 / OAuth 行為皆標為「需 frank 實機」，未灌水報成 PASS。

---

## 受測程式碼

| 檔案 | 角色 |
|---|---|
| `src/app/api/pets/[id]/invitations/route.ts` | 邀請建立 + 寄信（owner only） |
| `src/lib/email.ts` | Gmail SMTP 寄信 + 邀請信模板 |
| `src/app/api/invite/[token]/route.ts` | 公開查詢邀請資訊 |
| `src/app/api/invite/[token]/accept/route.ts` | 接受邀請、建立 co_owner |
| `src/app/api/pets/route.ts` | GET 寵物清單（owner + co_owner 的 OR 過濾） |
| `src/app/api/pets/[id]/route.ts` | 單一寵物讀寫 + 刪除限 owner |
| `src/lib/petAccess.ts` | `requirePetAccess` 權限判定 |
| `src/hooks/usePollingRefresh.ts` | 1-D 即時同步輪詢 hook |
| `prisma/migrations/20260604000000_backfill_owner_membership/` | owner membership 補資料 |

---

## 模擬資料設定（dev.db，皆已清除）

- ownerA（持有 PetX，並有 owner PetMember）
- userB（受邀者，email 相符）
- userC（外人，email 不符；另持有私有 PetY）
- PetX（共享標的）、PetY（不該被 B 看到）

---

## 逐項結果

### 1. 邀請建立 + 寄信（對照 1-B / 1-F-A）

| 項目 | 結果 | 依據 |
|---|---|---|
| 建立 PetInvitation：status=pending、效期 7 天、token 產生 | **PASS** | 模擬建立：status=pending、效期=7 天、token 長度 25 |
| 重複邀請同 email → 舊 pending 先設 expired，再建新 pending | **PASS** | `updateMany(status:expired)` 後新建：舊=expired、新=pending |
| owner only 守門 | **PASS（靜態）** | POST 內 `access.role !== 'owner'` → 403 |
| 寄信失敗不阻斷流程、回 `emailSent` 旗標 | **PASS（靜態）** | try/catch 包 `sendInviteEmail`，失敗只 log、`emailSent=false`，仍回 201 + inviteUrl |
| `inviteUrl` 用 `NEXTAUTH_URL`／`AUTH_URL`，缺則 warn | **PASS（靜態）** | 缺 baseUrl 會 `console.warn`，inviteUrl 退為相對路徑（連結會失效，僅警告） |
| 邀請信模板：毛孩名/邀請人/連結/7 天效期/品牌色 #C4714A，且使用者字串 HTML 跳脫 | **PASS（靜態）** | `buildInviteHtml` 對 petName/inviterName/inviteUrl 全 `escapeHtml`，防注入 |
| 真實寄信投遞到第二信箱 | **需 frank 實機** | 本環境不寄真信 |

### 2. 接受邀請 → 建立 co_owner（對照 1-F-B）

| 項目 | 結果 | 依據 |
|---|---|---|
| email 相符的正常接受 → 200 + 建立 PetMember(co_owner) + 邀請轉 accepted + acceptedBy 正確 | **PASS** | 模擬：status=200、role=co_owner、邀請=accepted、acceptedBy=userB |
| 需登入（無 session）→ 401 | **PASS（靜態）** | route 開頭檢查 `session?.user?.id && email` |
| Google 登入第二帳號後跳轉接受 | **需 frank 實機** | OAuth + 跳轉屬 UI/外部行為 |

### 3. co_owner 看得到共享寵物（對照 1-C / 1-F-C）

| 項目 | 結果 | 依據 |
|---|---|---|
| co_owner（userB）查 `/api/pets` → 回傳被分享的 PetX | **PASS** | 模擬 OR 過濾：B 可見 = [QA-PetX] |
| co_owner 看不到別人私有的 PetY | **PASS** | B 清單不含 PetY |
| owner（ownerA）OR 過濾仍看得到自己的 PetX | **PASS** | A 清單含 PetX（OR 對 owner 有效，無重複 row） |

### 4. requirePetAccess 權限矩陣（對照 1-C / 1-F-D / 1-F-E）

抽樣已套用的 API：`daily-health-log`、`symptoms`、`meal-plans` 三支皆確認 GET/POST 兩端都呼叫 `requirePetAccess` 並依 `access.status` 回應（靜態檢視通過）。底層判定以模擬驗證：

| 角色 / 情境 | 期望 | 結果 |
|---|---|---|
| owner | ok / owner | **PASS** |
| co_owner | ok / co_owner | **PASS** |
| 外人（非成員） | 403 | **PASS** |
| 未登入（userId 空） | 401 | **PASS** |
| 寵物不存在 | 404 | **PASS** |

補充：全庫共 **40 支 route 檔案**已 import `requirePetAccess`（grep 確認），涵蓋 1-C 清單所列各寵物資料 API。逐支「讀寫端是否都呼叫」未全數展開（見「未測 / 建議補測」）。

### 5. 即時同步 1-D（對照 1-F-D 後半）

`src/hooks/usePollingRefresh.ts` 靜態分析：

| 行為 | 結果 | 依據 |
|---|---|---|
| 每 25 秒輪詢重抓（預設 intervalMs=25000，落在 20–30 秒區間） | **PASS（靜態）** | `setInterval(refresh, intervalMs)` |
| 分頁切回可見 / window focus → 立即重抓 | **PASS（靜態）** | visibilitychange→visible 與 focus listener 皆呼叫 refresh |
| 背景分頁暫停輪詢省資源 | **PASS（靜態）** | 隱藏時 `stopPolling()` |
| 卸載清除 interval 與 listener | **PASS（靜態）** | cleanup 內 stopPolling + removeEventListener |
| `diary/page.tsx` 已套用 | **PASS（靜態）** | `usePollingRefresh(refreshShared)` 已掛載 |
| 畫面上 A 端真的在 25 秒內看到 B 的更新 | **需 frank 實機** | 預期行為：B 寫入後，A 端在輪詢間隔內（≤25 秒）或切回分頁/聚焦時自動重抓並顯示更新 |
| 首頁 / 飲食 / 寵物詳情頁是否都已套 hook | **未測（建議補查）** | 1-D 清單列了多頁，本次只確認 diary 已套 |

### 6. 邊界情境（對照 1-F-F）

| 情境 | 期望 | 結果 | 依據 |
|---|---|---|---|
| 錯帳號接受（email 不符） | 403 | **PASS** | status=403「此邀請是發給 …」 |
| 過期邀請接受 | 400 + DB 標記 expired | **PASS** | status=400「邀請已過期」，DB status=expired |
| 重複接受已 accepted 邀請 | 400 | **PASS** | status=400「邀請已被使用或已過期」 |
| 自我邀請（接受自己發的） | 400 | **PASS** | status=400「不能接受自己發出的邀請」 |
| 刪毛孩限 owner（co_owner 擋） | co_owner 403 / owner 200 | **PASS** | DELETE route `access.role !== 'owner'` → 403；模擬 co_owner=403、owner=200 |

---

## 發現的問題（1 項，低風險，回報總指揮轉交評估）

### ISSUE-1：「該用戶已是成員」防呆對混合大小寫 email 失效（低風險，非阻擋）

- **位置**：`src/app/api/pets/[id]/invitations/route.ts` L63-68 的 existingMember 檢查
  ```ts
  const existingMember = await prisma.petMember.findFirst({
    where: { petId, user: { email: targetEmail } },   // targetEmail 已 toLowerCase()
  })
  ```
- **重現（dev.db 模擬，已清）**：User.email 存原樣大小寫 `MixedCase@Test.local`（NextAuth/OAuth 通常存 provider 原樣）；POST 把 `targetEmail` 轉成小寫 `mixedcase@test.local`。SQLite `=` 預設**大小寫敏感**（已實測 `'a@x.com' = 'A@x.com'` → 0），故 `findFirst` 回 `null`。
- **實際輸出**：`existingMember 檢查 -> found=false`（期望 true）。
- **影響**：對「email 含大寫的既有成員」重複發邀請時，**不會回「該用戶已是成員」(400)，而會重發一張邀請信**。屬使用者體驗瑕疵，**非安全或資料正確性問題** —— 因為 accept 端 email 比對用雙方 `toLowerCase()`（已驗證相等），且 PetMember 以 `upsert` 防重，最終不會產生重複成員或越權。
- **建議方向（交全端評估，QA 不改碼）**：either（a）User.email 統一存小寫；或（b）此查詢改 `where: { petId, userId: <由小寫 email 查到的 user.id> }`，避免依賴 relation 上的大小寫敏感比對。
- **補充觀察（非缺陷）**：accept 端 email 比對已正確用 `.toLowerCase()` 兩邊，故「使用者用大寫 email 的 Google 帳號登入接受邀請」不受影響。

---

## frank 必須實機端對端測的清單

以下項目本環境**無法驗證**，必須由 frank 在真實環境跑（建議用 A 帳號 + 第二 Gmail 的 B 帳號）：

1. **寄信投遞**：A 帳號邀請 B 的 email → B 的第二信箱**真的收到**邀請信（含正確毛孩名、邀請人、可點連結、品牌色排版）。
   - 同時確認正式站 `NEXTAUTH_URL` 指向 Vercel 網域（非 localhost），否則信中連結失效。
   - 確認 Vercel 已填 `GMAIL_USER` / `GMAIL_APP_PASSWORD`。
2. **Google 登入第二帳號**：B 點信中連結 → 登入頁 → **Google 登入 B 帳號** → 跳轉同意頁 → 接受 → 成為 co_owner（驗 OAuth + 跳轉動線）。
3. **co_owner 實際看得到共享毛孩**：B 登入後首頁/清單看得到被分享的毛孩（如「阿東」）。
4. **跨瀏覽器即時同步（1-D）**：B 在自己瀏覽器新增/編輯該毛孩紀錄；A 在另一瀏覽器**不手動重整**，於輪詢間隔（≤25 秒）內、或切回分頁/視窗聚焦時，**自動看到** B 的更新。
5. **權限阻擋 UI 層**：B 嘗試存取「沒被分享的別人毛孩」時，畫面正確擋下（不是只回 403、而是 UI 不崩）。
6. **錯帳號實機**：B 用「非受邀 email 的 Google 帳號」登入點連結 → 畫面顯示「此邀請是發給 xxx，請用該帳號登入」。
7. **（建議一併）1-D 其他頁面**：首頁、飲食頁、寵物詳情頁是否也套了輪詢 hook（本次僅確認 diary 已套）。

---

## 未測 / 建議補測（誠實標記）

- 1-C 列的 ~25 支寵物資料 API，本次僅**抽樣** daily-health-log / symptoms / meal-plans 三支逐端確認；其餘僅以「已 import requirePetAccess」（40 檔）佐證，未逐支展開「每個 GET/POST/PUT/DELETE 是否都呼叫且讀取類放行 co_owner、破壞性限 owner」。建議由 Code Reviewer 逐支對照，或補一支整合測試。
- 1-D 多頁套用情況（首頁/飲食/寵物詳情）未逐頁確認。
- email.ts 的 SMTP 真實連線/投遞未測（屬實機項）。

---

## 統計與整體判定

- **PASS：26 項**（含模擬驗證 + 靜態確認）
- **需 frank 實機：7 項**（寄信、OAuth、跨瀏覽器同步等端對端）
- **未測 / 建議補測：3 類**
- **FAIL：0 項**（ISSUE-1 為低風險體驗瑕疵，不計入功能性 FAIL，但已明列待修）

**整體判定：邏輯層 / 權限層通過（CONDITIONAL PASS）。**
共同飼主的核心邏輯（邀請建立、email 守門、效期、防自我/防重複、co_owner 建立、OR 可見性、requirePetAccess 五態權限矩陣、刪除限 owner、輪詢同步機制）在 dev.db 模擬與靜態分析下全數正確。
正式放行前需：(1) frank 完成上列 7 項實機端對端測；(2) 評估是否修 ISSUE-1（建議修，但不阻擋）。
