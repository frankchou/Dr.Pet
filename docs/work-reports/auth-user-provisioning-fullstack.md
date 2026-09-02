# 工作報告 — Google 登入不會建立 User 資料列（外鍵地雷修復）

**角色：** fullstack-engineer
**日期：** 2026-09-02
**分類：** 上線阻斷項（P0）

---

## 一、問題查證

### 1.1 靜態查證

| 事實 | 查證結果 |
|---|---|
| `src/lib/auth.ts` 用 `session: { strategy: 'jwt' }`，未掛 `PrismaAdapter` | ✅ 成立 |
| 全專案沒有任何登入路徑會寫入 `User` | ✅ 成立。`prisma.user.create/upsert` 僅出現在 `src/app/api/users/route.ts`（v1 遺留，全專案無呼叫端）與 `prisma/seed.ts` |
| `Pet.userId` / `PetMember.userId` / `PushSubscription.userId` / `Account.userId` 皆為指向 `User` 的外鍵 | ✅ 成立，見 `prisma/migrations/20260602075632_add_nextauth_and_co_owner/migration.sql` |
| `dev.db` 的 `Account` 0 筆、`User` 9 筆（8 筆 v1 暱稱使用者 email 皆為 NULL + `demo-user`） | ✅ 成立。`Pet.userId` 目前只有 `NULL` 與 `demo-user` 兩種值 |

### 1.2 實測：外鍵確實會擋（且不只 Turso）

用暫存檔案資料庫（`prisma migrate deploy` 套用全部 15 個 migration），以專案實際使用的
`PrismaClient + PrismaLibSql` 組合模擬「`User` 不存在時建立 Pet」：

```
PRAGMA foreign_keys = [{"foreign_keys":1}]
A. Pet.create（userId 不存在）             → 失敗：P2003 Foreign key constraint violated
B. PetMember.create（userId 不存在）        → 失敗：P2003 Foreign key constraint violated
C. PushSubscription.upsert（userId 不存在） → 失敗：P2003 Foreign key constraint violated
```

**推論成立，而且比原本評估的更嚴重。**

### 1.3 修正一項前提：`PRAGMA foreign_keys = 0` 是量測工具造成的假象

`PRAGMA foreign_keys` 是**連線層級**設定，不存在於 db 檔案裡。同一份 `dev.db` 複本：

| 量測連線 | `PRAGMA foreign_keys` |
|---|---|
| `sqlite3` CLI | `0`（SQLite 官方預設 OFF） |
| `@libsql/client`（**本專案實際使用的連線**） | `1` |

也就是說 **`libsql` 客戶端預設就把外鍵打開**，本機 `dev.db` 一樣會擋。
先前「本機測不出來」不是因為外鍵沒開，而是因為本機只用 `demo-user` 登入
（`dev.db` 裡本來就有這一列），從來沒有真的走過 Google 登入建立寵物的路徑。

**影響面因此擴大**：正式站第一位 Google 使用者按下「新增毛孩」會拿到 500，
並且推播訂閱（`PushSubscription`）與共同飼主（`PetMember`）也同樣全滅。

---

## 二、方案比較與選擇

### 方案 1（採用）：在 `jwt` callback 內 upsert `User`

### 方案 2（否決）：掛 `PrismaAdapter`

| 面向 | 方案 1 | 方案 2 |
|---|---|---|
| `session.user.id` 語意 | **不變**，仍是 Google `sub` | **會變**。Adapter 以 `cuid()` 另建 `User.id`，`token.id` 變成 DB cuid。約 30 支 API 與 `src/lib/petAccess.ts` 都吃這個值 |
| schema 需求 | 無 | **需要新增 `Session` + `VerificationToken` model 與 migration**（目前 schema 兩者皆不存在，`@auth/prisma-adapter` 型別要求它們） |
| 與 JWT strategy 的相容性 | 無關 | 已知難搭：adapter + jwt 混用時 `Account` 連結、`OAuthAccountNotLinked` 行為都是地雷 |
| 舊資料相容 | v1 暱稱使用者、`demo-user` 皆可沿用（見 §四） | email 撞既有列時直接丟 `OAuthAccountNotLinked`，**整個登入被擋死**，且無從在應用層處理 |
| 改動範圍 | `src/lib/auth.ts` + 1 支新 lib | schema + migration + adapter + session strategy 連動 |

