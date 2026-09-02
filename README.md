# PurePaw 無敏毛孩

繁體中文、行動優先（max-w-480）的 AI 寵物營養健康管理 PWA。
Next.js 16 App Router · Prisma v7 + libSQL · Tailwind v4 · NextAuth v5 · Anthropic · Web Push

---

## 兩套環境設定

本專案是「一份程式碼、兩套環境設定」，**dev 與 prod 連的是兩個實體完全分開的資料庫**：

| | **dev** | **prod** |
|---|---|---|
| 執行位置 | 本機 / Codespace、Vercel Preview | Vercel Production |
| 資料庫 | 本機 `dev.db`（SQLite）／preview Turso | 正式 Turso |
| 設定來源 | `.env`（gitignore）＋ GitHub Codespaces Secrets | Vercel → Settings → Environment Variables |
| demo 登入口 | 開啟（`DEMO_ENABLED=true`） | **關閉**（不設該變數） |
| 通知信主旨 | `[測試]` | `[正式]` |

程式用 [`src/lib/env.ts`](src/lib/env.ts) 的 `getAppEnv()` 判斷自己在哪：以 Vercel 的 `VERCEL_ENV` 為準，本機一律 `development`。

> ⚠️ `.env*` 已被 `.gitignore` 排除，**永遠不會進 git、也永遠到不了 Vercel**。
> 正式環境的值只能在 Vercel Dashboard 設定，絕不要寫進任何 `.env` 檔。

### 防呆：開發環境不可能誤連正式庫

同一個判準（[`isVercelDeployment()`](src/lib/env.ts)）在四個入口各擋一次——每條連線路徑都有守衛，缺一不可：

| 入口 | 守衛位置 | 規則 |
|---|---|---|
| API route / server component | [`src/lib/prisma.ts`](src/lib/prisma.ts) | 非 Vercel 部署環境連 `libsql://` → 中止 |
| Prisma CLI（`migrate` / `db push` / `studio`） | [`prisma.config.ts`](prisma.config.ts) | 同上（CLI 不經 `src/lib/prisma.ts`，故需獨立守衛） |
| `prisma db seed` | [`prisma/seed.ts`](prisma/seed.ts) | 目標非 `file:` → 中止（拒絕把假資料寫進遠端） |
| `scripts/*-turso.mjs` | 各腳本開頭 | 方向相反：目標為 `file:` → 中止；`seed-turso` 另需 `CONFIRM_SEED_PROD=yes` |

`vercel dev`（`VERCEL_ENV=development`）**不算部署環境**，防呆照樣生效——因為 `vercel env pull` 會把正式站憑證寫進本機 `.env`，那正是要擋的情境。

真的需要在本機操作正式庫時，可臨時設 `ALLOW_REMOTE_DB=true` 解除；解除期間每次連線都會在 log 留下警告，用完請立即移除。

---

## 開始開發

### Codespace（推薦）

開好 Codespace 就完成了 —— [`.devcontainer/setup.sh`](.devcontainer/setup.sh) 會自動裝依賴、產 Prisma Client、建 `dev.db`、灌示範資料、產生 `.env`。

```bash
npm run dev        # http://localhost:3000
```

機密值請設在 **GitHub → repo Settings → Secrets and variables → Codespaces**，
Codespaces 會注入成環境變數（優先於 `.env`），不必手動填：

`ANTHROPIC_API_KEY`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GMAIL_USER`、`GMAIL_APP_PASSWORD`

🚫 **`DATABASE_URL` / `DATABASE_AUTH_TOKEN` 不要放進 Codespaces Secrets** —— 開發環境永遠只連 `dev.db`。

### 本機

```bash
cp .env.example .env      # 依註解填入需要的值
npm run setup             # 依賴 + Prisma Client + dev.db + 示範資料
npm run dev
```

測試帳號：`demo@drpet.com` / `demo1234`（demo 帳號的 AI 內容一律為 mock，不會呼叫 API）

---

## 常用指令

```bash
npm run dev         # 開發伺服器
npm run build       # 正式建置（含 prisma generate）
npm run lint        # ESLint
npm run setup       # 重跑整套環境初始化（不覆蓋既有 .env）
npm run db:migrate  # 把 migration 補到最新（dev.db）
npm run db:seed     # 灌示範資料（upsert，可重複執行）
npm run db:reset    # 砍掉 dev.db 重建 + 重灌示範資料
npm run db:studio   # 資料庫瀏覽器
npm run db:audit-prod # 稽核正式庫的 migration 落差（唯讀，需自行帶入 Turso 憑證）
```

所有 `db:*` 指令都寫死 `DATABASE_URL="file:./dev.db"`，不可能連到正式庫。

---

## 部署

正式部署流程、環境變數清單與檢查項見 **[`docs/待辦清單.md`](docs/待辦清單.md)** 的部署章節。

正式庫 migration 用專用腳本（有自己的守衛，只准對遠端執行）：

```bash
read -rs -p "DATABASE_URL: "        DATABASE_URL        && echo
read -rs -p "DATABASE_AUTH_TOKEN: " DATABASE_AUTH_TOKEN && echo
export DATABASE_URL DATABASE_AUTH_TOKEN
node scripts/migrate-turso.mjs
unset DATABASE_URL DATABASE_AUTH_TOKEN
```

> 🔐 用 `read -rs` 而非直接寫在指令列：行內環境變數會留在 `~/.bash_history`，
> 且執行期間可從 `/proc/<pid>/cmdline` 被同機任何行程讀到。CI 環境請改由 secret 注入。

> 🚫 **絕對不要執行 `scripts/seed-turso.mjs`** —— 那會把 `dev.db` 的測試假資料灌進正式庫。
> 該腳本已需 `CONFIRM_SEED_PROD=yes` 才會動作，但正式站根本不該執行它（正式庫只跑 migration）。

---

## 文件

| 文件 | 內容 |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | 給 AI 協作者的專案指引 |
| [`docs/系統架構.md`](docs/系統架構.md) | 技術棧、路由、API、資料模型 |
| [`docs/系統機制.md`](docs/系統機制.md) | 各功能的實際運作邏輯 |
| [`docs/版本紀錄.md`](docs/版本紀錄.md) | 逐次改動紀錄 |
| [`docs/待辦清單.md`](docs/待辦清單.md) | Phase 0–7 分階段待辦 |
| [`docs/交接-專案現況與進度-2026-06-11.md`](docs/交接-專案現況與進度-2026-06-11.md) | 專案現況總覽 |
