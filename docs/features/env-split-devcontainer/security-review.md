# 資安審查：開發／正式環境設定分離（env-split-devcontainer）

- 審查日期：2026-08-24
- 審查者：security-reviewer
- 審查範圍：`.devcontainer/devcontainer.json`、`.devcontainer/setup.sh`、`.env.example`、`src/lib/prisma.ts`、`src/lib/env.ts`、`package.json`、`README.md`
- 連帶檢視（因防呆設計互為備援）：`prisma.config.ts`、`prisma/seed.ts`、`scripts/seed-turso.mjs`、`scripts/migrate-turso.mjs`、`src/lib/auth.ts`、兩支 cron 端點
- 結論：**無 Critical；有 2 項 High 應在合併前處理**

> ⚠️ **審查快照**：審查期間 `src/lib/prisma.ts`、`src/lib/env.ts`、`scripts/seed-turso.mjs`、`scripts/migrate-turso.mjs` 曾被平行修改。本報告的結論以 **2026-08-24 04:36** 的檔案狀態為準：
> `prisma.ts` `51c737cd1495`／`env.ts` `0a2467cdd8a0`／`seed-turso.mjs` `7c3e821a0a7f`／`migrate-turso.mjs` `5310a53e0ee2`／`seed.ts` `f22ec857659f`／`prisma.config.ts` `5fc318ad80ad`／`setup.sh` `<審查期間經二次改寫，行號以最終版為準>`／`.env.example` `4bbb0726e041`／`auth.ts` `c6f9c6f68874`／`README.md` `38533906baf7`（md5 前 12 碼）。

---

## 一、檢查項目清單

| # | 檢查項目 | 結果 |
|---|---|---|
| 1 | setup.sh 是否把機密印到 stdout / log | 部分通過（環境變數檢查邏輯**乾淨、已實測**；另有 M1 / L1 兩項洩漏路徑未修）|
| 2 | 自動產生密鑰的亂數強度 | 通過（強度足夠；原靜默失敗問題已於審查期間修復）|
| 3 | `.env.example` 是否含真實憑證 | 通過 |
| 4 | 前後端環境變數分離（`NEXT_PUBLIC_` 不含機密）| 通過 |
| 5 | `.gitignore` 涵蓋範圍與 git 追蹤狀態 | 未通過（H1、M6）|
| 6 | git 歷史是否曾出現 `.env` 或憑證 | 通過（歷史乾淨）|
| 7 | prisma.ts 防呆錯誤訊息是否洩漏認證資訊 | **審查期間已修復**（原 M3，見下）|
| 8 | README / .env.example 指引是否安全 | 未通過（M5、M7）|
| 9 | 防呆是否真能阻擋「誤連正式庫」——繞過路徑盤點 | 未通過（H2、M8、M9）|
| 10 | 對外端點身分驗證（cron）| 通過（fail-closed）|
| 11 | 測試 / Debug 介面在正式環境是否關閉 | 部分通過（M10）|
| 12 | 授權控制與最小權限 | 本次改動未涉及，無新增問題 |
| 13 | Firestore 安全規則 | **不適用**：本專案為 Prisma + libSQL/Turso，無 Firestore |
| 14 | 輸入驗證 / Injection | 本次改動未涉及；連帶檢視腳本無使用者可控輸入，無問題 |
| 15 | 敏感資料加密存放與傳輸 | 通過（Turso `libsql://` 走 TLS、Vercel HTTPS）|

---

## 二、發現問題

### H1（High）版控中的 `dev.db` 會把 OAuth refresh token 帶進 git

