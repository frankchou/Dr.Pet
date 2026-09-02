# 照片上傳改用 Vercel Blob ＋ 補 metadataBase

角色：fullstack-engineer
日期：2026-09-02
狀態：實作完成，已驗證（未 commit）

---

## 一、問題說明

### 問題 1：照片上傳寫本機檔案系統（上線阻斷）

- `src/app/api/upload/route.ts` 用 `writeFile()` 把圖片寫進 `public/uploads/`。
- `src/app/api/instant-analyze/route.ts` 內部的 `saveUploadedImage()` 也是同一套寫法。
- Vercel Serverless 的檔案系統唯讀（只有 `/tmp` 可寫，且函式一結束就消失），
  正式站呼叫 `/api/upload` 會直接 500（EROFS），全站 7 個上傳入口同時失效：
  - `src/components/diary/SkinHairCard.tsx`
  - `src/components/diary/MedicationModal.tsx`
  - `src/components/diary/GroomingModal.tsx`
  - `src/app/upload/page.tsx`
  - `src/app/pet/[id]/page.tsx`
  - `src/app/pet/new/page.tsx`
  - `src/app/settings/page.tsx`（寵物頭像）

### 問題 2：`src/app/layout.tsx` 未設 `metadataBase`

Next.js 沒有 `metadataBase` 時，metadata 內相對路徑的 `og:image` 不會展開成絕對網址，
LINE / Facebook 爬蟲抓不到預覽圖（build 也會出 warning）。且原本 root layout
根本沒有 `openGraph` / `twitter` 欄位，等於完全沒有分享卡片。

---

## 二、設計決策

### 決策 1：新增 `src/lib/storage.ts`，一份程式碼、兩種儲存後端

不直接在 route 內 `if` 判斷，而是抽成 lib，理由：
`/api/upload` 與 `/api/instant-analyze` 兩支都要用，且未來若再有上傳點（如社群貼文）
可直接沿用，避免第三份重複的存檔邏輯。

```
Vercel（有 BLOB_READ_WRITE_TOKEN） → Vercel Blob
本機 / Codespace（沒有 token）      → 維持寫 public/uploads/
```

兩邊都回相同形狀的 `{ ok: true, url }`，**前端 7 個呼叫端一行都沒動**。

### 決策 2：為什麼保留本機 fallback（而非一律走 Blob）

1. **零設定即可開發**：本機若強制走 Blob，每位開發者（與每個 Codespace）都得先申請
   token 才能測「上傳照片」這條主要動線，違反本專案「dev 環境開箱即用」的既有原則
   （`.env.example` 明載 dev 一律 `file:./dev.db`，同一個精神）。
2. **不污染正式 Blob 儲存**：本機測試圖若都往同一個 Blob store 丟，正式資料會混入
   大量測試垃圾，且 Blob 有容量與流量計費。
3. Next dev server 會直接以靜態檔案服務 `public/uploads/`，本機不需要任何額外設定。

### 決策 3：環境判斷沿用 `src/lib/env.ts`，不自行推測

`resolveStorageDriver()` 的判斷順序：

| 順位 | 條件 | 結果 | 理由 |
|---|---|---|---|
| 1 | `BLOB_READ_WRITE_TOKEN` 存在 | `blob` | 顯式訊號優先。本機也可刻意設 token 實測 Blob 路徑（本次驗證就是這樣做的）。 |
| 2 | `isVercelDeployment()` 為 true | `blob` | 沒 token 但人在 Vercel：檔案系統唯讀，寫本機必失敗。仍走 Blob 讓 `put()` 拋出「找不到 token」這種讀得懂的錯，好過難解的 `EROFS`。 |
| 3 | 其餘 | `local` | 本機 / Codespace / CI。 |

刻意不用 `NODE_ENV`：`next build` 期間 `NODE_ENV` 恆為 `production`，本機建置會被誤判
（`src/lib/env.ts` 的註解已載明同一個坑）。

### 決策 4：補上檔案大小 / 型別驗證（向後相容優先）

原本 `/api/upload` **完全沒有任何驗證**，任何檔案（含 .exe、.zip）都會被存進 public 目錄
並取得公開 URL。新增：

- **大小**：預設上限 10MB（手機直出照片多在 3–8MB）。超過回 413。
  `instant-analyze` 用 `maxBytes` 選項覆寫為 20MB，**維持該路由原有的上限不變**。
- **空檔**：0 byte 回 400（原本會產生一個壞掉的 0 byte 圖）。
- **型別**：刻意寬鬆，只擋「明確不是圖片」的 MIME type。
  空字串或 `application/octet-stream`（iOS 相簿 HEIC、部分 Android 檔案選擇器的行為）
  退回看副檔名，避免誤擋真實使用者的照片。全部 7 個呼叫端的 `<input accept>` 都已是
  `image/*` 或更嚴格，故此驗證不會改變既有正常流程。

