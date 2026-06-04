# Phase 1-C 共同飼主存取修復 — 技術方案 / 存取控制規格

> 作者：架構師
> 對象：全端工程師（實作）、總指揮（決策）
> 範圍：只設計與寫規格。本文件**不含實作程式碼**，僅給出方案、對照表與順序建議。

---

## 0. 背景與核心約束

### 0.1 現況問題
1. `requirePetAccess(petId, userId)`（`src/lib/petAccess.ts`）**只查 `PetMember`**——若 owner 自己沒有 `PetMember(role: owner)` 紀錄，連 owner 都會被擋。
2. 接受邀請（`/api/invite/[token]/accept`）會 upsert `PetMember(role: co_owner)`，但 OR 查詢與 `requirePetAccess` 都依賴「owner 也有 membership」。
3. 約 25 支寵物資料 API **完全沒有 session/權限檢查**——任何人帶 `petId` 即可讀寫他人寵物資料（IDOR 漏洞）。目前僅 `invitations`、`members` 兩支有 `requirePetAccess`。

### 0.2 重要前提（已驗證，影響方案）
- **建立寵物時已會建 owner membership**：`POST /api/pets`（`src/app/api/pets/route.ts` L62-67）登入時已 `prisma.petMember.create({ role: 'owner' })`。
- **全站只有這一條建立寵物的路徑**：`grep prisma.pet.create` 僅命中 `src/app/api/pets/route.ts`。前端 `pet/new`、`pet/[id]` 都是打這支 API。→ **待辦 1-C 第 2 點的「建立時補建 owner membership」其實已完成**，剩下的只有「既有資料 backfill」。
- `requirePetAccess` 既以 `petMember.findUnique` 為唯一判準，因此 **backfill owner membership 是所有其他修復的前提**，必須最先做。
- 既有 `auth()` helper：`src/lib/auth.ts` 匯出 `auth`，所有 route 用 `const session = await auth(); const userId = session?.user?.id`。

---

## 1. Owner membership 一致性

### 1.1 建立流程（已就緒，僅需驗證）
- 確認點：`POST /api/pets` 在 `session?.user?.id` 存在時建立 `PetMember(role: 'owner')`。已存在，無需改碼。
- 待補強（選配，低風險）：把「create pet + create owner member」包進 `prisma.$transaction`，避免建寵物成功但 member 建立失敗造成的不一致。建議納入，但非阻擋項。
- 未登入建立的寵物（`userId = null`）不建 member——這是 demo/匿名情境，維持現狀；這類寵物不走共同飼主流程。

### 1.2 既有資料 backfill（必做）

**目標**：為所有「有 `userId` 但缺 `PetMember(role: owner)`」的既有 Pet 補建 owner membership。

**方案比較**

| 方案 | 做法 | 優點 | 缺點 | 建議 |
|---|---|---|---|---|
| A. Prisma migration data backfill | 在 migration 的 SQL 內 `INSERT ... SELECT` | 與 schema 版本綁定、deploy 自動執行、正式庫一次到位 | SQLite migration 寫 raw SQL；冪等性要自己顧 | ✅ **採用** |
| B. 一次性腳本（`scripts/backfill-owner-membership.ts`） | 手動 `tsx` 執行 | 邏輯用 Prisma 好寫、易測 | 要人記得在正式庫跑；和 migration 版本脫鉤 | 備援 |

**採用方案 A**，理由：正式站 Turso migration 已落後（見 0-4），deploy 時本來就要補跑一串 migration；把 backfill 做成一支 migration，能在「DevOps 補 migration」的同一動作裡一併處理，不必另外記得跑腳本。

**Migration 內容（描述，不是最終 SQL，交全端依 SQLite 語法定稿）**
```
-- 為每個有 userId 且尚無 owner membership 的 Pet 補建一筆
INSERT INTO PetMember (id, petId, userId, role, joinedAt)
SELECT
  lower(hex(randomblob(16))),   -- 由全端改為符合 cuid 慣例的 id 生成；或於腳本用 prisma cuid
  p.id, p.userId, 'owner', p.createdAt
FROM Pet p
WHERE p.userId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM PetMember m WHERE m.petId = p.id AND m.userId = p.userId
  );
```
注意點交全端定稿：
- **id 生成**：`PetMember.id` 是 `@default(cuid())`，raw SQL 不會套用 default。若用 raw SQL 需自行生成唯一 id（hex/randomblob 可接受，因為只是內部主鍵）；若希望 id 為標準 cuid，改用方案 B 腳本（`prisma.petMember.createMany`）較自然。**建議：若採 migration，用 randomblob hex 即可；id 格式不影響功能。**
- **冪等**：`NOT EXISTS` 子句保證重跑安全，也避開 `@@unique([petId, userId])` 衝突。
- **`joinedAt`** 用 `Pet.createdAt`，語意上 owner 自寵物建立起就是成員。

