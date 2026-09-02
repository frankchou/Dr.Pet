# API 授權強化：全端工程師工作報告

- **任務**：修復未授權的 API 端點（上線阻斷級資安問題）
- **角色**：fullstack-engineer
- **日期**：2026-09-02
- **分支**：main（未 commit，依指示保留工作區變更）

---

## 一、每支端點的授權模型判斷與理由

### 1. `GET /api/pets`：🔴 最嚴重，已修

**原始問題**：
```ts
where: userId ? { OR: [{ userId }, { members: { some: { userId } } }] } : {}
```
未登入時 `userId` 為 `undefined`，三元運算退化成 `where: {}`，Prisma 視為「無條件全表查詢」，
回傳資料庫中**所有毛孩**，含 `allergies`、`medicalHistory`、`mainProblems` 等健康資料。

**授權模型判斷**：`Pet` 是使用者私有資料，存取者必為 owner（`Pet.userId`）或 co_owner（`PetMember`）。
未登入沒有任何合法理由讀取任何一筆。

**修法**：未登入 → `401 { error: 'Unauthorized' }`。
**刻意不回空陣列**，讓前端能區分「沒登入」與「這個帳號還沒有毛孩」：
回空陣列會讓前端誤判為「新使用者」而引導建檔，是錯誤的 UX 分支。

實測佐證（dev.db 共 2 筆 Pet）：修復前未登入可取得 2 筆（`咚咚` + `布丁`）；
修復後未登入 401，demo 帳號登入僅取得自己的 1 筆（`布丁`）。

### 2. `POST /api/pets`：一併加上（原本也未授權）

原本允許未登入建檔，寫入 `userId: null`。這會產生**孤兒毛孩**：
沒有 owner、沒有 `PetMember`，`requirePetAccess` 永遠判不過，等於誰都改不了也刪不掉，
卻在修復前被 `where: {}` 全域曝光。已改為需登入，並無條件建立 owner 的 `PetMember` 紀錄
（原本是 `if (session?.user?.id)` 才建，現在 userId 必存在）。

> ⚠️ 見「附帶發現 F1」：dev.db 內已存在一筆此類孤兒毛孩。

### 3. `POST /api/upload`：已修

**授權模型判斷**：已改用 Vercel Blob，**額度是實際金錢成本**。
未授權端點等於任何人都能無限上傳燒流量費，且能把任意檔案放進專案的 Blob 命名空間。

**修法**：`auth()` → 未登入 401。
**回傳格式完全未動**：成功仍為 `201 { url }`，`src/lib/storage.ts` 一行未改，
`saveUploadedImage` 的 `{ ok, url } | { ok: false, error, status }` 分支邏輯原樣保留。

### 4. `/api/users` [GET POST]：已刪除整個 route

**判斷**：v1 死碼，確認零呼叫端後直接刪除，比補驗證乾淨。

刪除前二次 grep 確認（全 repo，含 `.ts/.tsx/.js/.mjs/.json/.md`，排除 `node_modules`、`.next`）：
唯一的「呼叫端」是 `PurePaw/src/components/layout/ClientShell.tsx`，
但 `PurePaw/` 是設計稿目錄（內含 `SKILL.md`、`landing.html`、`_make/`），
**不在 `src/` 之下、不進 Next.js 編譯**，屬 v1 靜態 mockup，不構成實際呼叫端。
`docs/work-reports/auth-user-provisioning-fullstack.md` 與 `legal-pages-legal.md`
兩份既有報告也都已獨立記載此路由為死碼。

刪除同時消滅兩個問題（原 legal 報告列為 B2）：
- `GET /api/users?nickname=X` 未驗證即回傳完整 `User` 列（**含 email**），可被列舉爬取全站使用者 email
- `POST /api/users` 開放匿名 upsert `User` 資料列

建置後 `/api/users` 已從 route manifest 消失，實測回 404。

### 5. `/api/products` [GET POST] 與 `/api/products/[id]` [GET PUT DELETE]：已修

**授權模型判斷（讀 schema 後）**：`Product` **沒有 `userId` 欄位**，
是全站共用的產品目錄（多個 `PetProduct` / `ProductUsage` / `MealPlanItem` 指向同一筆），
**不是使用者私有資料**，因此不做 per-user 過濾。