- 位置：`dev.db`、`prisma/dev.db`、`.gitignore`（無對應規則）、`prisma/schema.prisma:46-63`、`.devcontainer/setup.sh:82-86`
- 查證：
  - `git ls-files` 顯示 `dev.db` 與 `prisma/dev.db` **都在版控中**；`git check-ignore` 確認兩者**未被忽略**；`git status` 顯示 `M dev.db`，代表它會被例行性重新提交。
  - `prisma/schema.prisma:52-57` 的 `Account` model 存 `refresh_token` / `access_token` / `id_token`。
  - 目前 HEAD 版與工作目錄的 `Account` 與 `PushSubscription` 皆為 0 筆，`User` 僅 demo 帳號有 email，**目前尚未實際外洩任何憑證**。
  - `setup.sh:101-105` 每次環境初始化都會 migrate + seed 寫入這個受追蹤的檔案；`setup.sh:99` 的註解「dev.db 目前是 git 追蹤檔，clone 下來就存在」顯示**團隊已知此事實但未處理**。
- 風險：只要任一開發者在本機用真實 Google 帳號登入一次再提交，該帳號的 OAuth refresh token 就會永久寫進 git 歷史。這正是本次改動宣稱要防堵的「正式憑證外洩到版控」。
- 建議修法：
  1. `.gitignore` 加入 `dev.db`、`dev.db-journal`、`prisma/dev.db`。
  2. `git rm --cached dev.db prisma/dev.db` 停止追蹤（現有歷史 Account 為 0 筆，無需改寫歷史）。
  3. `dev.db` 由 `npm run db:reset` 產生即可，不需進版控。

### H2（High）Prisma CLI 不受任何防呆保護；`seed-turso.mjs` 對正式庫仍無防護，且 prisma.ts 註解誤述其存在

- 位置：`prisma.config.ts:1,11`、`scripts/seed-turso.mjs:14-30`、`scripts/migrate-turso.mjs:15-31`、`src/lib/prisma.ts:27-31`、`README.md:28`

**(a) Prisma CLI 完全繞過防呆（未被本次改動處理）**

`prisma.config.ts:1` `import "dotenv/config"`、`:11` 直接把 `process.env.DATABASE_URL` 餵給 datasource。因此 `npx prisma migrate deploy` / `db push` / `migrate reset` / `studio` **不經過 `src/lib/prisma.ts`**，`.env` 若指向遠端就直連正式庫，無任何攔截。只有 `package.json:11-14` 的 `npm run db:*` 包裝（寫死 `file:./dev.db`）安全。`prisma db seed` 是唯一被 `prisma/seed.ts:21-27` 覆蓋到的 CLI 路徑。

值得注意的是，`src/lib/prisma.ts:28-31` 新增的註解列出了三條「各有獨立守衛」的路徑（seed.ts、migrate-turso.mjs、seed-turso.mjs），**卻沒有列出 Prisma CLI 這第四條路徑**——而它才是唯一完全無防護的那條。

**(b) `seed-turso.mjs` 對正式庫的防護仍然不存在，且註解誤述**

審查期間 `scripts/seed-turso.mjs:19-28` 與 `scripts/migrate-turso.mjs:20-29` 新增了守衛，但方向是**「拒絕 `file:`、只准遠端」**——目的是避免腳本靜默地打到本機檔案。這解決的是另一個問題，**完全沒有降低「把 dev.db 測試資料灌進正式庫」的風險，反而強制要求目標必須是遠端**。

`scripts/seed-turso.mjs` 目前仍會：`:9` `config()` 讀 `.env` → `:30` 建連線 → `:52` 起把 dev.db 每一列 INSERT 進 `DATABASE_URL` 指向的資料庫。無目標確認、無二次確認，唯一保護仍是 `README.md:89` 的文字警告。這與 `src/lib/prisma.ts:25` 描述的歷史事故完全同型。

同時，`src/lib/prisma.ts:30-31` 把這兩支腳本的守衛與 `seed.ts` 的 `file:` 檢查並列為「各有獨立守衛，缺一不可」。**這段敘述會誤導讀者以為 `seed-turso.mjs` 已受保護、不會誤寫正式庫——實際上它的守衛方向相反，對正式庫毫無防護。** 更精確的註解反而更容易讓人放心，因此這比舊版的模糊敘述更危險。

