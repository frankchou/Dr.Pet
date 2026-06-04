# Phase 1-C 共同飼主存取修復 — 全端實作報告

> 作者：全端工程師
> 日期：2026-06-04
> 依據：`docs/features/co-owner-access/access-control-spec.md` + 總指揮拍板設計

---

## 1. requirePetAccess 新邏輯（雙重判定）

檔案：`src/lib/petAccess.ts`

`requirePetAccess(petId, userId)` 改為：

1. `userId` 為空 → `{ ok:false, status:401 }`。
2. 查 `Pet`：不存在 → `{ ok:false, status:404 }`。
3. `pet.userId === userId` → `{ ok:true, role:'owner' }`（**不依賴 PetMember**，既有 owner / demo 帳號即使無 membership 也不被擋）。
4. 否則查 `PetMember`：存在 → 回該 member 的 role（owner / co_owner）；不存在 → `{ ok:false, status:403 }`。

`PetAccessResult` 的 status 聯集擴充為 `401 | 403 | 404`。

### 新增 `requirePetAccessByRecord(model, recordId, userId)`

- 由紀錄反查 petId 再呼叫 `requirePetAccess`。`model` 支援：`symptomEntry`、`productUsage`、`petProduct`、`instantAnalysis`、`dailyMealPlan`、`communityRec`。
- `CommunityRec` 的關聯欄位是 `forPetId`，已特別映射。
- 紀錄不存在 → `{ ok:false, status:404 }`；成功時回傳帶 `petId`，呼叫端不必再查一次。

---

## 2. `/api/pets` GET 查詢修正

檔案：`src/app/api/pets/route.ts`

- `where` 由 `{ userId }` 改為 `{ OR: [{ userId }, { members: { some: { userId } } }] }`，使 co_owner 看得到被分享的寵物。
- 去重 / 排序 / 回傳形狀不變（OR + relation filter 不展開重複 row；維持 `orderBy createdAt desc`，仍回 `Pet[]`）。未登入仍回全部（demo）。
- POST 未動（建立寵物即建 owner membership 的邏輯本來就在）。

---

## 3. 套上權限檢查的 route（依規格 42 列對照表）

統一模式：`const session = await auth()` → `requirePetAccess(petId, session?.user?.id ?? '')`（或 `requirePetAccessByRecord`）→ 失敗回 `access.status`。AI route 一律把檢查放在呼叫 anthropic **之前**。

### 模式 1（petId 直接可得，用 requirePetAccess）

| Route | Method | petId 來源 | 權限 |
|---|---|---|---|
| `pets/[id]` | GET | path | R |
| `pets/[id]` | PUT | path | W |
| `pets/[id]` | DELETE | path | **owner-only**（role !== 'owner' → 403） |
| `daily-health-log` | GET/POST | query / body | R / W |
| `diary-records` | GET | query | R |
| `diary-dates` | GET | query | R |
| `diary-parse` | POST(AI)/PUT | body | R / W |
| `health-metrics` | GET/POST | query / body | R / W |
| `measurement-record` | GET/POST | query / body | R / W |
| `medication-record` | GET/POST | query / body | R / W |
| `grooming-record` | GET/POST | query / body | R / W |
| `symptoms` | GET/POST | query / body | R / W（GET petId 改必填） |
| `pet-products` | GET/POST | query / body | R / W |
| `reactions` | GET/POST | query / body | R / W |
| `usages` | GET/POST | query / body | R / W（GET petId 改必填） |
| `documents` | GET/POST | query / body | R / W（GET petId 改必填） |
| `meal-plans` | GET/POST | query / body | R / W |
| `instant-analyze` | GET/POST(AI) | query / formData | R / W |
| `nutrition-ai` | GET/POST(AI) | query / body | R / W |
| `diet-analysis` | POST(AI) | body | R |
| `analyze` | GET/POST(AI) | query / body | R / W |
| `analysis` | GET | query | R |
| `recommend` | GET/POST(AI) | query / body | R / W |
| `chat` | GET/POST(AI) | query / body | R / W |
| `tasks` | GET/POST(AI) | query / body | R / W（GET petId 改必填） |
| `community/recs` | GET | query（forPetId） | R |
| `community/trigger` | POST | body | W（見下方特例） |

### 模式 2（path 是 recordId，用 requirePetAccessByRecord）