**選擇方案 1。** 決定性理由有兩點：(a) 方案 2 會改變 `session.user.id` 的值，
違反「不得改變語意」的硬性限制；(b) 方案 2 需要補 `Session` / `VerificationToken`
兩張表與新 migration，等於在上線阻斷項的修復上再疊一次 schema 變更風險。

> 補充：方案 1 不會寫 `Account` 資料列（那是 adapter 的職責）。本專案目前沒有任何
> 程式讀取 `Account`，也不需要保存 Google refresh token，因此不構成功能缺口。
> 若日後要串 Google Calendar 之類需要 refresh token 的功能，再回頭評估方案 2。

**放在 `jwt` 而非 `signIn` callback 的理由**：`jwt` 是唯一能同時「決定 `token.id`」
與「阻擋發放 session」的地方。若拆成 `signIn` 做 upsert、`jwt` 取 id，等於每次登入
多打一次資料庫，且兩處邏輯要保持同步。`jwt` callback 的回傳型別是
`Awaitable<JWT | null>`，回傳 `null` 時 `@auth/core` 會清掉 session cookie
（見 `node_modules/@auth/core/lib/actions/callback/index.js`），可以乾淨地失敗關閉。

---

## 三、變更清單

### 新增 `src/lib/userProvisioning.ts`

匯出 `provisionUser(input): Promise<ProvisionUserResult>`，回傳
`{ ok: true; userId }` / `{ ok: false; error }`（比照 `src/lib/petAccess.ts` 的
discriminated union 寫法）。解析順序：

1. 以 `providerUserId` 查 `User` → 命中則同步 profile，回傳該 id。
2. 未命中且 email **已驗證** → 以 email 查 `User` → 命中則沿用既有那一列的 id。
3. 都未命中 → 以 `id = providerUserId` 建立新列。

外層攔截 `P2002`（唯一鍵）並**重跑整套解析一次**，把並發登入導向「已存在 → 更新」分支。

### 修改 `src/lib/auth.ts`

`jwt` callback 改為 async，在 `user` 存在（僅登入當下那一次）時呼叫 `provisionUser`，
成功則 `token.id = result.userId`，失敗則 `console.error` 後回傳 `null` 拒發 session。
`session` callback 未動。

**沒有動到**：`prisma/schema.prisma`、任何 migration、`session.strategy`、providers 設定。

---

## 四、邊界情況處理

