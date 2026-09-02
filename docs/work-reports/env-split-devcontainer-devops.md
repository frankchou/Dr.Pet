# work-report｜開發／正式環境設定分離 + 開發環境自動初始化

**角色：** devops（實作）｜**日期：** 2026-08-24｜**指派人：** frank
**需求原文：** 「我要能夠讓有兩種環境設定 一個 prod 一個 dev」

---

## 1. 問題盤點

新開 Codespace 後專案完全無法運作，逐項查證根因：

| 現象 | 根因 |
|---|---|
| `npm run build` 失敗 | ① Prisma 7 起 `@prisma/client` **移除 postinstall 自動 generate**（已查證其 `package.json` 無 postinstall、`node_modules/.prisma/` 不存在）② `@tailwindcss/oxide` 缺 linux 原生二進位 |
| 所有憑證消失 | `.env` 不存在，Codespaces Secrets 也未設定 |
| 環境無法自動就緒 | 專案沒有 `.devcontainer/`，Codespace 只跑了 Oryx 的自動 `npm install` |
| 文件誤導 | `docs/系統機制.md` 稱「正式環境用 `.env` 的 Turso」，但 `.gitignore` 排除 `.env*`，該檔永遠到不了 Vercel |

## 2. 設計決策

**採「同一變數名、依環境給不同值」，不採 `DATABASE_URL_PROD` / `_DEV` 雙變數。**
理由：雙變數會讓程式碼需要自己選擇連哪個，選錯就是災難；單變數則把選擇權交給部署平台，程式碼無從選錯。

**Preview 歸在 dev 家族。** Preview 若連正式庫，測試資料會污染正式環境；歸 dev 後資料庫、demo 入口、信件標題一致比照測試。

**防守點放在建立連線的唯一入口（`createPrismaClient()`）。** 原本只有 `seed.ts` 一處檢查，涵蓋不到 API 與 script；移到連線層後所有路徑一次覆蓋。

**保留逃生門 `ALLOW_REMOTE_DB=true`。** 無逃生門的防呆會逼人為了臨時維護而改動防呆本身，反而更危險。

## 3. 變更清單

| 檔案 | 變更 |
|---|---|
| `src/lib/env.ts` | 新增 `getAppEnv()` / `isDevEnv()`；`isProductionEnv()`、`appEnvLabel()` 改由其衍生（對外行為不變）|
| `src/lib/prisma.ts` | 新增 `assertLocalDbInDevEnv()` |
| `.devcontainer/devcontainer.json` | 新增；`containerEnv` 釘住 `DATABASE_URL=file:./dev.db` |
| `.devcontainer/setup.sh` | 新增；5 步自動初始化 |
| `.env.example` | 新增，74 行 |
| `package.json` | `build` 補 `prisma generate`；新增 5 支 `db:*` / `setup`；補 `engines` |
| `README.md` | 由 create-next-app 樣板重寫 |
| `docs/系統架構.md`、`docs/系統機制.md`、`docs/版本紀錄.md`、`docs/待辦清單.md` | 四份文件同步 |

## 4. 驗證

| 項目 | 方法 | 結果 |
|---|---|---|
| 防呆擋遠端 DB | 本機 `DATABASE_URL=libsql://fake-db.turso.io` 載入 prisma | ✅ 擋下並回傳指引訊息 |
| 防呆放行本機 | `file:./dev.db` 實際查詢 | ✅ Pet 筆數 = 2 |
| 防呆放行 Vercel | `VERCEL_ENV=production` + 遠端 URL | ✅ 放行 |
| 逃生門 | `ALLOW_REMOTE_DB=true` + 遠端 URL | ✅ 放行 |
| 從零重建資料庫 | 暫存路徑跑 `migrate deploy` + `db seed`（非破壞性） | ✅ 15 migration 全套用、31 張表、18 個 model 有資料 |
| 建置 | `npm run build` | ✅ 含 prisma generate，65 靜態頁 |
| Lint / 型別 | `npm run lint` / `tsc --noEmit` | ✅ 0 error |

## 5. 附帶發現（超出原範圍）

1. **`dev.db` 缺 `Feedback` / `AppReview` 兩表** —— Phase 6-9 的 work-report 記載「以 sqlite3 套 dev.db + `migrate resolve --applied`」，但實查 `_prisma_migrations` **根本沒有該筆紀錄**，兩張表也不存在。等於問題回報／評論功能在本機一直是壞的。已用 `npm run db:migrate` 補上，既有資料未動。
   → 教訓：`migrate resolve --applied` 這類手動介入應在 work-report 附上驗證輸出，不能只寫「已套用」。

