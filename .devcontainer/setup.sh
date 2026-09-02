#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# PurePaw 開發環境自動初始化（dev）
#
# devcontainer 的 postCreateCommand 會呼叫；也可手動執行：npm run setup
# 完成後即可直接 `npm run dev`，不需任何手動步驟。
#
# 這支腳本只會建立 / 操作本機 dev.db，絕不連正式 Turso
# （src/lib/prisma.ts 另有防呆，本機連遠端 DB 會直接中止）。
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

say()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
die()  { printf '\n\033[31m✘ %s\033[0m\n' "$1" >&2; exit 1; }

# ── 1. 依賴 ─────────────────────────────────────────────────────
say "安裝依賴"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
ok "node_modules 就緒"

# ── 2. Prisma Client ────────────────────────────────────────────
# Prisma 7 起 npm install 不再自動 generate，缺這步 build / dev 都會炸。
say "產生 Prisma Client"
DATABASE_URL="file:./dev.db" npx prisma generate >/dev/null
ok "Prisma Client 已產生"

# ── 3. .env ─────────────────────────────────────────────────────
# 已存在就整份保留不動（不會補寫缺漏欄位）——避免覆蓋開發者手填的值。
# 舊 .env 若缺欄位，第 5 步的檢查會列出來。
say "檢查 .env"
if [ -f .env ]; then
  ok ".env 已存在，整份保留不動"
else
  # 機密在 heredoc/重導向之外先求值並驗證。
  # set -e 抓不到命令替換寫在輸出區塊裡的失敗，那樣會靜默產生空值，
  # 而空的 AUTH_SECRET 會讓 NextAuth 在 production 拋 MissingSecret。
  command -v openssl >/dev/null || die "找不到 openssl，無法產生 AUTH_SECRET / CRON_SECRET"

  GEN_AUTH_SECRET="$(openssl rand -base64 32)" || die "AUTH_SECRET 產生失敗"
  [ -n "$GEN_AUTH_SECRET" ] || die "AUTH_SECRET 產生結果為空"

  GEN_CRON_SECRET="$(openssl rand -hex 32)" || die "CRON_SECRET 產生失敗"
  [ -n "$GEN_CRON_SECRET" ] || die "CRON_SECRET 產生結果為空"

  # 金鑰以 stdout 逐行取回，不經 argv——argv 會出現在 /proc/<pid>/cmdline，
  # 同機任何行程都讀得到。
  VAPID_OUT="$(node -e '
    const k = require("web-push").generateVAPIDKeys();
    process.stdout.write(k.publicKey + "\n" + k.privateKey + "\n");
  ')" || die "VAPID 金鑰產生失敗（web-push 不可用？）"
  GEN_VAPID_PUB="$(printf '%s' "$VAPID_OUT" | sed -n 1p)"
  GEN_VAPID_PRIV="$(printf '%s' "$VAPID_OUT" | sed -n 2p)"
  [ -n "$GEN_VAPID_PUB" ] && [ -n "$GEN_VAPID_PRIV" ] || die "VAPID 金鑰產生結果為空"

  # 先建空檔並收緊權限，再寫入內容——避免機密曾以 world-readable 存在於磁碟。
  : > .env
  chmod 600 .env

  # 機密值一律「不落地」：Codespaces Secrets 注入的環境變數本就優先於 .env
  # （Next.js 的 @next/env 與 dotenv 都不覆蓋既有環境變數），寫進檔案只是多一份
  # 明文副本。另一個現實理由：dotenv 不支援雙引號內的跳脫，值含 " 會直接解析錯誤。
  # 因此這裡只寫「本機自產的機密（base64/hex，字元安全）」與非機密預設值。
  env_line() {  # $1=變數名 $2=說明
    if [ -n "${!1:-}" ]; then
      printf '# %s 由環境變數提供（Codespaces Secrets），不寫入本檔\n' "$1" >> .env
    else
      printf '%s=""  # %s\n' "$1" "$2" >> .env
    fi
  }

  {
    echo '# 由 .devcontainer/setup.sh 自動產生（dev 環境）'
    echo '# 完整說明與 prod 對照請看 .env.example'
    echo '#'
    echo '# 機密值請設在 GitHub repo Settings → Secrets → Codespaces。'
    echo '# 環境變數優先於本檔，因此已由 Secrets 提供的項目這裡不會重複寫一份明文。'
    echo
    echo 'DATABASE_URL="file:./dev.db"'
    echo
    echo "AUTH_SECRET=\"$GEN_AUTH_SECRET\""
    echo 'NEXTAUTH_URL="http://localhost:3000"'
    echo
  } >> .env

  env_line GOOGLE_CLIENT_ID     "Google Cloud Console → 憑證"
  env_line GOOGLE_CLIENT_SECRET "Google Cloud Console → 憑證"
  env_line ANTHROPIC_API_KEY    "console.anthropic.com → API Keys"
  env_line GMAIL_APP_PASSWORD   "Gmail 應用程式密碼 16 碼"

  {
    echo
    echo "GMAIL_USER=\"${GMAIL_USER:-purepaw.notify@gmail.com}\""
    echo
    echo "VAPID_PUBLIC_KEY=\"$GEN_VAPID_PUB\""
    echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=\"$GEN_VAPID_PUB\""
    echo "VAPID_PRIVATE_KEY=\"$GEN_VAPID_PRIV\""
    echo 'VAPID_SUBJECT="mailto:purepaw.notify@gmail.com"'
    echo
    echo "CRON_SECRET=\"$GEN_CRON_SECRET\""
    echo
    echo 'DEMO_ENABLED="true"'
    echo 'NEXT_PUBLIC_DEMO_ENABLED="true"'
  } >> .env

  ok ".env 已建立（權限 600；AUTH_SECRET / CRON_SECRET / VAPID 自動產生並驗證非空）"