| 情況 | 處理方式 | 理由 |
|---|---|---|
| **`User.email` 唯一鍵衝突**（email 已屬於另一個 id，例如 v1 暱稱使用者或 `demo-user`） | 不 create、不另開分身，**沿用既有那一列**，`session.user.id` 指向它 | create 必炸 P2002；另開分身則會讓使用者跟自己既有的寵物、成員資格失聯。`session.user.id` 的語意仍是「這一列 User 的 id」，只是不等於 Google sub |
| **email 冒名接管** | 只有 `profile.email_verified === true` 才拿 email 做比對或寫入 | 未驗證 email 的連結是已知的帳號接管手法。Google 正常帳號恆為 `true` |
| **email 未驗證 / 未提供** | 建列時 `email` 留 NULL | SQLite 唯一索引允許多筆 NULL；寫入未驗證 email 反而會擋掉日後真正持有該信箱的人 |
| **並發登入（多分頁）** | `P2002` → 重跑解析一次 → 走到「已存在 → 更新」 | 冪等。已用「攔截 create、搶先插入同一列」的手法**強制製造競態**驗證（見 §五） |
| **v1 暱稱使用者的 `nickname`** | `syncProfile()` **完全不碰 `nickname`**，只更新 `name` / `image` / `emailVerified`，且只寫真的有變的欄位 | `nickname` 是使用者自己取的顯示名稱 |
| **既有使用者換綁 Google 信箱、新信箱已被別列佔用** | `syncProfile()` 內攔 `P2002`，記 `console.warn` 後放行 | 此時 `User` 那一列已存在，外鍵不會壞。個資同步失敗不該擋住登入 |
| **demo 帳號（Credentials）** | 一併走 provisioning。`emailVerified` 對非 Google provider 視同 `true`（email 由本專案寫死） | `demo-user` 在 dev.db 已存在 → 走「以 id 命中」分支，欄位無變化即零寫入。若某環境缺這一列則自動補上，比現況更穩 |
| **email 大小寫** | 統一 `trim().toLowerCase()` 後寫入與比對 | `src/app/api/pets/[id]/invitations/route.ts:67` 與 `src/app/api/invite/[token]/accept/route.ts:39` 本來就用 `toLowerCase()` 比對，行為一致 |
| **provisioning 失敗（DB 掛掉等）** | `jwt` 回傳 `null`，不發 session | 帶著一個沒有對應 `User` 的 id 進 App，之後每一支寫入 API 都會 500，比乾脆登入失敗更難查 |

---

## 五、驗證方式與結果

全部在**暫存檔案資料庫**上進行（`prisma migrate deploy` 套用完整 migration 序列）。
**未動 `/workspaces/Dr.Pet/dev.db`**（僅複製一份出來讀），未執行 `npm run db:reset`，
未執行 `npm run build`。

### 5.1 型別與 Lint

```
npx tsc --noEmit                                        → 通過，無輸出
npx eslint src/lib/auth.ts src/lib/userProvisioning.ts  → 通過，無輸出
```

### 5.2 修復前（負向對照）

`Pet.create` / `PetMember.create` / `PushSubscription.upsert` 在 `User` 不存在時
全數 `P2003 Foreign key constraint violated`。見 §1.2。

### 5.3 修復後（以 jiti 載入真實的 `src/lib/userProvisioning.ts` 執行）

| # | 情境 | 結果 |
|---|---|---|
| 1 | 全新 Google 使用者 | PASS — `userId` 等於 Google sub（語意不變）；email 正規化為小寫；`emailVerified` 寫入；Pet + PetMember + PushSubscription 三者**全部建立成功，無 P2003** |
| 2 | 同一使用者再次登入 | PASS — 冪等，`User` 未重複建立；`name` / `image` 更新為最新 profile |
| 3 | demo 帳號 | PASS — `userId` 仍為 `demo-user`；`nickname`（`demo_owner`）與 `email` 皆未被覆蓋 |
| 4 | email 已被 v1 舊帳號佔用 | PASS — 未拋 P2002；`userId` 指向既有列；未多建分身；舊 `nickname` 保留；用回傳的 `userId` 可成功建立 Pet |
| 5 | email 未驗證 | PASS — 不接管既有 email 持有者，另建新列且 `email` 留 NULL |
| 6 | 五個分頁同時登入 | PASS — 五次全 ok、回傳同一個 `userId`、DB 只有一筆 |
| 7 | 缺少 `providerUserId` | PASS — 回 `{ ok: false, error: '登入資訊缺少使用者識別碼' }`，不拋例外 |

### 5.4 強制競態驗證（證明重試分支真的被走到）

攔截 `prisma.user.create`，在第一次呼叫前搶先插入同一 id 的列，模擬「另一分頁搶先寫入」：

```
結果        : {"ok":true,"userId":"race-sub"}
create 次數 : 1（第 1 次被搶先，必然撞 P2002）
P2002 次數  : 1
DB 內筆數   : 1
PASS — 撞到 P2002 後由重試路徑接住，冪等且只有一筆
```

### 5.5 未驗證的部分（如實揭露）