**對正式庫的影響 / 風險**
- 此 migration 會**寫入正式 Turso**，屬「對外寫入動作」，依專案規則 **不在本次 commit 自動執行**，須由總指揮 + DevOps 在 deploy 時安全執行（與 0-4 的 migration 落後一起處理）。
- 正式庫目前缺 `PetMember` 之後的多張表（HealthMetric 等）。backfill migration 必須排在 `add_nextauth_and_co_owner`（已含 PetMember 表）之後、且在所有落後 migration 補齊的序列中。DevOps 需先確認正式庫 migration 基準點，避免順序錯亂。

---

## 2. `/api/pets` GET 查詢修正

**現況**（`src/app/api/pets/route.ts` L9-12）：`where: userId ? { userId } : {}`——只回 owner 自己建立的寵物，co_owner 看不到被分享的寵物。

**改為**：
```
where: userId
  ? { OR: [{ userId }, { members: { some: { userId } } }] }
  : {}
```

**形狀 / 行為確認**
- **去重**：Prisma `findMany` 對單一 model 不會因 OR + relation filter 產生重複 row（不是 join 展開，是 `WHERE ... IN (subquery)` 形式），同一 Pet 只回一筆。無需額外 distinct。
- **排序**：維持 `orderBy: { createdAt: 'desc' }`，不變。
- **回傳形狀**：仍是 `Pet[]`，欄位不變。前端（settings、ProfileMenu 切換毛孩）無需改。
- **未登入**：`{}` 維持回全部（demo 情境）。本次不動，但列入風險（見 §6）。
- backfill 完成後，owner 同時符合 `{ userId }` 與 `{ members.some }` 兩個分支，OR 仍只回一筆，無副作用。

---

## 3. requirePetAccess 套用對照表（核心）

### 3.1 權限分級定義
- **R（讀取）**：owner + co_owner。
- **W（新增/修改紀錄）**：owner + co_owner（共同飼主可協作記錄）。
- **D-record（刪除單筆紀錄）**：owner + co_owner（協作刪除自己團隊的紀錄）。
- **O（僅 owner）**：刪除毛孩本身、邀請管理、未來的成員管理。

### 3.2 套用模式
- **模式 1（petId 直接可得）**：query `?petId=` 或 body `petId` 或 path `[id]` 即 petId → 直接 `requirePetAccess(petId, userId)`。
- **模式 2（path 是 recordId）**：先查該紀錄 → 取得其 `petId` → 再 `requirePetAccess(petId, userId)`。**這些 route 需先查 record，標 ⚠️。**
- 所有 route 共同前置：先 `const session = await auth()`，無 `session.user.id` 回 401；access 失敗回 `access.status`（401/403）。

### 3.3 對照表（共 30 支 route 檔，逐 method 列）

