# Phase 1-C 共同飼主存取控制 — Code Review

> 審查者：Code Reviewer
> 日期：2026-06-04
> 範圍：未 commit 的 Phase 1-C 改動（`petAccess.ts`、`community.ts`、約 30 支 route、seed、backfill migration）
> 依據：`docs/work-reports/phase1c-access-control-fullstack.md` + `coding-conventions` skill

## 結論摘要

- **無必修（🔴）阻擋項。** 可以 commit。
- `npx tsc --noEmit`：**通過，0 錯誤**。
- `eslint`（核心檔）：**通過，0 警告**。
- 權限套用一致性極高：53 處 `if (!access.ok)` 回傳格式完全一致。
- backfill migration 已套用於 dev.db，缺 membership 的 Pet 為 0。
- 前端「呼叫端皆已帶 petId」屬實（抽查 3 處皆有 petId + 守門）。

---

## 🟡 建議（不阻擋 commit，建議排入後續）

### 1. `tasks` PATCH 殘留 IDOR — `src/app/api/tasks/route.ts:127-144`
`PATCH` 以 `taskId` 直接 `weeklyTask.update`，無任何權限檢查，任何人可改他人寵物的任務完成狀態。
全端已於報告 §9.1 誠實揭露，且不在規格 42 列對照表內。
- 建議修法：為 `requirePetAccessByRecord` 新增 `weeklyTask` 映射（`select: { petId: true }`），於 PATCH 套用。
- 嚴重度：中（資料破壞性低，僅 toggle 布林），故列建議而非必修。

### 2. fire-and-forget 在 serverless 可能被截斷 — `src/app/api/reactions/route.ts:46`
`void processReactionForCommunity(...)` 未 await，回應送出後函式可能在 serverless 環境被回收，導致社群推薦未完成。
- 此風險與**原本** `fetch().catch()` 的 self-call 完全等價（行為無退步），故不阻擋。
- 建議：未來若上 Vercel/Edge，改用 `after()`（Next.js）或佇列確保背景工作完成。

### 3. backfill migration 的 FK 依賴順序 — `prisma/migrations/20260604000000_backfill_owner_membership/migration.sql`
`PetMember.userId` 對 `User` 有 FK。backfill 直接複製 `Pet.userId`；若正式庫存在「`Pet.userId` 指向不存在 User」的髒資料，INSERT 會 FK 失敗。
- dev.db 實測 orphan userId = 0，無問題。
- 正式庫部署前，DevOps 應先跑同樣的 orphan 檢查（migration 註解已標明部署順序，建議再補一句 FK 前置檢查）。

### 4. `community.ts` 沿用既有 `JSON.parse` 而非專案慣用 `parseJson()` — `src/lib/community.ts:42,51,128`
專案慣例（CLAUDE.md）要求 array 欄位用 `parseJson()` 安全解析。此處直接 `JSON.parse(pet.mainProblems || '[]')`。
- 屬「原封不動搬移」既有 trigger route 程式碼，行為等價、外層有 try/catch 吞錯，故非退步。
- 建議：順手改用 `parseJson<string[]>(...)` 與周圍程式碼一致；第 128 行 AI 回傳的 `JSON.parse(jsonMatch[0])` 已在 try 內，可保留。

---

## 🟢 OK（確認無問題）

### petAccess.ts
- `requirePetAccess`：雙重判定正確 — 先 `Pet.userId === userId` 判 owner（不依賴 PetMember，既有 owner/demo 不被擋），再查 PetMember。401/403/404 分支完整，順序正確（空 userId → 404 pet → owner → member）。`src/lib/petAccess.ts:17-37`
- `PetAccessResult` 用 discriminated union（`ok:true|false`），符合慣例。status 聯集 `401|403|404` 正確擴充。
- `requirePetAccessByRecord`：回傳型別 `PetAccessResult & { petId?: string }` 型別安全；失敗直接回 `access`、成功才帶 petId。`src/lib/petAccess.ts:52-65`
- `resolvePetId`：以 `switch` over 字面量聯集 `RecordModel`，**逐一靜態存取** model（非動態 `prisma[model]`），完全型別安全；`communityRec` 正確映射 `forPetId`。switch 涵蓋全部 6 個 case，TS exhaustiveness 通過。`src/lib/petAccess.ts:68-116`