**(c) `README.md:28`** 宣稱防呆「涵蓋所有 API、script 與 seed 路徑，確保本機不可能誤寫正式庫」——經查證與事實不符。

- 建議修法：
  1. **刪除 `scripts/seed-turso.mjs`**。正式庫不該灌測試資料，留著就是待擊發的槍。若必須保留，加入「目標 host 必須與 `CONFIRM_PROD_SEED` 環境變數所指名的 host 相符」才放行的二次確認。
  2. 在 `prisma.config.ts` 的 `url` 解析處加入與 `assertLocalDbInDevEnv` 同一道防呆，把 Prisma CLI 補進防護網。
  3. 修正 `src/lib/prisma.ts:27-31` 的註解：明確寫出兩支 turso 腳本的守衛「只保證目標是遠端，不保證目標不是正式庫」，並補上 Prisma CLI 這條無防護路徑。
  4. 修正 `README.md:28` 的覆蓋範圍敘述。

### M1（Medium）VAPID 私鑰以命令列參數傳遞，暴露於行程列表

- 位置：`.devcontainer/setup.sh:58-59`（審查期間腳本改寫，行號已更新；**此問題未被修復**）
- 查證：`node -e "...process.argv[1]..." "$VAPID_JSON"` 中的 `$VAPID_JSON` 含 `privateKey`。實測確認 argv 可經 `/proc/<pid>/cmdline`（及 `ps aux`）被同機任何行程讀取。改寫後的版本仍維持此寫法。
- 建議修法：改用環境變數傳遞，例如 `VAPID_JSON="$VAPID_JSON" node -e "...process.env.VAPID_JSON..."`，或一次在 node 內產生並直接寫檔，不經 shell 變數。

### M2（Medium）產生的 `.env` 權限為 666，全機可讀寫

- 位置：`.devcontainer/setup.sh:66-94`（改寫後為 `{ ... } > .env`；**此問題未被修復**）
- 查證：`stat` 顯示 `.env` 為 `666`（`-rw-rw-rw-`）。重新 grep 確認腳本內**無任何 `chmod` 或 `umask`**。
- 建議修法：`} > .env` 之後緊接 `chmod 600 .env`（建檔前先 `umask 077` 更保險）。

### M3（原 Medium，審查期間已修復）prisma.ts 防呆錯誤訊息的認證資訊洩漏

- 位置：`src/lib/prisma.ts:11-18`（`safeHost()`）、`:41`
- **原問題**：舊版 `url.replace(/^(\w+:\/\/[^/?#]*).*$/, '$1')` 會保留 userinfo，且 regex 不匹配時 `String.replace` 原樣回傳整串。實測：
  - `libsql://user:P4ssw0rd@db-org.turso.io` → 原樣輸出（洩漏帳密）
  - `postgres:user:pw@host/db`（無 `//`）→ 原樣輸出（fail-open）
- **現況：已修復。** 新版改用 `new URL()` 解析後只取 `protocol + host`，parse 失敗回傳固定字串 `'(無法解析的 DATABASE_URL)'`。重新實測全部通過：

  | 輸入 | 輸出 | 判定 |
  |---|---|---|
  | `libsql://db-org.turso.io?authToken=SECRETTOKEN` | `libsql://db-org.turso.io` | 安全 |
  | `libsql://user:P4ssw0rd@db-org.turso.io` | `libsql://db-org.turso.io` | 安全（userinfo 已移除）|
  | `https://user:tok@db.turso.io/x?authToken=AAA` | `https://db.turso.io` | 安全 |
  | `postgres:user:pw@host/db` | `postgres:` | 安全 |
  | `not a url at all` | `(無法解析的 DATABASE_URL)` | 安全（fail-closed）|

- 判定：**此項已關閉，無需再修**。`URL.host` 不含 userinfo、不含 query，修法正確。

### M4（Medium）`prisma/seed.ts` 直接印出未遮蔽的 `DATABASE_URL`