| # | 路由 | Method | petId 來源 | 模式 | 權限 | 備註 / 風險 |
|---|---|---|---|---|---|---|
| 1 | `pets` | GET | session（列自己的） | — | 自身 | 見 §2，非 requirePetAccess |
| 2 | `pets` | POST | — | — | 登入即可 | 建立；已建 owner member |
| 3 | `pets/[id]` | GET | path `[id]`=petId | 1 | R | 目前**無任何驗證**，含他人寵物明細 |
| 4 | `pets/[id]` | PUT | path `[id]`=petId | 1 | W | 改寵物基本資料 |
| 5 | `pets/[id]` | DELETE | path `[id]`=petId | 1 | **O** | 刪毛孩，僅 owner（破壞性、cascade 全資料） |
| 6 | `pets/[id]/invitations` | GET/POST | path `[id]`=petId | 1 | **O** | 已實作 owner-only ✅ |
| 7 | `pets/[id]/members` | GET | path `[id]`=petId | 1 | R | 已實作 ✅（任何成員可看清單） |
| 8 | `daily-health-log` | GET/POST | query / body `petId` | 1 | R / W | 無驗證 |
| 9 | `diary-records` | GET | query `petId` | 1 | R | 無驗證；聚合 symptoms+usages+metric |
| 10 | `diary-parse` | POST | body `petId` | 1 | R | AI 解析，讀寵物 context；耗 token，務必先驗權限再呼叫 AI |
| 11 | `diary-dates` | GET | query `petId` | 1 | R | 月曆圓點聚合 |
| 12 | `health-metrics` | GET/POST | query / body `petId` | 1 | R / W | upsert |
| 13 | `measurement-record` | GET/POST | query / body `petId` | 1 | R / W | |
| 14 | `medication-record` | GET/POST | query / body `petId` | 1 | R / W | |
| 15 | `grooming-record` | GET/POST | query / body `petId` | 1 | R / W | |
| 16 | `symptoms` | GET/POST | query / body `petId` | 1 | R / W | GET 的 petId 目前是 optional，補驗後須改為必填（否則無 petId 可驗） |
| 17 | `symptoms/[id]` | GET | path `[id]`=**recordId** | 2 ⚠️ | R | 先查 SymptomEntry→petId |
| 18 | `symptoms/[id]` | DELETE | path `[id]`=**recordId** | 2 ⚠️ | D-record | 先查→petId 再驗 |
| 19 | `pet-products` | GET/POST | query / body `petId` | 1 | R / W | |
| 20 | `pet-products/[id]` | PATCH | path `[id]`=**recordId** | 2 ⚠️ | W | 先查 PetProduct→petId |
| 21 | `pet-products/[id]` | DELETE | path `[id]`=**recordId** | 2 ⚠️ | D-record | soft delete（isActive=false） |
| 22 | `reactions` | GET/POST | query / body `petId` | 1 | R / W | POST 會 fire-and-forget 打 community/trigger |
| 23 | `usages` | GET/POST | query / body `petId` | 1 | R / W | GET petId optional→補驗後設必填 |
| 24 | `usages/[id]` | PUT | path `[id]`=**recordId** | 2 ⚠️ | W | 先查 ProductUsage→petId |
| 25 | `usages/[id]` | DELETE | path `[id]`=**recordId** | 2 ⚠️ | D-record | |
| 26 | `documents` | GET/POST | query / body `petId` | 1 | R / W | GET petId optional→補驗後設必填 |
| 27 | `meal-plans` | GET/POST | query / body `petId` | 1 | R / W | upsert by petId+date |
| 28 | `meal-plans/[id]/items` | POST | path `[id]`=**planId(recordId)** | 2 ⚠️ | W | 先查 DailyMealPlan→petId |
| 29 | `meal-plans/[id]/items` | DELETE | path `[id]`=**planId** + query `itemId` | 2 ⚠️ | D-record | 先查 plan→petId；已驗 item 屬該 plan |
| 30 | `instant-analyze` | GET | query `petId` | 1 | R | 歷史清單 |
| 31 | `instant-analyze` | POST | formData `petId` | 1 | W | 圖片分析存檔；耗 token，先驗再呼叫 AI |
| 32 | `instant-analyze/[id]` | DELETE | path `[id]`=**recordId** | 2 ⚠️ | D-record | 先查 InstantAnalysis→petId |
| 33 | `nutrition-ai` | GET/POST | query / body `petId` | 1 | R / W | AI；先驗再呼叫 |
| 34 | `diet-analysis` | POST | body `petId` | 1 | R | 純 AI 計算、**不寫 DB**，但讀寵物資料語意→驗權限；先驗再呼叫 AI |
| 35 | `analyze` | GET/POST | query / body `petId` | 1 | R / W | POST 寫 AIInsight；AI |
| 36 | `analysis` | GET | query `petId` | 1 | R | rule-based，無 AI |
| 37 | `recommend` | GET/POST | query / body `petId` | 1 | R / W | AI |
| 38 | `chat` | GET/POST | query / body `petId` | 1 | R / W | POST 寫 ChatMessage；AI |
| 39 | `tasks` | GET/POST | query / body `petId` | 1 | R / W | GET petId optional→補驗後設必填；AI |
| 40 | `community/recs` | GET | query `petId`（→forPetId） | 1 | R | where 用 `forPetId` |
| 41 | `community/trigger` | POST | body `petId` | 1 | W | ⚠️ 見下方特例 |
| 42 | `community/dismiss` | POST | body `recId`=**CommunityRec id** | 2 ⚠️ | W | 先查 CommunityRec→forPetId 再驗 |