但讀取我**選擇仍要求登入**，理由：
1. 全部呼叫端（`/log/new`、`/analysis`、`AddItemModal`、`ProductEditModal`）都在 `ClientShell` 登入牆之後，**要求登入不影響任何現有功能**（實測確認）。
2. 沒有任何公開的產品瀏覽頁 / SEO 頁需要它（`/landing`、`/privacy`、`/terms` 均未使用）。
3. 採預設拒絕（security-baseline），避免產品目錄與成分資料庫被匿名列舉爬取。

> 若日後要做公開產品頁或 SEO 落地頁，把 `GET` 的 `auth()` 檢查拿掉即可，成本極低。
> 這是刻意的可逆取捨，非架構變更。

寫入（POST / PUT / DELETE）則毫無疑問需要登入，已全數加上。

---

## 二、變更清單

| 檔案 | 變更 |
|---|---|
| `src/app/api/pets/route.ts` | GET/POST 皆加 `auth()`；GET 移除 `where: {}` 全表退化路徑；POST 無條件建立 owner `PetMember` |
| `src/app/api/upload/route.ts` | POST 加 `auth()`；回傳格式 `{ url }` 與 storage 呼叫邏輯不變 |
| `src/app/api/users/route.ts` | **已刪除**（v1 死碼 + 未授權寫入 + email 列舉） |
| `src/app/api/products/route.ts` | GET/POST 加 `auth()` |
| `src/app/api/products/[id]/route.ts` | GET/PUT/DELETE 加 `auth()`；GET 移除 `include: { usages: true }`（跨帳號外洩，見 F2）；DELETE 加「使用中不可刪」保護（見 F3） |

前端防禦性修補（10 檔，皆為同一模式）：對 `GET /api/pets` 的回應先做
`const list = Array.isArray(data) ? data : []` 正規化，避免 401 的 `{ error }` 物件被當陣列操作。

`src/app/log/page.tsx`、`src/app/log/new/page.tsx`、`src/app/upload/page.tsx`、
`src/app/products/page.tsx`（另補上原本完全缺少的 `.catch`）、`src/app/symptoms/new/page.tsx`、
`src/app/chat/page.tsx`、`src/app/scan/page.tsx`、`src/app/analysis/page.tsx`、
`src/app/settings/page.tsx`、`src/components/chat/NutritionistChat.tsx`

**未動**（依指示）：`src/lib/auth.ts`、`userProvisioning.ts`、`storage.ts`、`env.ts`、`prisma.ts`、
`src/app/privacy/**`、`src/app/terms/**`、`scripts/`、`package.json`、`.env`、四份系統文件。

---

## 三、curl 實測結果

dev server：`DATABASE_URL="file:./dev.db" npx next dev -p 3100`

### 未登入

| 請求 | 狀態 | 回應 |
|---|---|---|
| `GET /api/pets` | **401** | `{"error":"Unauthorized"}` |
| `POST /api/pets` | **401** | `{"error":"Unauthorized"}` |
| `GET /api/products` | **401** | `{"error":"Unauthorized"}` |
| `POST /api/products` | **401** | `{"error":"Unauthorized"}` |
| `GET /api/products/xxx` | **401** | `{"error":"Unauthorized"}` |
| `PUT /api/products/xxx` | **401** | `{"error":"Unauthorized"}` |
| `DELETE /api/products/xxx` | **401** | `{"error":"Unauthorized"}` |
| `POST /api/upload`（真實 multipart） | **401** | `{"error":"Unauthorized"}` |
| `GET /api/users?nickname=demo` | **404** | route 已刪除 |
| `POST /api/users` | **404** | route 已刪除 |

### 已登入（demo 帳號，NextAuth credentials 流程取得 cookie）

```
session -> {"user":{"name":"示範飼主","email":"demo@drpet.com","id":"demo-user"},...}
```

| 請求 | 狀態 | 結果 |
|---|---|---|
| `GET /api/pets` | **200** | 1 筆，`distinct userIds: {'demo-user'}` ： 正確只回自己的毛孩 |
| `GET /api/products?search=` | **200** | 產品目錄正常回傳 |
| `GET /api/products/<id>` | **200** | keys 不含 `usages`，外洩已堵住 |
| `POST /api/upload`（真實 PNG） | **201** | `{"url":"/uploads/upload-...png"}` ： 格式與狀態碼皆與修改前一致 |
| `DELETE /api/products/<使用中>` | **409** | `{"error":"此產品已被使用中，無法刪除"}` |