### 決策 5：`instant-analyze` 的存檔維持「非致命」

改用 `storeInstantImage()` 包一層：儲存失敗只 `console.warn` 並回 `null`，
分析結果照常回傳（與改動前行為一致，只是多了一行 log 便於線上追查）。

### 決策 6：`metadataBase` 抽成 `src/lib/siteUrl.ts`

| 環境 | 取值順序 | 理由 |
|---|---|---|
| production | `NEXT_PUBLIC_SITE_URL` → `NEXTAUTH_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` | 自訂網域優先；`NEXTAUTH_URL` 本來就是正式網域的權威來源（邀請信連結靠它）。 |
| preview | `VERCEL_URL` → `NEXTAUTH_URL` | preview 每次部署網址都不同，必須用該次部署的 URL，否則預覽圖指向正式站，測不出這次改動。 |
| development | `NEXTAUTH_URL` → `http://localhost:${PORT ?? 3000}` | 本機。 |

環境判斷同樣沿用 `getAppEnv()`。正式環境什麼都沒設時會 `console.warn`（不 throw，
避免因為一張分享圖讓整站 build 掛掉）。

同時補上 root layout 的 `openGraph` / `twitter` 欄位（原本沒有），暫用 `/app-logo.png`。

---

## 三、變更清單

| 檔案 | 動作 | 說明 |
|---|---|---|
| `src/lib/storage.ts` | **新增** | 上傳儲存分流（Blob / 本機）、大小與型別驗證。回傳 `{ ok } \| { error, status }`，比照 `requirePetAccess` 風格。 |
| `src/lib/siteUrl.ts` | **新增** | `getSiteUrl()`，dev / preview / production 各自解析站台絕對網址。 |
| `src/app/api/upload/route.ts` | 重寫 | 移除 `fs` 直寫，改呼叫 `saveUploadedImage()`。回傳格式 `{ url }` 不變、成功仍為 201。 |
| `src/app/api/instant-analyze/route.ts` | 局部修改 | 移除 `fs`/`path` import 與本地存檔函式，改為 `storeInstantImage()`（非致命）。兩個呼叫點（demo 分支、AI 分支）都已更新。分析邏輯與 prompt 一字未動。 |
| `src/app/layout.tsx` | 局部修改 | 加 `metadataBase` + `openGraph` + `twitter`。 |

**未動任何前端元件**（7 個呼叫端維持原狀），未動 `package.json`、`src/lib/env.ts`、
`src/lib/auth.ts`、`src/lib/prisma.ts`、`scripts/`、四份系統文件。

---

## 四、驗證方式與結果

依指示**未執行 `npm run build`**（避免與並行 agent 互相破壞 `.next/`）。

### 型別與 lint

```
npx tsc --noEmit                      → 通過，無錯誤
npx eslint <上述 5 個檔案>              → 通過，無 error / warning
```

### 本機 fallback 路徑（實跑 dev server + curl）

| # | 情境 | 預期 | 實際 |
|---|---|---|---|
| 1 | 正常 PNG | 201 + `{url}` | ✅ `{"url":"/uploads/upload-1788328518795-syi4luuo.png"}` |
| 2 | text/plain | 415 | ✅ `只接受圖片檔…` |
| 3 | 沒帶 file 欄位 | 400 | ✅ `No file provided` |
| 4 | 0 byte 檔 | 400 | ✅ `檔案是空的…` |
| 5 | 11MB 檔 | 413 | ✅ `檔案過大，請上傳 10MB 以內的圖片` |
| 6 | `application/octet-stream` + `.jpg`（Android 情境） | 201 | ✅ 通過，副檔名判斷生效 |
| 7 | `application/octet-stream` + `.bin` | 415 | ✅ 擋下 |
| 8 | `image/heic` | 201 | ✅ 存成 `.heic` |
| 9 | 存檔後靜態存取 `/uploads/xxx.png` | 200 | ✅ |

測試產生的檔案已從 `public/uploads/` 刪除。

### Blob 路徑（用假 token 驗證分流確實生效）

設 `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_FAKESTORE01_...` 重跑 dev server 後上傳：

```
HTTP 500 {"error":"圖片儲存失敗，請稍後再試"}
server log: [storage] 圖片儲存失敗: Error: Vercel Blob: This store does not exist.
            at async saveUploadedImage (src/lib/storage.ts:122)
```

錯誤來自 Vercel Blob API 本身（不是本機 fs），**證明有 token 時確實走 Blob 分支且
真的打到 Blob 服務**；同一次請求沒有在 `public/uploads/` 留下檔案。
換成真 token 即可正常運作。真 token 的端對端驗證需要 frank 先開 store（見下節）。

### metadataBase

```
curl http://localhost:3000/ | grep og:
→ <meta property="og:url" content="http://localhost:3000"/>
  <meta property="og:image" content="http://localhost:3000/app-logo.png"/>
  <meta property="og:image:width" content="992"/> ...
  <meta name="twitter:card" content="summary_large_image"/>
```

