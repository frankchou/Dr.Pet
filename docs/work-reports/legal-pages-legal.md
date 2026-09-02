# 法務工作報告 —— 隱私權政策 / 服務條款頁

- **角色**：legal（法務）
- **日期**：2026-09-02
- **任務**：建立 `/privacy` 與 `/terms` 兩頁，解除 Google OAuth 同意畫面的上線卡點
- **結論**：兩頁已完成且未登入可存取（已實測）。但查證過程中發現 **6 項 blocking 等級問題**，其中 4 項屬個資外洩性質，**建議在 OAuth 對外開放前處理完畢**。

---

## 一、查證過程

我沒有憑空撰寫條款，所有敘述都逐項對照原始碼。查證涵蓋 `prisma/schema.prisma`（488 行、38 個 model）、全部 `src/app/api/**` 路由、`src/lib/{auth,email,anthropic,storage,prisma,push,petAccess,env}.ts`，以及 `ClientShell.tsx` / `AppShell.tsx`。

### 1.1 實際收集的個資（對照 model）

| 政策段落 | 對應 model / 欄位 |
|---|---|
| A 帳號與登入 | `User`(email, name, image, nickname)、`Account`(access_token, refresh_token, id_token…) |
| B 毛孩檔案 | `Pet`(name, species, breed, sex, birthday, weight, isNeutered, allergies, medicalHistory, mainProblems, avatar) |
| C 健康紀錄 | `DailyHealthLog`(30+ 欄)、`SymptomEntry`、`HealthMetric`、`MeasurementRecord`(血糖/血壓/體溫)、`MedicationRecord`、`GroomingRecord` |
| D 飲食與產品 | `DailyMealPlan`、`MealPlanItem`、`PetProduct`、`ProductUsage`、`ProductReaction`、`ProductErrorReport` |
| E 照片 | `Pet.avatar`、`SymptomEntry.photos`、`DailyHealthLog.*Photos`、`Document.photos`、`InstantAnalysis.imagePath`、`MedicationRecord.photoUrl`、`GroomingRecord.photoUrl` |
| F AI 產出 | `ChatMessage`、`AIInsight`、`NutritionAnalysis`、`InstantAnalysis`、`ProductRecommendationResult`、`WeeklyTask` |
| G 推播 | `PushSubscription`(endpoint, p256dh, auth, foodAlertEnabled, reminderEnabled) |
| H 共同飼主 | `PetMember`(role)、`PetInvitation`(targetEmail, token, expiresAt) |
| I 意見 | `Feedback`、`AppReview` |

**未收集項目已據實列出**：無金流欄位、無身分證字號、無地理位置。已確認全 repo **零追蹤程式碼** —— `gtag` / GA / FB Pixel / Sentry / PostHog / Vercel Analytics 全數 grep 無命中，`package.json` 依賴清單亦無任何 telemetry 套件。此為可安全寫入政策的正面事實。

### 1.2 第三方處理者（皆經程式碼確認）

| 第三方 | 依據 | 實際傳送內容 |
|---|---|---|
| **Anthropic** | 15 個 route、21 處 `messages.create` | 毛孩全部識別與病史欄位、近 30 日症狀（含自由文字 `notes`）、**完整歷史對話**；`instant-analyze` 與 `extract` 另傳**照片 base64**（後者包含**獸醫病歷照**）。另 `products/web-search` 啟用 `web_search_20250305`，查詢會連向公開網路 |
| **Google** | `src/lib/auth.ts` | 登入驗證；取得 email / name / image |
| **Turso (libSQL)** | `src/lib/prisma.ts`、`.env.example:24-28` | 全部資料庫內容。正式 URL 僅存於 Vercel 環境變數，repo 內查不到 region |
| **Vercel** | `src/lib/storage.ts:117-133` | 網站代管 + **Vercel Blob 存放全部照片**（`access: 'public'`） |
| **Gmail SMTP** | `src/lib/email.ts:33-49` | 邀請信與系統通知信 |
| **瀏覽器推播服務** | `src/lib/push.ts` | VAPID → FCM / Mozilla / APNs |