- 位置：`prisma/seed.ts:23`
- 程式碼：`console.error(\`   目前 DATABASE_URL = ${process.env.DATABASE_URL}\`)`
- 查證：完全未遮蔽，`?authToken=...` 會原樣印進 stdout / CI log。`src/lib/prisma.ts:12` 明確把 seed.ts 列為同一道防呆的備援，故納入本次審查範圍。
- 建議修法：套用與 M3 相同的遮蔽函式，或只印 scheme（例：`偵測到非 file: 的 DATABASE_URL（scheme=libsql）`）。

### M5（Medium）README 教操作者把正式 Turso token 打在命令列上

- 位置：`README.md:86`
- 內容：`DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." node scripts/migrate-turso.mjs`
- 風險：正式庫 token 會明文寫進 `~/.bash_history`，並在腳本執行期間暴露於 `/proc/<pid>/cmdline`（已實測 argv 可見）。
- 建議修法：正式 migration 改由 CI / Vercel 以 secret store 注入執行；若必須手動，改為 `read -rs DATABASE_AUTH_TOKEN && export DATABASE_AUTH_TOKEN`，並提醒用完 `unset`。

### M6（Medium）`.env.example` 與 `.devcontainer/` 尚未納入版控

- 位置：`.env.example`、`.devcontainer/`
- 查證：`git status` 顯示 `.devcontainer/` 為 `??`，`.env.example` 亦未被追蹤。`.gitignore:36` 的 `!.env.example` 反向規則正確（`git check-ignore` 確認未被忽略），但檔案本身還沒 `git add`。
- 風險：驗收條件「`.env.example` 應該被追蹤」目前未達成，新環境無範本可循。
- 建議修法：合併前 `git add .env.example .devcontainer/`。

### M7（Medium）逃生門 `ALLOW_REMOTE_DB` 具黏性且無任何提示

- 位置：`src/lib/prisma.ts:21`、`.env.example:71-74`、`README.md:29`
- 查證：`process.env.ALLOW_REMOTE_DB === 'true'` 一旦寫進 `.env`，之後每次執行都靜默生效——無警告 log、無期限、無二次確認。文件只寫「用完立刻移除」，全靠人自律。
- 補充：搭配 `src/lib/env.ts:31` 的 fallback，逃生門開啟後本機行程會被判定為 `production`（demo 登入關閉、信件標記 `[正式]`），行為一致但也代表本機 session 對整個 app 而言與正式環境無從分辨。
- 建議修法：逃生門生效時每次建立連線都 `console.warn` 醒目告警；並要求同時提供第二個變數明確指名目標 host（例：`ALLOW_REMOTE_DB_HOST=<host>` 需與實際 URL 相符）才放行。

### M8（Medium，審查期間有變動但仍未關閉）`isOnVercel()` 判斷過寬，`vercel dev` 可解除防呆

- 位置：`src/lib/env.ts:22-24`、`src/lib/prisma.ts:39`
- 現況程式碼：`return Boolean(process.env.VERCEL_ENV || process.env.VERCEL)`
- 查證（實測各組合下防呆是否啟用）：

  | 環境變數 | `isOnVercel()` | 防呆 |
  |---|---|---|
  | `VERCEL_ENV=production` | true | 關閉（正確）|
  | `VERCEL_ENV=preview` | true | 關閉（正確）|
  | `VERCEL_ENV=development` | true | **關閉（問題所在）** |
  | `VERCEL=1` | true | 關閉 |
  | 皆未設定 | false | 啟用（正確）|