**權限隔離佐證**：dev.db 共 2 筆 Pet（`咚咚` userId=null、`布丁` userId=demo-user）。
demo 帳號只拿到 `布丁`，`咚咚` 正確被排除。

**資料未受汙染**：測試前後 `Pet: 2 / Product: 10 / ProductUsage: 3 / User: 9` 完全一致；
`demo-user` 建立於 2026-06-03（seed 既有，非本次產生），近一小時新增使用者 0 筆。
測試上傳的檔案已從 `public/uploads/` 刪除。未執行任何 commit。

---

## 四、對前端的影響評估

**結論：無破壞性影響。**

關鍵在 `src/components/layout/ClientShell.tsx:357` ： `if (status === 'unauthenticated') return <LoginPage />`。
整個 App 被登入牆包住，未登入者**根本不會掛載**那些呼叫 `/api/pets` 的頁面，
所以不存在「401 造成無限重導或白畫面」的情境。ClientShell 本身也不呼叫 `/api/pets`，不會產生重導迴圈。

唯一例外需要留意：`AppShell` 巢狀在 `ClientShell` **之內**，
而 `PUBLIC_PATHS = ['/landing', '/invite', '/privacy', '/terms']` 會直接 `return <>{children}</>` 放行，
因此在這四個公開路徑上 `AppShell`（以及 `/invite` 上的 `Sidebar`）**會以未登入狀態呼叫 `GET /api/pets`**。
兩者原本就寫了 `Array.isArray(data) ? data : []`，401 → 取得 `{error}` → 正規化成 `[]` → 安全降級，
不 throw、不重導。**這兩支不需要修改。**

其餘 10 支呼叫端雖在登入牆後、正常情境不會遇到 401，但存在 **session 中途過期**的殘餘風險：
其中 `settings`（`data.map`）、`products`（`data.find`）、`scan`、`NutritionistChat`（`data.find`）
會直接 throw 造成白畫面。已統一補上 `Array.isArray` 正規化。這是防禦性加固，不改變正常路徑行為。

`/api/upload` 的 7 個呼叫端全部在登入牆後，且回傳格式未變，無影響。
`ProductEditModal` 只讀 `ProductForEdit`（`id/type/name/brand/ingredientText/ingredientJson/photos`），
**不使用 `usages`**，故移除該 include 對它零影響。

---

## 五、`/api/invite/[token]` 檢查結論（只回報、未修改）

檔案：`src/app/api/invite/[token]/route.ts`

**核心授權邏輯正確**，未發現可利用漏洞：

- token 走 `findUnique({ where: { token } })`，是無法列舉的隨機值查詢，非序號遞增。
- 雙重過期判定 `status === 'expired' || new Date() > invitation.expiresAt`，**fail-closed**。
- 過期與不存在**都回 404 且錯誤訊息不同**（`'Invitation expired'` vs `'Invitation not found'`）：
  嚴格說這是輕微的存在性洩漏，但攻擊者得先猜中一個有效 token 才問得出差別，實務風險可忽略。
- 回傳欄位是白名單挑選（`petName/petSpecies/petBreed/inviterName/targetEmail/status/expiresAt`），
  **沒有**外洩 `allergies`、`medicalHistory` 等健康資料。
- 未登入可讀，符合「邀請連結本來就要未登入可存取」的設計意圖。

**兩點建議（非阻斷，供總指揮排期）**：

1. **`targetEmail` 對持有連結者明文可見。** 這是設計上必要的（受邀者要確認是不是找自己），
   但一旦連結被轉貼到公開場合（LINE 群、社群），該 email 就外流了。
   建議考慮遮罩顯示（`f***@gmail.com`），或至少在 `docs` 註記此為已知取捨。
2. **無使用次數上限。** 只看 `status` 與 `expiresAt`，同一 token 在有效期內可被無限次查詢。
   接受邀請的端點若也沒有 one-time 消耗，值得一併檢視。

---

## 六、附帶發現

### F1：🟡 既有孤兒毛孩資料，修復後會「消失」（需總指揮決策）

dev.db 存在 `咚咚`（`id=cmm1uh05n0000408gpu29shn0`, `userId=NULL`），
是舊版未授權 `POST /api/pets` 留下的產物。