### community.ts（抽出 processReactionForCommunity）
- 與原 trigger route 邏輯**逐行等價**（good→sharedAt、bad→相似寵物/AI fallback、去重、ranked count>=2、AI placeholder productId + fromAI）。`git diff` 比對無遺漏分支。
- 所有 `await` 完整保留，無遺漏。整段包在 try/catch 吞錯並 `console.error`，維持 fire-and-forget 容錯，**錯誤不會中斷 reactions 主流程**。`src/lib/community.ts:25-153`
- `community/trigger` route 改為對外端點：加 `auth()` + `requirePetAccess` + 必填欄位 400 驗證，再呼叫同一函式；錯誤改回 500（原本永遠回 ok，現在對外端點回真實錯誤，合理）。`src/app/api/community/trigger/route.ts`

### route 一致性（約 30 支）
- 模式 1（`requirePetAccess`）37 處、模式 2（`requirePetAccessByRecord`）8 處，回傳行 53 處**字面完全一致**。
- AI route（chat/analyze/tasks/diary-parse/diet-analysis/instant-analyze/nutrition-ai/recommend）權限檢查一律在 anthropic 呼叫**之前**，避免無權者燒 token。已逐一確認。
- `pets/[id]` DELETE 正確加 `owner-only`（`access.role !== 'owner'` → 403）。`src/app/api/pets/[id]/route.ts:96-110`
- `pets` GET 改 `OR: [{ userId }, { members: { some: { userId } } }]`，co_owner 可見；未登入仍回全部（demo），未改變回傳形狀。`src/app/api/pets/route.ts:10-12`
- `meal-plans/[id]/items` POST 正確將 auth 變數命名為 `authSession`，避開與 body 的 `session` 欄位衝突；移除冗餘的 plan 存在性 findUnique（已由 `requirePetAccessByRecord` 反查涵蓋）。`src/app/api/meal-plans/[id]/items/route.ts:14,38`

### GET petId 改必填（4 支）— 未擋掉合法呼叫
- `symptoms`/`usages`/`documents`/`tasks` GET 改必填，無 petId → 400。
- 抽查前端呼叫端：
  - `src/app/page.tsx:224` `/api/usages?petId=${currentPetId}` + `useEffect` 守門 `if (!currentPetId) return`（:218）。
  - `src/app/symptoms/page.tsx:62` `/api/symptoms?petId=${petId}` + 守門 `if (!petId) return`（:56）。
  - `src/app/symptoms/[type]/page.tsx:55` 帶 `pets[0].id`，包在 `if (pets.length > 0)` 內（:52）。
- `documents`/`tasks` 無 GET 呼叫端（前端僅 POST/PATCH）。→ 前端確實無需改，無合法呼叫被擋。

### migration / seed
- migration SQL 冪等（`INSERT … SELECT … WHERE NOT EXISTS`，避開 `@@unique([petId,userId])` 衝突），語法正確；`id` 用 `lower(hex(randomblob(16)))`、`joinedAt` 用 `Pet.createdAt`，合理。dev.db 實測 backfill 後缺 membership = 0。
- `seed.ts` 用 `petMember.upsert(where: petId_userId, create role:'owner')`，冪等且正確；複合鍵與 schema `@@unique([petId, userId])` 對應正確。`prisma/seed.ts:80-86`

---

## 給總指揮

- **有無必修：無。** 4 項建議皆不阻擋。
- **tsc：通過（0 錯誤）。** eslint 核心檔通過。
- **可否 commit：可以。**
- 建議下一批處理：🟡#1（tasks PATCH IDOR）為最有價值的後續項；DevOps 部署正式庫前注意 🟡#3 的 FK 前置檢查與部署順序。