- 說明：審查期間此判斷從 `prisma.ts` 抽到 `env.ts` 並加入 `|| process.env.VERCEL`，註解說明是為了避免 Vercel 專案關閉「Automatically expose System Environment Variables」時正式站全掛——**這個可用性考量是合理的**，不應直接改回只認 `VERCEL_ENV`。
- **但風險仍未關閉**：`VERCEL_ENV=development`（即本機執行 `vercel dev` 時的值）依然會關掉防呆。而 `vercel env pull` 是 Vercel 官方標準流程，會把正式環境變數（含 `DATABASE_URL` / `DATABASE_AUTH_TOKEN`）寫進本機 `.env`。兩個標準指令組合起來，就在本機無聲重現了防呆想阻止的情境。
- 建議修法（兼顧可用性與防護）：
  ```ts
  export function isOnVercel(): boolean {
    const e = process.env.VERCEL_ENV
    if (e === 'production' || e === 'preview') return true
    if (e === 'development') return false        // vercel dev：視同本機，防呆要生效
    return process.env.VERCEL === '1'            // VERCEL_ENV 未曝光時的 fallback
  }
  ```
  並在 README 明確警告本專案不要使用 `vercel env pull`。

### M9（Medium）demo 登入口只靠裸環境變數把關，未使用新的 `isProductionEnv()`

- 位置：`src/lib/auth.ts:6-7,17`、`.devcontainer/setup.sh:71-72`、`.env.example:68-69`
- 查證：`src/lib/auth.ts:17` 以 `process.env.DEMO_ENABLED === 'true'` 決定是否掛上 Credentials provider（未設即不掛，fail-closed，方向正確）。但密碼 `demo1234` 硬寫在 `src/lib/auth.ts:7`，而 setup.sh 與 .env.example 都預設把旗標設為 `"true"`。
- 風險：Vercel 上只要有人把 `DEMO_ENABLED` 的 scope 誤設成「All Environments」而非僅 Preview，正式站就會出現一個已知密碼的登入口，且無任何程式層防線。本次改動既然新增了 `src/lib/env.ts` 來集中環境判斷，這裡正是它該被使用的地方。
- 建議修法：改為 `process.env.DEMO_ENABLED === 'true' && !isProductionEnv()`，`ClientShell.tsx:301` 的前端旗標同理由伺服器端傳入而非直接讀 `NEXT_PUBLIC_DEMO_ENABLED`。

### M10（原 Medium，審查期間已修復）密鑰產生失敗時靜默寫入空值卻回報成功

- 位置：`.devcontainer/setup.sh:45-60`
- **原問題**：舊版把 `$(openssl rand ...)` 直接寫在 heredoc 內。實測確認 `set -euo pipefail` **抓不到 heredoc 內命令替換的失敗**——`openssl` 不存在時 `.env` 會寫成 `AUTH_SECRET=""`、`CRON_SECRET=""`，而腳本仍印出「✔ .env 已建立（… 自動產生）」的假成功訊息。
- **現況：已修復。** 新版把機密在 heredoc 之外先求值並逐一驗證：`:48` 先確認 `openssl` 存在、`:50-51` / `:53-54` 對 `AUTH_SECRET` / `CRON_SECRET` 各做「指令失敗」與「結果為空」雙重檢查、`:56-60` 對 VAPID 同理，任一失敗即 `die` 中止。`:95` 的成功訊息也改為「自動產生並驗證非空」。
- 附帶改善（非本次審查要求，但值得肯定）：`:21` 新增 `esc()` 對值中的 `\` 與 `"` 做跳脫，避免含特殊字元的機密（`GMAIL_APP_PASSWORD` / `GOOGLE_CLIENT_SECRET` 最可能）破壞 `.env` 的引號結構——這本身也是一個潛在的機密解析錯誤來源，已一併堵掉。
- 判定：**此項已關閉**。

### L1（Low）setup.sh 把 demo 帳密印進 postCreate log

- 位置：`.devcontainer/setup.sh:142`（**此問題未被修復**）
- 內容：`測試帳號：demo@drpet.com / demo1234`
- 風險：Codespaces 的 postCreate log 會保留。此為 dev 專用帳號且與 `src/lib/auth.ts:6-7` 同值，本身非正式憑證，但配合 M9 一旦 demo 旗標誤開到正式站，這組帳密的散布範圍就變得重要。
- 建議修法：改為「測試帳號請見 README」，不在 log 印出密碼。

### L2（Low）正式 Turso 主機名稱已進版控