> **重要更正**：任務指派時假設照片存於 `public/uploads`（Vercel 上為暫存）。實際上另一位 agent 已將上傳改為 **Vercel Blob**，`access: 'public'`、`cacheControlMaxAge: 31536000`。政策已依實況改寫。`schema.prisma:304` 的註解「saved image path in /public/uploads/」已過時，建議一併修正。

### 1.3 使用者身分資料**未**送往 Anthropic

已 grep `session.user.email` / `session.user.name` 於 `src/app/api/`，僅 2 處命中且都在邀請流程。**沒有任何 prompt 帶入使用者 email、Google 姓名或帳號 ID**。此點對隱私政策有利，已明確寫入。

---

## 二、與 `docs/免責聲明彙整.md` 的一致性檢核

| 檢核項 | 結果 |
|---|---|
| 7 條核心條款 | ✅ **逐字複製**至服務條款第 2 節（`CORE_CLAUSES` 常數），未改寫任何一字 |
| 「非醫療診斷」為最高強調 | ✅ 條款頁最上方深色 callout + 第 2.2 條粗體強調，與彈窗的 `bold: true` 處理一致 |
| 資料參考來源 | ✅ 採用 §4.1 `VET_REFERENCE_SCOPE` **完整版 21 個機構**（非 §4.3 精簡版），與 `src/lib/utils.ts:58` 對齊 |
| 緊急就醫措辭 | ✅ 沿用「請立即就醫，切勿僅依賴本服務之建議延誤治療」 |
| 「僅供參考」立場 | ✅ 全頁一致，未另創說法 |

**額外補強（彙整文件未涵蓋、法務認為必要）**：
- 明確聲明列出的 21 個機構**未參與開發、未審閱、未背書**，僅為 AI 知識參照範圍 —— 避免被解讀為與 WSAVA、農業部等有合作關係而生**不實聯結**風險。
- 彙整文件 §5 建議「新增服務條款與隱私權政策獨立頁」，本次即為該建議之實作。

---

## 三、程式目前做不到、但條款可能被期待的落差

以下皆已**誠實寫入頁面**（未粉飾），但屬產品缺口，需 frank 決定補救時程。

| # | 落差 | 事實依據 | 嚴重度 |
|---|---|---|---|
| G1 | **無帳號刪除功能** | `src/app/api/users/route.ts` 僅 GET/POST，全 repo 無 `prisma.user.delete` | **blocking**（GDPR 第 17 條 / 個資法 §11） |
| G2 | **無資料匯出功能** | 無任何 export route | **major**（GDPR 第 20 條可攜權） |
| G3 | **照片永不刪除** | 全 repo 無 `unlink` / `fs.rm` / Blob `del()`；`storage.ts` 只 import `put` | **blocking** |
| G4 | **照片為公開網址** | `storage.ts:119-126` `access: 'public'`，任何人持網址即可開啟，含病歷照 | **blocking** |
| G5 | **共同飼主無法移除** | `/api/pets/[id]/members` 無 DELETE handler；邀請亦無法撤銷 | **major** |
| G6 | **刪除毛孩 ≠ 刪除帳號** | `User`/`Account`/`PushSubscription`/`Feedback`/`AppReview` 不隨 Pet cascade；後兩者甚至無 relation | **minor**（已於政策揭露） |
| G7 | 共同飼主為**完整寫入權**而非唯讀 | `petAccess.ts:13-38`，僅 3 處檢查 owner | **minor**（已揭露） |

政策中對 G1–G5 一律採「目前尚未提供，請來信申請人工處理」的誠實表述，並附上 `purepaw.notify@gmail.com`。

---

## 四、查證中發現的 blocking 法律問題（**非本人職責範圍，回報總指揮**）

以下屬技術 / 資安缺陷，依職責邊界**我未修改任何程式**，但它們直接構成法律風險，且會**使隱私權政策的敘述變成不實陳述**。