| Route | Method | model | 權限 |
|---|---|---|---|
| `symptoms/[id]` | GET/DELETE | symptomEntry | R / D-record |
| `usages/[id]` | PUT/DELETE | productUsage | W / D-record |
| `pet-products/[id]` | PATCH/DELETE | petProduct | W / D-record |
| `instant-analyze/[id]` | DELETE | instantAnalysis | D-record |
| `meal-plans/[id]/items` | POST/DELETE | dailyMealPlan（planId） | W / D-record |
| `community/dismiss` | POST | communityRec（recId） | W |

`meal-plans/[id]/items` POST 原本的「確認 plan 存在」findUnique 已移除（plan 存在性由 `requirePetAccessByRecord` 反查確認，避免重複查詢）。

---

## 4. community/trigger 特例

- 新增 `src/lib/community.ts`，把原 trigger route 的推薦產生邏輯抽成 `processReactionForCommunity(...)`（吞錯、不拋例外，維持 fire-and-forget 容錯）。
- `reactions` POST 改為進程內直接 `void processReactionForCommunity(...)`，**不再走 HTTP self-call**（原本無 session cookie，套權限會被 401）。權限改由 reactions 一處把關。
- `community/trigger` route 保留為對外端點：加 `auth()` + `requirePetAccess`，再呼叫同一函式。

---

## 5. GET petId 由 optional 改必填 + 前端呼叫端

改必填的 4 支：`symptoms` GET、`usages` GET、`documents` GET、`tasks` GET（無 petId → 400）。

前端掃描結果（`grep /api/(symptoms|usages|documents|tasks)`，排除 API 檔）：
- `usages` GET 呼叫端（`page.tsx`、`products/page.tsx`、`log/page.tsx`）皆已帶 `petId=`，且呼叫前有 `if (!currentPetId/petId) return` 守門。
- `symptoms` GET 呼叫端（`symptoms/page.tsx`、`symptoms/[type]/page.tsx`）皆已帶 `petId=`。
- `documents`、`tasks` 沒有 GET 呼叫端（前端只用 POST/PATCH，tasks 清單由 props 傳入）。

→ **前端無需修改**，既有呼叫端都已符合「必帶 petId」。

---

## 6. seed.ts

`prisma/seed.ts`：在 demo Pet upsert 後新增 `petMember.upsert(role:'owner', userId: demo-user)`（冪等保險；雙重判定其實已涵蓋）。

---

## 7. backfill migration

`prisma/migrations/20260604000000_backfill_owner_membership/migration.sql`

- 冪等 `INSERT … SELECT … WHERE NOT EXISTS`，為「有 userId 但缺 PetMember」的 Pet 補建 owner membership。
- `id` 用 `lower(hex(randomblob(16)))`（raw SQL 無法套 cuid default；僅作主鍵不影響功能）；`joinedAt` 用 `Pet.createdAt`。
- 已加註解說明部署順序（先 backfill → 再上權限碼），並標明此 migration 會寫正式 Turso，須 DevOps 在 deploy 時與落後 migration 一起處理。
- **僅在本機 dev.db 套用**（`DATABASE_URL="file:./dev.db" npx prisma migrate deploy`），未碰正式 Turso。

---

## 8. 驗證結果

- `npx tsc --noEmit`：通過，無錯誤。
- `eslint`（核心變更檔）：通過。
- 臨時 jiti 腳本（已刪除）對 `dev.db` 驗證：
  - 有 userId 的 Pet：1 筆，缺 owner membership：**0**（backfill 生效）。
  - demo owner（via userId）→ `{ ok:true, role:'owner' }`（**不被 403**）。
  - 非成員 stranger → `403`；空 userId → `401`；不存在的 pet → `404`。
  - `requirePetAccessByRecord('symptomEntry', …)`：owner → ok 帶 petId；stranger → 403；不存在紀錄 → 404。

---

## 9. 未解 / 需注意

1. **`tasks` PATCH（toggle 完成）IDOR**：以 `taskId` 更新 WeeklyTask、無 petId、規格 42 列未納入，故本次未加檢查。屬殘留 IDOR（可改別人寵物的任務完成狀態）。建議下一批用 `requirePetAccessByRecord`（需新增 weeklyTask model 映射）補上。
2. **未登入 / demo 情境**：`/api/pets` GET 未登入仍回全部；`userId=null` 的匿名寵物（非 demo 帳號建立）套 requirePetAccess 會 403。demo 帳號（`demo-user`）的寵物因 `Pet.userId` 判定 + 已 backfill，不受影響。匿名策略仍待總指揮確認（規格 §6 風險）。
3. **非寵物綁定資源未納管**：`extract`、`upload`、`products/*`、`news/*`、`users` 本次不納入（規格 §6），`upload`/`extract` 仍可被匿名濫用（耗 token / 存檔），列未來 rate-limit。
4. **正式庫部署順序（DevOps）**：須先跑 backfill migration、再上權限程式碼（migration 檔已註明）。雙重判定已大幅降低「先上碼導致 owner 全 403」的風險，但仍以此順序為準。
5. **create pet 未包 transaction**：規格 §1.1 建議的選配項本次未做（非阻擋項）。