- 位置：`docs/work-reports/phase0-deadcode-seed-fullstack.md`
- 查證：全歷史掃描發現 `libsql://purepaw-prod-frankchou.aws-ap-northeast-1.turso.io`。**僅主機名稱，無 token**；Turso 需 auth token 才能連線，故不可直接利用。
- 建議修法：文件一律以 `libsql://<prod-host>` 佔位符取代，減少不必要的攻擊面揭露。

### L3（Low）cron token 比對非常數時間

- 位置：`src/app/api/news/crawl/route.ts:79`、`src/app/api/reminders/check/route.ts:10`
- 查證：`request.headers.get('authorization') === \`Bearer ${cronSecret}\``。兩處都在 `cronSecret` 未設時回傳 `false`（fail-closed，正確）。
- 風險：理論上的時序側通道，經網路抖動實務上難以利用。
- 建議修法：改用 `crypto.timingSafeEqual`，成本極低。

### L4（Info）`next-auth` 使用 beta 版本

- 位置：`package.json:23` — `"next-auth": "^5.0.0-beta.31"`
- 說明：非本次改動引入。beta 版本位於身分驗證這個安全關鍵位置，建議追蹤 v5 正式版釋出並排入升級。

---

## 三、通過項目的查證紀錄

- **setup.sh 環境變數檢查邏輯（`setup.sh:109-131`）乾淨**：以帶 canary 值的環境變數對新舊兩版各實測一次，`check()` 內的 node 腳本只 `process.stdout.write(v ? "1" : "")`，輸出僅有變數名稱與說明，**確認不印任何值**（canary 命中次數 0）；未設定時的 `warn` 分支同樣只印名稱。改寫後更進一步把變數名以 argv 傳入而非內插進 JS 原始碼（`:112-123`），消除了字串內插的隱患，並擴充為同時檢查 `AUTH_SECRET` / `CRON_SECRET` / `VAPID_PRIVATE_KEY`。**此項為本次改動中處理得最好的部分。**
- **亂數強度足夠**：`setup.sh:50` `openssl rand -base64 32`（256-bit CSPRNG）、`:53` `openssl rand -hex 32`（256-bit）、`:56` `web-push` 的 `generateVAPIDKeys()`（Node crypto P-256 ECDH 金鑰對）。三者強度均達業界標準，**無弱亂數問題**。
- **`.env.example` 無真實憑證**：所有機密欄位皆為空字串——`:26` `DATABASE_AUTH_TOKEN`、`:31` `AUTH_SECRET`、`:39-40` Google、`:44` Anthropic、`:49` `GMAIL_APP_PASSWORD`、`:55-57` VAPID、`:63` `CRON_SECRET`。非空的預設值皆非機密：`:24` `file:./dev.db`、`:34` localhost、`:48`/`:58` `purepaw.notify@gmail.com`（營運信箱位址，非機密）、`:68-69` demo 旗標。
- **前後端變數分離正確**：帶 `NEXT_PUBLIC_` 前綴的只有 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（VAPID 公鑰本就設計為公開）與 `NEXT_PUBLIC_DEMO_ENABLED`（布林旗標）。**無任何機密帶 `NEXT_PUBLIC_` 前綴**。
- **`.gitignore` 規則正確**：`:34` `.env*` 搭配 `:36` `!.env.example`。以 `git check-ignore -v` 逐一驗證：`.env` 被忽略、`.env.local` 被忽略、`.env.example` 未被忽略（可追蹤，符合預期）。
- **git 歷史乾淨**：`git ls-files` 無任何 `.env` 檔；`git log --all --diff-filter=A` 全歷史**從未新增過任何 `.env` 檔**；全歷史 diff 掃描 `sk-ant-` / `AIza` / JWT 樣式**均無命中**。
- **`npm run db:*` 確實安全**：`package.json:11-14` 四個指令都以前綴寫死 `DATABASE_URL="file:./dev.db"`，且 `prisma.config.ts` 的 `dotenv/config` 不會覆蓋既有環境變數，故 `README.md:75` 的敘述經查證屬實。
- **cron 端點 fail-closed**：`CRON_SECRET` 未設時兩支端點皆直接拒絕，不會退化成無驗證。
- **Firestore 規則不適用**：本專案無 Firestore，資料層為 Prisma + libSQL/Turso。此項非略過，而是不適用。