fi

# ── 4. 資料庫 ───────────────────────────────────────────────────
# dev.db 目前是 git 追蹤檔，clone 下來就存在，因此不能用「檔案在不在」判斷要不要 seed。
# migrate deploy 與 db seed（全 upsert）都是冪等的，一律執行最單純也最不會出錯。
say "準備測試資料庫 dev.db"
DATABASE_URL="file:./dev.db" npx prisma migrate deploy >/dev/null
ok "migration 已補到最新"
DATABASE_URL="file:./dev.db" npx prisma db seed >/dev/null
ok "示範資料已就緒（upsert，不會覆蓋你自己建的測試資料）"

# ── 5. 檢查機密齊備度（只報有無，不印值）────────────────────────
say "環境變數檢查"
check() {
  local name="$1" desc="$2" found
  # 變數名以 argv 傳入，不內插進 JS 原始碼
  found="$(node -e '
    const fs = require("fs");
    const name = process.argv[1];
    let v = process.env[name] || "";
    if (!v && fs.existsSync(".env")) {
      const line = fs.readFileSync(".env", "utf8")
        .split("\n")
        .find((l) => l.startsWith(name + "="));
      if (line) v = line.slice(name.length + 1).trim().replace(/^"|"$/g, "");
    }
    process.stdout.write(v ? "1" : "");
  ' "$name" || true)"
  if [ -n "$found" ]; then ok "$name（$desc）"; else warn "$name 未設定 —— $desc"; fi
}
check AUTH_SECRET        "缺少時 production 會拋 MissingSecret，全站登入失效"
check CRON_SECRET        "缺少時快訊 / 提醒排程無法授權"
check VAPID_PRIVATE_KEY  "缺少時 Web Push 推播無法發送"
check ANTHROPIC_API_KEY  "缺少時所有 AI 功能會失敗"
check GOOGLE_CLIENT_ID   "缺少時無法用 Google 登入（demo 帳號仍可用）"
check GMAIL_APP_PASSWORD "缺少時邀請信 / 問題回報信寄不出"

cat << 'DONE'

╭──────────────────────────────────────────────────────────╮
│  ✅ PurePaw 開發環境就緒（dev / dev.db）                  │
│                                                          │
│    npm run dev        啟動開發伺服器 (:3000)             │
│    npm run db:reset   重建 dev.db + 重灌示範資料         │
│    npm run db:studio  開資料庫瀏覽器                     │
│                                                          │
│  測試帳號：demo@drpet.com（密碼見 src/lib/auth.ts）      │
│  未設定的變數請看上方警告，或參考 .env.example           │
╰──────────────────────────────────────────────────────────╯
DONE