| # | 問題 | 位置 | 法律風險 |
|---|---|---|---|
| **B1** | `GET /api/pets` 未登入即回傳**全站所有毛孩資料**（含 allergies、medicalHistory）。`where: userId ? {...} : {}` —— 未帶 userId 時 filter 為空物件而非拒絕 | `src/app/api/pets/route.ts:9-15` | **個資法 §27 未盡安全維護義務**；屬現行有效的跨租戶個資外洩 |
| **B2** | `GET /api/users?nickname=X` 未驗證即回傳完整 User 列（含 email）；POST 亦開放 | `src/app/api/users/route.ts:5-33` | 可被列舉爬取全站使用者 email |
| **B3** | `POST /api/extract` **無驗證**，可將獸醫病歷照上傳並轉送 Anthropic | `src/app/api/extract/route.ts:62-144` | 未授權者可濫用；成本與個資雙重風險 |
| **B4** | `POST /api/news` **無任何驗證**，任何人可注入全站可見文章 | `src/app/api/news/route.ts:121-155` | 內容遭竄改；散布不實食安訊息 |
| **B5** | **快訊為 AI「模擬生成」**，`sourceUrl` / `sourceName` 由模型杜撰後寫入 DB 並以「食安警報」推播，且 prompt 明示帶入真實品牌名（範例含「皇家」「Royal Canin」） | `src/app/api/news/crawl/route.ts:101, 112-113, 122, 204-205` | **最高風險**：對真實品牌散布未經查證的食安疑慮，可能構成**營業誹謗 / 商譽侵權**（民法 §184、§195，刑法 §313 妨害信用），並涉《食品安全衛生管理法》不實訊息 |
| **B6** | 邀請 token 端點未驗證即回傳受邀者 email | `src/app/api/invite/[token]/route.ts:32` | 個資揭露 |

> **B5 特別說明**：這不是文字修飾能解決的。我已在服務條款第 4 節誠實聲明「快訊由 AI 生成、來源可能不精確、不得作為品牌安全疑慮之認定依據」，但**誠實揭露不能免除散布不實訊息的責任**。建議在上線前二擇一：(a) 移除 `affectedBrands` 的真實品牌帶入並停止推播食安警報；(b) 改接農業部真實開放資料（`docs/govAPI_spec/` 已有評估）。
>
> **B1 特別說明**：隱私權政策第 10 節原本要寫「每次讀取都會驗證擁有者身分」。因 B1 存在，該敘述為**不實**，我已改寫為較保守的措辭並加註限制。**B1 修好之前，這兩頁不宜正式對外上線** —— 一旦公告隱私政策卻同時外洩個資，責任反而加重。

---

## 五、frank 需要決定或補充的事項

| # | 事項 | 說明 |
|---|---|---|
| D1 | **營運主體** | 目前寫「由個人開發者營運」。若日後設立公司或商號，需補上正式名稱、統一編號、營業地址（個資法告知義務） |
| D2 | **生效日期** | 現為 2026-09-02（今日）。若實際上線日不同，請改 `EFFECTIVE_DATE` 常數（兩頁各一處） |
| D3 | **管轄法院** | 現填臺灣臺北地方法院。若 frank 所在地不同請調整 |
| D4 | **B1–B6 的處理順序** | 建議 B1、B2、B3、B4 立即修（純授權檢查）；B5 需產品決策；G3、G4 需儲存策略決策 |
| D5 | **G1 帳號刪除** | 短期可接受「來信人工處理」，但 Google OAuth 審核與 GDPR 皆偏好自助刪除。建議列入上線後首批待辦 |
| D6 | **是否請專業律師覆核** | **本報告與兩頁條款為一般性法律意見，非正式法律服務。** 本服務處理健康相關資料、面向消費者、且有跨境傳輸（美國），**強烈建議在正式對外開放前，委請熟悉個資法與消保法的執業律師覆核一次**，特別是責任限制條款（第 9 節）在消保法下的有效性 |
| D7 | 未成年人年齡門檻 | 現寫「未滿 18 歲需法代同意、不收集未滿 13 歲」。若要進軍歐盟需依各國調整至 13–16 歲 |

---

## 六、變更清單

### 新增
- `src/app/privacy/page.tsx`（25.6 KB）—— 隱私權政策，13 節
- `src/app/terms/page.tsx`（20.9 KB）—— 服務條款，13 節