修復**前**：`where: {}` 讓它對所有未登入訪客可見。
修復**後**：`userId` 為 null 且無 `PetMember`，**任何帳號都查不到它**（這是正確的安全結果）。

⚠️ **上線前必須確認正式庫是否也有 `userId IS NULL` 的 Pet**。若有，這些使用者會反映「我的毛孩不見了」。
查詢：`SELECT id, name, createdAt FROM Pet WHERE userId IS NULL;`
建議由 devops / 總指揮決定是資料遷移認領，還是清除。**我沒有動任何資料。**

### F2：🔴 `GET /api/products/[id]` 跨帳號外洩他人紀錄（已順手修掉）

原本 `include: { usages: true }`。`Product` 是全站共用資料，但 `ProductUsage` 是**私人紀錄**，
含 `petId`、`notes`（飼主自由輸入的備註）、`frequency`、`amountLevel`。

也就是：任何人（修復前甚至不用登入）打 `GET /api/products/<任一產品id>`，
就能拿到**所有使用該產品的毛孩 id 與飼主備註**。這是原任務清單沒列出的獨立漏洞。

已確認唯一呼叫端 `analysis/page.tsx:364 → ProductEditModal` 的 `ProductForEdit` 型別不含 `usages`，
移除該 include 對功能零影響。

### F3：🟡 `Product` 沒有擁有者模型，DELETE 仍是共用資源的破壞性操作

`Product` 無 `userId`，任何**已登入**使用者理論上都能改（PUT）或刪（DELETE）全站共用的產品資料，
連帶影響其他飼主。原始 DELETE 甚至會 `deleteMany` 掉所有人的 `ProductUsage`。

在不擅自導入新資料模型的前提下（那屬架構變更，應由 architect 決定），我採最小侵入的止血：
DELETE 前先 `count` `ProductUsage` 與 `PetProduct`，**只要有人在用就回 409 拒絕**，
避免一次刪除破壞他人資料。實測回 409 正確。

順帶一提：`DELETE /api/products/[id]` **全 repo 無任何前端呼叫端**（grep 確認），
所以這個保護不影響現有功能。

**留給總指揮的決策**：`Product` 是否該加 `createdByUserId`，
讓 PUT/DELETE 限縮為建立者或管理員？目前 PUT 仍是「任何登入者可改任何產品」，
這在共編式產品目錄是合理設計，但也可能被惡意竄改成分資料。**我沒有自行導入此模型。**

### F4：🟢 `PurePaw/` 目錄含 v1 舊程式碼且已進版控

`PurePaw/` 是設計稿 / skill 目錄，但內含 `_make/v2/src/app/**` 等 v1 React 原始碼
（其 `ClientShell.tsx` 仍呼叫已刪除的 `/api/users`）。不進 Next.js 編譯、無安全風險，
但會干擾未來的 grep 稽核（本次就差點誤判 `/api/users` 有呼叫端）。
建議由 tech-writer / devops 評估是否加入 `.gitignore` 或移出 repo。

---

## 七、驗證結果

| 檢查 | 結果 |
|---|---|
| `npx tsc --noEmit` | ✅ 通過，0 錯誤 |
| `npx eslint <14 個變更檔>` | ✅ 通過，0 error 0 warning |
| `npm run build` | ✅ 成功；`/api/users` 已從 route manifest 消失 |
| 未登入 curl（10 項） | ✅ 全數 401 / 404 |
| 已登入 curl（5 項） | ✅ 功能正常，資料正確隔離 |
| dev.db 資料 | ✅ 未變更（測試前後計數一致） |
| commit | ✅ 未執行 |

> `npm run build` / dev server 需以 `DATABASE_URL="file:./dev.db"` 前綴執行：
> `.env` 目前指向正式 Turso，`prisma.config.ts` 的護欄會（正確地）擋下本機操作。
> 我**沒有**修改 `.env`，只在指令層級覆寫。

---

## 八、未完成 / 需總指揮裁示

1. **F1 正式庫孤兒毛孩盤查與處置** ： 我不碰正式資料，需 devops 執行。
2. **F3 `Product` 擁有者模型** ： 屬架構決策，需 architect 定案；目前 PUT 仍開放給任何登入者。
3. **`/api/invite` 的 `targetEmail` 遮罩與 token 使用次數上限** ： 見第五節，非阻斷。
4. **四份系統文件未更新** ： 依指示由總指揮統一整合。