> 待辦 1-C 點名約 25 支；本表把所有相關 route 檔 + 各 method 攤開共 **42 列**（涵蓋待辦全部項目，外加 `community/dismiss`、`instant-analyze` POST 等延伸點）。待辦未列但屬同類、本次**不納入**：`extract`、`upload`、`products/*`、`news/*`、`users`（非綁定單一寵物的資源，見 §6 風險）。

### 3.4 模式 2（recordId→petId）route 清單（實作要先查 record）
這些務必先查紀錄取得 petId 再驗，否則無法驗權限：
- `symptoms/[id]`（SymptomEntry）
- `usages/[id]`（ProductUsage）
- `pet-products/[id]`（PetProduct）
- `instant-analyze/[id]`（InstantAnalysis）
- `meal-plans/[id]/items`（DailyMealPlan，path 是 planId）
- `community/dismiss`（CommunityRec，body 是 recId）

### 3.5 特例：`community/trigger`
- 目前由 `reactions` POST **fire-and-forget 內部呼叫**（`fetch(.../api/community/trigger)`，無帶 session cookie）。
- 若直接對它加 `requirePetAccess`，內部呼叫會因無 session 被 401，破壞既有流程。
- **方案（交全端 + 總指揮確認）**：
  - 優先：把 trigger 邏輯改為 `reactions` POST 內**直接呼叫的函式**（抽到 `src/lib/community.ts`），不再走 HTTP self-call；如此權限由 `reactions` 一處把關即可，trigger route 可移除或保留為內部用。
  - 次選：trigger route 改為僅接受**內部密鑰 header**（環境變數），對外不開放。
- 在方案敲定前，**不要**對 `community/trigger` 直接套 `requirePetAccess`。

---

## 4. 共用 helper 強化（建議採用）

模式 2 共 6 支會重複「查 record → 取 petId → requirePetAccess」。建議在 `src/lib/petAccess.ts` 新增：

```
type RecordModel = 'symptomEntry' | 'productUsage' | 'petProduct'
                 | 'instantAnalysis' | 'dailyMealPlan' | 'communityRec'

// 由 record 反查 petId 後驗權限。
// 回傳沿用既有 PetAccessResult，並在成功時帶回 petId 供後續操作。
export async function requirePetAccessByRecord(
  model: RecordModel,
  recordId: string,
  userId: string
): Promise<PetAccessResult & { petId?: string }>
```

設計要點（交全端定稿）：
- 內部用 `switch(model)` 查對應 model 的 `findUnique({ where: { id }, select: { petId 或 forPetId } })`。`CommunityRec` 的欄位是 `forPetId`，需映射。
- record 不存在 → 回 `{ ok: false, status: 404 }`（建議擴充 `PetAccessResult` 的 status 聯集加入 404）。
- 成功回傳帶 `petId`，避免呼叫端再查一次。
- **利弊**：減少 6 處重複、集中授權邏輯（安全面集中審查的好處）。代價是一個小型 model 映射表需與 schema 同步維護。**建議採用**——授權邏輯集中對安全更有利。
- 若不採 helper，亦可各 route 自行查；但須在 code review 逐支確認，遺漏成本高。

模式 1 直接用既有 `requirePetAccess`，不需新 helper。

---

## 5. 實作順序建議

1. **【前提】backfill owner membership**（§1.2，方案 A migration）— 沒有它，套 `requirePetAccess` 會把現有 owner 全擋掉。**最先做，本機 dev.db 先跑驗證**。
2. **`/api/pets` GET 改 OR 查詢**（§2）— 讓 co_owner 看得到寵物。改完後 co_owner 才有測試入口。
3. **（選配）新增 `requirePetAccessByRecord` helper**（§4）— 在套 25 支之前先備好，模式 2 才好寫。
4. **模式 1 route 套 requirePetAccess**（§3 表中模式 1，約 24 個 method）— 機械式套用，建議分批 commit（讀取類一批、寫入類一批）。
5. **模式 2 route 套 requirePetAccessByRecord**（6 支 ⚠️）。
6. **`pets/[id]` DELETE 收緊為 owner-only**，PUT/GET 為成員可用（§3 #3-5）。
7. **處理 `community/trigger` 特例**（§3.5）— 抽函式或內部密鑰，需總指揮確認方向。
8. **GET petId 由 optional 改必填** 的幾支（symptoms / usages / documents / tasks）——補驗後沒有 petId 就無從驗權限，需同步調整前端呼叫確保都帶 petId。
9. 全程 `npx tsc -b` 通過；交 QA 用 owner / co_owner / 無關第三方三種身分驗收。

---

## 6. 風險清單