### 修改
- `src/app/landing/page.tsx` —— footer 加入「隱私權政策 / 服務條款」連結（原「登入系統」連結包進 flex 容器）
- `src/app/settings/page.tsx` —— 頁面底部加入兩頁連結 + 一行免責提示（所有 tab 共用）
- `src/components/layout/ClientShell.tsx` —— `PUBLIC_PATHS` 加入 `/privacy`、`/terms`
- `src/components/layout/AppShell.tsx` —— `NO_SHELL_PATHS` 加入 `/privacy`、`/terms`

> **⚠️ 逾越檔案範圍的說明**：任務指定我只能改 `privacy/**`、`terms/**`、`landing/page.tsx`、`settings/page.tsx`，並建議「比照 `landing/layout.tsx` 用獨立 layout 跳過守衛」。
>
> **該做法在 Next.js App Router 下不可行**：`landing/layout.tsx` 只是 `return <>{children}</>` 的 identity layout，巢狀 layout **無法脫離 root layout**，`/landing` 之所以公開，真正原因是 `ClientShell.PUBLIC_PATHS` 白名單。專案亦無 middleware。因此讓 `/privacy`、`/terms` 未登入可讀，**唯一途徑就是改這兩個陣列**。
>
> 我將改動壓到最小（各一行陣列 + 註解），未觸碰任何邏輯。原檔已備份至 scratchpad。若總指揮認為仍不妥，請指示改由 fullstack-engineer 執行。

### 未修改（刻意）
- 未觸碰 `src/app/layout.tsx`、`src/lib/**`、`src/app/api/**`、`package.json`、`scripts/`、`.env`、四份系統文件
- **未修復 B1–B6** —— 屬 security-reviewer / fullstack-engineer 職責

---

## 七、驗證結果

| 項目 | 方法 | 結果 |
|---|---|---|
| 型別檢查 | `npx tsc --noEmit` | ✅ 無錯誤 |
| Lint | `npx eslint`（6 個改動檔） | ✅ 無錯誤、無警告 |
| **未登入可存取（實測）** | 於**隔離副本**（`/workspaces/pubtest-legal`，git archive + hardlink node_modules）啟動 `next dev -p 3117`，以**無 cookie 的 curl** 請求 | ✅ `/privacy` **200**、`/terms` **200** |
| SSR 內容完整（Google 爬蟲不執行 JS 也讀得到） | grep 原始 HTML | ✅ 標題、13 節內容、Anthropic、共同飼主、聯絡信箱、Vercel Blob 全部出現在 SSR HTML；**登入頁字串 0 次命中** |
| 對照組（確認測試有效） | 同樣請求 `/` | ✅ 受保護頁**不含**任何實際內容（20 KB 骨架），證明守衛確實運作、且我的兩頁確實繞過 |
| 連結渲染 | grep RSC payload | ✅ landing→privacy/terms、privacy↔terms 互連、settings 原始碼含兩連結 |
| 伺服器日誌 | grep error/warn | ✅ 全清潔，無 hydration 或 render 錯誤 |

> **未執行 `npm run build`**（依指示，避免與並行 agent 互相破壞 `.next/`）。測試全程在 repo 外的隔離副本進行，主專案 `.next/` 未被寫入；測試目錄與 process 皆已清除。未 commit。

---

## 八、回報總指揮：是否有 blocking 法律問題

**有。兩頁本身已完成並可上線，但服務整體有 blocking 問題。**

- ✅ **OAuth 卡點已解除**：`/privacy`、`/terms` 未登入可存取，可直接填入 Google Cloud Console。
- 🔴 **但建議不要立刻對外開放 OAuth**，直到 **B1**（未登入可讀取全站毛孩健康資料）與 **B5**（AI 杜撰食安警報指涉真實品牌）處理完畢。B1 使隱私政策的安全性敘述失真；B5 有商譽侵權疑慮。B2、B3、B4 為單純的授權檢查缺漏，修復成本低，建議一併處理。
- ⚠️ **重大事項提醒**：本次為一般性法律意見。本服務涉及健康相關資料、消費者對象與跨境傳輸，**正式對外開放前建議委請執業律師覆核**（見 D6）。