- **未做真實的 Google OAuth 端對端登入**（需要真實 client id / 瀏覽器流程）。
  `jwt` callback 的觸發時機、`profile.email_verified` 欄位、`return null` 的清 cookie 行為
  皆以 `@auth/core` 的型別定義與 `lib/actions/callback/index.js` 原始碼查證，非實跑。
- **未在 Turso 上實測**（本機防呆禁止連遠端庫，且不應動正式資料）。
  §1.2 已證明 `libsql` 客戶端預設 `foreign_keys=1`，Turso 走同一套客戶端，行為一致。

---

## 六、附帶發現（未處理，回報總指揮）

1. **`src/app/api/users/route.ts` 是 v1 死碼且是未授權的寫入端點。**
   全專案無呼叫端，但 `POST /api/users` 對外開放、無任何認證，任何人都能塞 `User` 資料列。
   建議直接刪除（不在本次檔案範圍內，未動）。

2. **`scripts/migrate-turso.mjs` 逐句送 migration SQL，而 migration 內含
   `PRAGMA foreign_keys=OFF/ON`。** 那些 PRAGMA 是連線層級的，逐句送到 Turso 時是否
   如預期生效值得 DevOps 覆核 —— 但這只影響 migration 期間的 table redefine，
   不影響本次修復。

3. **`prisma/schema.prisma` 缺 `Session` 與 `VerificationToken` model。**
   目前 JWT strategy 用不到，但這使得「日後改掛 PrismaAdapter」必然伴隨一次 schema 變更。

4. **`Pet.userId` 是可空的。** 未登入時建立的寵物 `userId` 為 NULL（`dev.db` 現況即如此），
   這些寵物任何登入者都看不到、也無法認領。是否需要認領流程，建議 PM 確認。

---

## 七、給 QA 的驗收建議

### 必測（P0）

1. **全新 Google 帳號首次登入 → 新增毛孩**
   預期：寵物建立成功（201），`User` / `Pet` / `PetMember` 各多一列，`Pet.userId` 與
   `PetMember.userId` 皆等於 `session.user.id`。這是本次修復的核心路徑。
2. **同一帳號登出再登入 → 再新增一隻毛孩**
   預期：`User` 仍只有一列，兩隻寵物都看得到。
3. **demo 帳號登入（`DEMO_ENABLED=true` 的非正式環境）**
   預期：行為與修復前完全一致；`User` 表中 `demo-user` 那一列的 `nickname` 仍是
   `demo_owner`、`name` 仍是 `示範飼主`。
4. **共同飼主邀請全流程**（A 帳號發邀請 → B 帳號 Google 登入後接受）
   預期：`PetMember` 建立成功（修復前 B 帳號這一步必然 P2003）。
5. **推播訂閱**：Google 帳號登入後開啟推播 → `PushSubscription` 建立成功。

### 邊界（P1）

6. **多分頁同時登入**：同一 Google 帳號在三個分頁同時觸發登入。
   預期：三個分頁都登入成功，`User` 只有一列，log 中無 unhandled error。
7. **email 撞既有列**：在測試庫手動塞一列 `User { id: 'x', email: <你的測試 Gmail> }`，
   再用該 Gmail 做 Google 登入。
   預期：登入成功，`session.user.id === 'x'`（不是 Google sub），且**沒有**多出一列。
8. **登入後權限判定**：確認 `GET /api/pets` 只回自己的寵物，跨帳號存取回 403
   （驗證 `session.user.id` 語意未被破壞）。

### 觀察點

- Vercel log 中若出現 `[auth] 無法備妥使用者資料，拒發 session`，代表 provisioning 失敗，
  使用者會被彈回未登入狀態（**不會**看到錯誤頁）—— 這是刻意的失敗關閉設計，
  但 QA 若遇到「按了 Google 登入卻沒登進去」，請優先翻這行 log。
- log 中出現 `[auth] 使用者 X 的 profile 同步遇到唯一鍵衝突` 屬預期內的降級行為，登入仍成功。