| 風險 | 等級 | 說明 / 緩解 |
|---|---|---|
| 正式庫 backfill 時機 | 🔴 高 | 寫正式 Turso，須總指揮 + DevOps 在 deploy 時執行，與 0-4 migration 落後一起；順序錯會失敗。**需決策**。 |
| backfill 前先 deploy 權限檢查 | 🔴 高 | 若先上 requirePetAccess、後跑 backfill，正式站既有 owner 會全部 403。**部署順序必須：先 backfill migration → 再上權限碼**，或同次 deploy 內 migration 先於程式生效。**需決策**。 |
| `community/trigger` self-call 被擋 | 🟠 中 | 直接套權限會破壞 reactions 流程；採 §3.5 抽函式方案。**需決策方向**。 |
| GET petId optional 改必填 | 🟠 中 | symptoms/usages/documents/tasks 的 GET 目前 petId 可空（回全站資料，本身就是漏洞）。改必填可能影響某些不帶 petId 的呼叫端，需全端掃前端確認。 |
| 未登入（demo）情境 | 🟠 中 | `/api/pets` GET 未登入回全部、demo 寵物 `userId=null` 無 member。套 requirePetAccess 後 demo 寵物會被擋（無 member→403）。需確認 demo 帳號（`demo-user`）的寵物有對應 membership，或在 access 邏輯對 `userId=null` 的寵物特別處理。**需總指揮確認 demo 策略**。 |
| 非寵物綁定資源未納管 | 🟡 低 | `extract`、`upload`、`products/*`、`news`、`users` 不綁單一寵物，本次不納入；但 `upload`/`extract` 仍可被匿名濫用（耗 token / 存檔）。列入未來功能或另案 rate-limit。 |
| AI route 先驗權限再呼叫 | 🟡 低 | diary-parse / instant-analyze / nutrition-ai / diet-analysis / analyze / recommend / chat / tasks 都要在 `anthropic` 呼叫**之前**驗權限，否則無權者也能燒 token。實作須注意把 access 檢查放最前面。 |
| create pet 非交易 | 🟡 低 | 建寵物與建 owner member 非同一 transaction（§1.1），極端情況不一致；建議包 `$transaction`。 |

---

## 7. 影響檔案清單

**核心 helper / 查詢**
- `src/lib/petAccess.ts` — 新增 `requirePetAccessByRecord`（§4），可能擴充 status 聯集加 404。
- `src/app/api/pets/route.ts` — GET 改 OR 查詢（§2）；POST 選配包 transaction。

**Migration**
- `prisma/migrations/<timestamp>_backfill_owner_membership/` — 新增 backfill migration（§1.2）。

**模式 1 套 requirePetAccess（24 method / 18 檔）**
- `src/app/api/pets/[id]/route.ts`（GET/PUT 成員、DELETE owner-only）
- `src/app/api/daily-health-log/route.ts`
- `src/app/api/diary-records/route.ts`
- `src/app/api/diary-parse/route.ts`
- `src/app/api/diary-dates/route.ts`
- `src/app/api/health-metrics/route.ts`
- `src/app/api/measurement-record/route.ts`
- `src/app/api/medication-record/route.ts`
- `src/app/api/grooming-record/route.ts`
- `src/app/api/symptoms/route.ts`
- `src/app/api/pet-products/route.ts`
- `src/app/api/reactions/route.ts`
- `src/app/api/usages/route.ts`
- `src/app/api/documents/route.ts`
- `src/app/api/meal-plans/route.ts`
- `src/app/api/instant-analyze/route.ts`
- `src/app/api/nutrition-ai/route.ts`
- `src/app/api/diet-analysis/route.ts`
- `src/app/api/analyze/route.ts`
- `src/app/api/analysis/route.ts`
- `src/app/api/recommend/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/community/recs/route.ts`

**模式 2 套 requirePetAccessByRecord（6 檔）**
- `src/app/api/symptoms/[id]/route.ts`
- `src/app/api/usages/[id]/route.ts`
- `src/app/api/pet-products/[id]/route.ts`
- `src/app/api/instant-analyze/[id]/route.ts`
- `src/app/api/meal-plans/[id]/items/route.ts`
- `src/app/api/community/dismiss/route.ts`

**特例**
- `src/app/api/community/trigger/route.ts` + 可能新增 `src/lib/community.ts`（§3.5）。

**前端（GET petId 改必填的連帶）**
- 掃 `src/app` 內呼叫 symptoms / usages / documents / tasks GET 而未帶 petId 的呼叫端，補上 petId。