絕對網址已正確展開。

---

## 五、frank 需要配合的事

### 1. 開 Vercel Blob store（**不做的話正式站上傳仍會壞**）

1. 進 Vercel Dashboard → 選 **Dr.Pet / PurePaw 專案** → 上方 **Storage** 分頁。
2. 點 **Create Database** → 選 **Blob** → 命名（例如 `purepaw-uploads`）→ 選區域
   （建議 **Singapore (sin1)** 或 **Tokyo (hnd1)**，離台灣使用者最近）→ Create。
3. 建立後在該 store 的 **Connect Project** 選 Dr.Pet 專案，環境勾 **Production +
   Preview**（Development 可不勾，本機走 fallback）。連接後 Vercel 會**自動注入**
   `BLOB_READ_WRITE_TOKEN`，不需要手動複製貼上。
4. 到 Settings → Environment Variables 確認 `BLOB_READ_WRITE_TOKEN` 已出現。
5. **重新 Deploy 一次**（環境變數變更不會自動套用到既有部署）。
6. 上線後實測：登入 → 設定 → 換寵物頭像 → 應成功且圖片網址為
   `https://<store-id>.public.blob.vercel-storage.com/uploads/...`。

> 免費方案（Hobby）含 1GB 儲存 / 10GB 流量，以目前使用量綽綽有餘。

### 2. 確認正式站的 `NEXTAUTH_URL`

`metadataBase` 在 production 優先讀 `NEXT_PUBLIC_SITE_URL` → `NEXTAUTH_URL`。
`NEXTAUTH_URL` 目前已是邀請信在用的變數，只要它填的是正式網域就不必再多設一個。
若之後想讓分享網域與登入網域不同，再另外設 `NEXT_PUBLIC_SITE_URL`。

### 3.（可選）一張 1200×630 的分享圖

目前 og:image 用 `/app-logo.png`（992×1061，接近正方形）。LINE / Facebook 抓得到，
但版位會被裁切。若要好看，建議請 art-designer 出一張 1200×630 的 `og-image.png` 放
`public/`，再把 `src/app/layout.tsx` 的 `openGraph.images` 換掉即可（一行）。

---

## 六、附帶發現（未處理，建議另立待辦）

1. **`/landing` 的分享預覽圖仍缺 og:image（優先）**
   `src/app/landing/page.tsx` 有自己的 `openGraph` 物件，Next.js 的 metadata 是
   **整個 openGraph 物件覆蓋**父層，所以 landing（最可能被丟到 LINE 群組的頁面）
   目前沒有 og:image。因本次檔案範圍限制未動它。修法為在其 `openGraph` 內補一行：
   ```ts
   images: [{ url: '/app-logo.png', width: 992, height: 1061, alt: 'PurePaw 無敏毛孩' }],
   ```

2. **Vercel Serverless 的 4.5MB request body 上限**
   目前流程是「瀏覽器 → 我方 API → Blob」，整張圖會過 Serverless Function，
   而 Vercel 對 function request body 有 **4.5MB 硬上限**。也就是說上線後
   4.5MB 以上的照片仍會失敗（由平台擋下，回 413）。
   根治方式是改用 `@vercel/blob/client` 的 `upload()` 讓瀏覽器直傳 Blob，
   但那必須改動 7 個前端呼叫端 —— 已超出本次「不動前端」的範圍，建議另開任務。
   短期緩解：前端上傳前先壓縮（canvas resize），順帶省流量。

3. **`/api/upload` 沒有任何身分驗證**
   任何人都能對正式站 POST 圖片並取得公開 URL（改用 Blob 後變成「任何人都能消耗
   我方 Blob 額度」）。其他 API 都有 `auth()` + `requirePetAccess()`，這支沒有。
   本次未加是因為會改變既有行為（未登入流程如 `pet/new` 是否受影響需 PM 確認），
   建議交 security-reviewer 評估後補上 `auth()` 檢查 + 每人上傳頻率限制。

4. **舊 `/uploads/...` 紀錄仍可讀**
   `public/uploads/` 底下 13 張既有圖片是 **git tracked** 的，會隨 build 一起部署成
   靜態檔，因此資料庫既有的 `/uploads/xxx.jpg` 紀錄在正式站仍打得開，不需要資料遷移。
   但把使用者上傳物放進 git 長期不健康（repo 會持續變胖），建議之後把它們搬到 Blob
   並將 `public/uploads/` 加進 `.gitignore`（只留 `.gitkeep`）。

5. **孤兒檔案沒有清理機制**
   換頭像、刪除寵物、刪除即時分析紀錄時，舊圖不會被刪（本機時代如此，Blob 亦然，
   只是現在會持續累積計費容量）。建議之後在刪除流程加上 `del()` 呼叫。