---

## 10. 動到的檔案清單

**核心**
- `src/lib/petAccess.ts`（雙重判定 + requirePetAccessByRecord + status 加 404）
- `src/lib/community.ts`（新增，抽出 processReactionForCommunity）

**查詢 / 特例**
- `src/app/api/pets/route.ts`（GET OR 查詢）
- `src/app/api/community/trigger/route.ts`（改用共用函式 + 加權限）
- `src/app/api/reactions/route.ts`（加權限 + 改進程內呼叫）

**模式 1 加 requirePetAccess**
- `pets/[id]`、`daily-health-log`、`diary-records`、`diary-dates`、`diary-parse`、`health-metrics`、`measurement-record`、`medication-record`、`grooming-record`、`symptoms`、`pet-products`、`usages`、`documents`、`meal-plans`、`instant-analyze`、`nutrition-ai`、`diet-analysis`、`analyze`、`analysis`、`recommend`、`chat`、`tasks`、`community/recs`（各 route.ts）

**模式 2 加 requirePetAccessByRecord**
- `symptoms/[id]`、`usages/[id]`、`pet-products/[id]`、`instant-analyze/[id]`、`meal-plans/[id]/items`、`community/dismiss`（各 route.ts）

**Seed / Migration**
- `prisma/seed.ts`
- `prisma/migrations/20260604000000_backfill_owner_membership/migration.sql`（新增）

**前端**：無修改（既有 GET 呼叫端皆已帶 petId）。

---

## 11. 追加修補：2 個必修 IDOR（2026-06-04，資安 Phase 1-C 複查）

資安審查在 §9 未解清單中標出的兩個殘留 IDOR，本次補上。

### 必修 1：`tasks` PATCH 跨寵物越權

- 問題：`PATCH /api/tasks` 直接 `weeklyTask.update({ where:{id:taskId} })`，無 auth、無權限 → 任何人可改別人寵物任務的完成狀態。
- 修法：
  - `src/lib/petAccess.ts`：`RecordModel` 加入 `'weeklyTask'`，`resolvePetId` 新增 `weeklyTask` case（`findUnique` select `petId`）。
  - `src/app/api/tasks/route.ts` PATCH：在更新前 `const session = await auth()` → `requirePetAccessByRecord('weeklyTask', taskId, session?.user?.id ?? '')`（W 級，owner + co_owner），失敗回 `access.status`（401/403/404）後才 update。

### 必修 2：`products/web-search` 用未驗證 petId 讀別人寵物

- 問題：`POST /api/products/web-search` 收 client `petId` 直接查該 pet 的 species / mainProblems + 近 30 天 symptomEntry，無 auth / 權限 → 可用他人 petId 讀取寵物資料。
- 修法（採「無權限就忽略 petId、降級搜尋」策略，避免破壞未綁寵物的一般用法）：
  - `src/app/api/products/web-search/route.ts`：帶 `petId` 時先 `auth()` + `requirePetAccess(petId, session?.user?.id ?? '')`；唯有 `access.ok` 才把 `petId` 設給 `allowedPetId`，後續寵物查詢一律用 `allowedPetId`。無權限 / 未登入 → `allowedPetId` 為 null，`petSpecies`/`petSymptoms` 維持預設，等同無寵物 context 的一般搜尋。body 未帶 petId 時行為不變。

### 驗證

- `npx tsc --noEmit`：通過，無錯誤。
- 臨時 jiti 腳本（已刪除，僅碰本機 `dev.db`，未碰正式 Turso）：
  - 必修 1：owner（demo-user）對 demo 寵物「布丁」的 task → ok(role=owner)；非成員 `stranger-not-a-member` → **403**；不存在的 taskId → 404。
  - 必修 2：非成員帶他人 petId → `requirePetAccess.ok = false`（降級為無寵物 context，不讀該寵物資料）；owner 帶自己 petId → ok（正常用法不受影響）。

### 動到的檔案

- `src/lib/petAccess.ts`（`RecordModel` + `resolvePetId` 加 `weeklyTask`）
- `src/app/api/tasks/route.ts`（PATCH 加 `requirePetAccessByRecord('weeklyTask', …)`）
- `src/app/api/products/web-search/route.ts`（petId 先驗權限，無權限降級為一般搜尋）