---

## 四、整體評估：兩大風險是否真的被擋住

**風險 A：開發環境誤連正式資料庫 —— 部分擋住**

App runtime 路徑（所有 API route）確實被 `src/lib/prisma.ts:18-32` 這道唯一入口攔住，方向正確。但有四條已查證的繞過路徑：H2（Prisma CLI 完全不經此檔）、H2（`seed-turso.mjs` 無防護且僅靠 README 警告）、M8（`VERCEL_ENV` 任意值即解除）、M7（逃生門黏性且靜默）。其中 H2 的兩條正是 `src/lib/prisma.ts:10` 所記載歷史事故的同型路徑，防呆並未覆蓋到它。

**風險 B：正式憑證外洩到版控 —— 大致擋住**

`.gitignore` 規則正確、git 歷史完全乾淨，這部分做得紮實。剩餘缺口為：H1（`dev.db` 受追蹤且 `Account` 表結構會存 OAuth token）、M6（`.env.example` 與 `.devcontainer/` 尚未 `git add`）、M5（README 教人把正式 token 打進 shell history）、M4（seed.ts 把完整 URL 印進 log）。

---

## 五、上線阻擋判定

**無 Critical。有 2 項 High，建議列為合併／上線前必修：**

| 編號 | 問題 | 阻擋理由 |
|---|---|---|
| H1 | `dev.db` / `prisma/dev.db` 受版控，且 `Account` 表結構存 OAuth token | 一次真實 Google 登入 + commit 即造成不可逆的憑證外洩；`setup.sh` 每次執行都會寫入該檔 |
| H2 | Prisma CLI 完全不受防呆保護；`seed-turso.mjs` 對正式庫仍無防護，且 `prisma.ts:30-31` 註解誤述其守衛 | 本次改動的核心目標未完全達成；註解誤述會讓操作者誤以為已受保護 |

### 審查期間已修復（無需再處理）

| 原編號 | 問題 | 修復位置 |
|---|---|---|
| M3 | prisma.ts 錯誤訊息洩漏 URL 中的 userinfo，且 regex 不匹配時 fail-open | `src/lib/prisma.ts:11-18` 改用 `new URL()`，已重新實測全數通過 |
| M10 | 密鑰產生失敗時靜默寫入空值卻回報成功 | `.devcontainer/setup.sh:45-60` 移出 heredoc 並加 `die` 驗證 |

### 仍待處理

- **Medium**：M1（VAPID 私鑰經 argv 曝露）、M2（`.env` 權限 666）、M4（seed.ts 印出未遮蔽 URL）、M5（README 教人把正式 token 打在命令列）、M6（`.env.example` / `.devcontainer/` 尚未 `git add`）、M7（逃生門黏性且靜默）、M8（`isOnVercel()` 對 `VERCEL_ENV=development` 仍放行）、M9（demo 登入口未用 `isProductionEnv()`）
- **Low**：L1（demo 密碼印進 log）、L2（正式 Turso host 進版控）、L3（cron token 非常數時間比對）、L4（`next-auth` beta）

M1–M9 多為數行改動，建議同批修復；L1–L4 可排入後續。修復 H1、H2 後，本設計即可有效達成「開發／正式環境設定分離」的目標。

### 一句話結論

方向與骨架都對，`.gitignore` 與 git 歷史經全面掃描確認乾淨，環境變數檢查邏輯也確實只報有無不印值；但**「防呆只覆蓋 app runtime、不覆蓋 Prisma CLI 與 `seed-turso.mjs`」與「`dev.db` 帶著 OAuth token 欄位待在版控裡」這兩點，正好各自對應本次改動想擋的兩大風險，必須先補上。**