2. **`dev.db` 移出 git 的建議需撤回** —— 原本評估它是「使用者資料進版控」的風險項，實查後發現它是 frank 手工累積測試資料（9 個測試帳號、咚咚、16 則對話、10 個產品）的**唯一載體**，而 seed 只能重建 demo 基線（1 pet / 1 user / 2 product）。移除前需先決定手工資料的保存方式。已改記於待辦 0-7 並標為暫緩。

3. **上線阻斷項 3 件**（已登記待辦 0-8）：照片上傳寫唯讀檔案系統、Google 登入不建 `User` 資料列（外鍵風險）、`AUTH_SECRET` 未列入部署變數清單。

## 6. 交接建議

- frank 需自行完成：GitHub repo Settings → Secrets → **Codespaces** 設定 5 個機密值（`DATABASE_URL` / `DATABASE_AUTH_TOKEN` **不可放**）。
- 下一棒建議處理待辦 0-8 的三個 🔴 項，其中「Google 登入建 `User`」風險最高，需 architect 定方案（掛 `PrismaAdapter` vs `signIn` callback upsert）後再實作。

---

## 7. 審查輪次（2026-08-24 追加）

派 code-reviewer 與 security-reviewer 各做一輪獨立審查，合計 25 項發現（2 blocking / 2 high / 12 medium / 9 low）。

### 已修正（含實測驗證）

| 級別 | 問題 | 修正 | 驗證 |
|---|---|---|---|
| B | `.env.example` 被 `.gitignore` `.env*` 排除 | 補 `!.env.example` | `git check-ignore` ✅ |
| B | heredoc 內命令替換失敗不被 `set -e` 捕捉 → 機密可能為空 | 移出區塊 + 驗證非空 + `die` | 產生的 `.env` 長度檢查 ✅ |
| H | Prisma CLI 繞過防呆 | `prisma.config.ts` 補同一判準 | 遠端 URL 被擋、`db:migrate` 正常 ✅ |
| H | `seed-turso.mjs` 可灌假資料進正式庫 | 需 `CONFIRM_SEED_PROD=yes` | 實測拒絕執行 ✅ |
| M | `vercel dev` 關閉防呆 | `VERCEL_ENV=development` 不算部署環境 | — |
| M | 錯誤訊息洩漏 authToken / userinfo | 改用 `URL` 解析 | 三種洩漏形式實測全遮蔽 ✅ |
| M | `.env` 權限 666、機密明文落地 | `chmod 600` + Secrets 提供者不寫檔 | `stat` 600 ✅、含 `"` 的值 round-trip 正確 ✅ |
| M | VAPID 私鑰經 argv | 改由 stdout 取回 | — |
| M | demo 登入口只靠裸旗標 | 加 `!isProductionEnv()` | tsc ✅ |
| M | 逃生門靜默永久生效 | 每次連線 `console.warn` | — |
| M | 文件宣稱「涵蓋所有路徑」不實 | 三處改為四道守衛表格 | — |
| M | 以「檔案存在」判斷是否 seed | 改無條件執行（冪等） | `npm run setup` 端對端 ✅ |
| m | `db:reset` 未清 `-wal`/`-shm` | 補上 | — |
| m | `isDevEnv()` 零呼叫端 | 移除 | lint ✅ |
| m | `check()` 變數名內插進 JS | 改 argv 傳入 + 補 3 個欄位 | 實測輸出正確 ✅ |
| m | README 教人把 token 打進指令列 | 改 `read -rs` + 說明風險 | — |
| L | 橫幅印 demo 密碼 | 改為指向原始碼 | — |

### 未修，需 frank 決策

**`dev.db` / `prisma/dev.db` 在版控中**（資安審查列為 High）。
`prisma/schema.prisma` 的 `Account` model 存 `refresh_token` / `access_token` / `id_token`。實查 `Account` 與 `PushSubscription` 皆 **0 筆，尚未實際外洩**；但只要有人以真實 Google 帳號登入一次再 commit，OAuth token 就永久留在 git 歷史裡（且 Phase 1-F 的實機驗收正是要做這件事）。

三個選項：
1. **匯出手工測試資料成 seed fixture → 移出版控**（推薦，兩者兼得，需額外工時）
2. 直接移出版控，接受手工測試資料只剩 demo 基線
3. 維持現狀，改以「commit 前檢查 `Account` 表為空」的 pre-commit hook 兜底（較脆弱）

### 兩份審查一致認可的部分

`.gitignore` 規則與 git 全歷史經掃描確認**從未提交過任何 `.env`、無 API key 樣式命中**；`check()` 只報有無不印值（canary 實測 0 命中）；亂數強度達標（256-bit CSPRNG / P-256）；`build` 加 `prisma generate` 安全（`DATABASE_URL` 未注入也不會炸）；`npm run db:*` 的行內變數確實覆蓋已 export 的環境變數。
