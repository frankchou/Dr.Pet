/**
 * 正式庫 migration 落差檢查（唯讀稽核）
 * =====================================
 *
 * 上線流程 Step 6 要對正式 Turso 跑 migration。在動正式庫之前，先用這支腳本
 * 「看清楚再執行」：遠端到底套用了哪些 migration、缺哪幾筆、每筆會動到什麼、
 * 現在有多少真實資料。
 *
 * ⚠️ 唯讀保證（THIS SCRIPT IS STRICTLY READ-ONLY）
 * ------------------------------------------------
 * 本腳本對遠端資料庫「只做讀取」，絕不執行任何
 *   CREATE / INSERT / UPDATE / DELETE / ALTER / DROP / REPLACE /
 *   TRUNCATE / ATTACH / VACUUM / REINDEX / BEGIN / COMMIT
 * 語句，也不會建立 _prisma_migrations 追蹤表（與 migrate-turso.mjs 的差別）。
 *
 * 實作上用三層防護：
 *   1. 所有送到遠端的 SQL 都是本檔案內的字面常數，唯一的變數是資料表名稱，
 *      且以 quoteIdent() 做識別字跳脫（雙引號成對加倍）。
 *   2. 每一次查詢都必須經過 readOnlyQuery()，它會逐句檢查：
 *      開頭必須是 SELECT 或白名單內的 PRAGMA、不得含分號（擋語句堆疊）、
 *      不得出現任何寫入關鍵字。不合格就直接 throw，不會送出。
 *   3. 全檔只有 readOnlyQuery() 一處呼叫 client.execute()，
 *      沒有 client.batch()、client.executeMultiple()、client.transaction()。
 *   維護本檔時請維持這三點；新增查詢一律走 readOnlyQuery()。
 *
 * 用法（憑證不要直接打在指令列上）
 * --------------------------------
 * 指令列參數會留在 ~/.bash_history，也能被同機其他行程從 /proc/<pid>/cmdline 讀到，
 * 所以請用 `read -rs`（-s 不回顯、-r 不吃反斜線）先讀進 shell 變數再帶入：
 *
 *   read -rs -p "Turso DATABASE_URL: " TURSO_URL; echo
 *   read -rs -p "Turso AUTH TOKEN: "   TURSO_TOKEN; echo
 *   DATABASE_URL="$TURSO_URL" DATABASE_AUTH_TOKEN="$TURSO_TOKEN" \
 *     node scripts/check-turso-migrations.mjs
 *   unset TURSO_URL TURSO_TOKEN
 *
 * 展開後的值只存在該次行程的環境變數中（history 裡留下的是 `$TURSO_URL` 字面），
 * 用完 unset 即可。也可加 `| tee /tmp/turso-audit.txt` 保存報告貼進工作報告。
 *
 * 設計備註
 * --------
 * - 本腳本「刻意不讀 .env」。devcontainer 會把 DATABASE_URL 釘成 file:./dev.db，
 *   若自動載入 .env，很容易發生「以為在查正式庫、其實查到本機或別的庫」。
 *   憑證必須每次明示帶入，稽核對象才不會有歧義。
 * - 守衛方向與 src/lib/prisma.ts 相反、與 scripts/migrate-turso.mjs 相同：只准遠端。
 * - 錯誤訊息一律只印 safeHost()（protocol + host），絕不印完整 DATABASE_URL
 *   （可能含 ?authToken=）。用 new URL() 解析而非正則裁切——正則不匹配時
 *   String.replace 會原樣回傳，等於全文洩漏。
 *
 * 離開碼：0 = 報告產出成功（有無落差都是 0）；1 = 執行失敗（守衛擋下 / 連線錯誤）。
 */

import { createClient } from '@libsql/client'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ---------------------------------------------------------------------------
// 憑證安全：連線字串縮成「協定 + host」
// ---------------------------------------------------------------------------

/**
 * 把連線字串縮成「協定 + host」，用於所有輸出與錯誤訊息。
 * 必須排除 userinfo（user:password@）與 query（?authToken=...），否則會把憑證印進 log。
 * 比照 src/lib/prisma.ts 的 safeHost()：用 URL 解析而非正則。
 */
function safeHost(url) {
  try {
    const parsed = new URL(url)
    return parsed.host ? `${parsed.protocol}//${parsed.host}` : parsed.protocol
  } catch {
    return '(無法解析的 DATABASE_URL)'
  }
}

/**
 * 二次防護：第三方函式庫（@libsql/client、URL 解析）拋出的錯誤訊息可能原樣夾帶
 * 連線字串或 token。輸出任何外部錯誤前一律先過這裡，把憑證換成佔位符。
 * 用字面比對 split/join 而非正則：不需跳脫、也不會有「不匹配就原樣回傳」的風險。
 */
function redact(text) {
  let out = String(text)
  const secrets = [process.env.DATABASE_URL, process.env.DATABASE_AUTH_TOKEN].filter(Boolean)
  for (const secret of secrets) {
    if (secret.length >= 8) out = out.split(secret).join('[已遮蔽]')
  }
  // 保險：即使拼接方式不同，也把任何 authToken=... 參數蓋掉
  const idx = out.toLowerCase().indexOf('authtoken=')
  if (idx !== -1) {
    const tail = out.slice(idx + 'authtoken='.length)
    const stop = tail.search(/[\s&'"`)\]]/)
    out = out.slice(0, idx) + 'authToken=[已遮蔽]' + (stop === -1 ? '' : tail.slice(stop))
  }
  return out
}

// ---------------------------------------------------------------------------
// 唯讀護欄
// ---------------------------------------------------------------------------

/** 任何一個出現在 SQL 中的寫入關鍵字都會讓查詢被拒絕。 */
const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'REPLACE',
  'TRUNCATE', 'ATTACH', 'DETACH', 'VACUUM', 'REINDEX', 'ANALYZE',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE', 'GRANT', 'REVOKE',
]

/** 唯一允許的 PRAGMA（純查詢型；不得帶 `=` 這種設定寫法）。 */
const ALLOWED_PRAGMAS = ['TABLE_INFO', 'TABLE_LIST', 'INDEX_LIST', 'DATABASE_LIST']

/**
 * 唯讀守門員：檢查 SQL 是否為純讀取語句，不合格直接 throw（不會送出）。
 * 全檔僅此函式呼叫 client.execute()。
 */
function assertReadOnlySql(sql) {
  const text = String(sql).trim()

  if (text.includes(';')) {
    throw new Error(`[唯讀護欄] 拒絕含分號的 SQL（防止語句堆疊）：${text.slice(0, 80)}`)
  }

  const head = text.toUpperCase()

  if (head.startsWith('PRAGMA')) {
    if (head.includes('=')) {
      throw new Error(`[唯讀護欄] 拒絕設定型 PRAGMA：${text.slice(0, 80)}`)
    }
    const name = head.replace(/^PRAGMA\s+/, '').split(/[\s(]/)[0]
    if (!ALLOWED_PRAGMAS.includes(name)) {
      throw new Error(`[唯讀護欄] PRAGMA ${name} 不在白名單內`)
    }
    return
  }

  if (!/^SELECT\b/.test(head)) {
    throw new Error(`[唯讀護欄] 只允許 SELECT / 白名單 PRAGMA，收到：${text.slice(0, 80)}`)
  }

  for (const kw of FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`).test(head)) {
      throw new Error(`[唯讀護欄] SQL 含寫入關鍵字 ${kw}：${text.slice(0, 80)}`)
    }
  }
}

/** 對遠端執行一句唯讀 SQL。這是全檔唯一與資料庫互動的出口。 */
async function readOnlyQuery(client, sql, args = []) {
  assertReadOnlySql(sql)
  return client.execute({ sql, args })
}

/** SQLite 識別字跳脫：包雙引號、內部雙引號加倍。表名來自 sqlite_master，仍照跳脫處理。 */
function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`
}

// ---------------------------------------------------------------------------
// 進入點守衛
// ---------------------------------------------------------------------------

const url = process.env.DATABASE_URL
const authToken = process.env.DATABASE_AUTH_TOKEN

if (!url) {
  console.error('缺少 DATABASE_URL。用法請見本檔開頭註解（建議用 read -rs 輸入憑證）。')
  process.exit(1)
}

// 自我測試逃生門：唯讀腳本指向本機檔案本身無破壞性，但會讓人誤以為查的是正式庫，
// 所以預設拒絕；只有明示 AUDIT_ALLOW_FILE_URL=1（開發者自我驗證用）才放行，
// 且報告開頭會印出醒目警告，避免「臨時解除」在無人察覺下變成常態。
const allowFileUrl = process.env.AUDIT_ALLOW_FILE_URL === '1'

if (url.startsWith('file:') && !allowFileUrl) {
  console.error(`拒絕執行：DATABASE_URL 指向本機檔案（${safeHost(url)}），本腳本只用於稽核遠端 Turso。`)
  console.error('devcontainer 會把 DATABASE_URL 釘成 file:./dev.db，請以行內環境變數明示遠端連線：')
  console.error('  DATABASE_URL="$TURSO_URL" DATABASE_AUTH_TOKEN="$TURSO_TOKEN" node scripts/check-turso-migrations.mjs')
  process.exit(1)
}

if (!url.startsWith('file:') && !authToken) {
  console.error(`缺少 DATABASE_AUTH_TOKEN（目標 ${safeHost(url)}）。Turso 遠端連線需要 token。`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// migration SQL 解析
// ---------------------------------------------------------------------------

/**
 * 去除註解並切割語句。會尊重單引號字串與雙引號識別字，
 * 因此字串／識別字內的 `;` 與 `--` 不會被誤判。
 */
function splitStatements(sql) {
  const statements = []
  let cur = ''
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    const n = sql[i + 1]

    if (c === '-' && n === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      continue
    }
    if (c === '/' && n === '*') {
      i += 2
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (c === "'" || c === '"') {
      const quote = c
      cur += c
      i++
      while (i < sql.length) {
        cur += sql[i]
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) { cur += sql[i + 1]; i += 2; continue }
          i++
          break
        }
        i++
      }
      continue
    }
    if (c === ';') {
      if (cur.trim()) statements.push(cur.trim())
      cur = ''
      i++
      continue
    }
    cur += c
    i++
  }
  if (cur.trim()) statements.push(cur.trim())
  return statements
}

const IDENT = '(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))'

/** 從 regex 比對結果取出識別字（可能是帶引號或裸的那一組）。 */
function pickIdent(m, quotedIdx) {
  return m[quotedIdx] ?? m[quotedIdx + 1]
}

/**
 * 解析單一 migration 的 SQL，回傳結構化的操作清單。
 * 只做靜態文字分析，不執行任何 SQL。
 */
function parseMigrationSql(sql) {
  const ops = []
  for (const stmt of splitStatements(sql)) {
    const flat = stmt.replace(/\s+/g, ' ').trim()
    const up = flat.toUpperCase()
    let m

    m = flat.match(new RegExp(`^CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${IDENT}`, 'i'))
    if (m) {
      const table = pickIdent(m, 1)
      const cols = (stmt.match(/^\s*"([^"]+)"\s+/gm) || []).length
      ops.push({ kind: 'createTable', table, detail: cols ? `約 ${cols} 個欄位` : '' })
      continue
    }

    m = flat.match(new RegExp(`^CREATE\\s+(UNIQUE\\s+)?INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${IDENT}\\s+ON\\s+${IDENT}`, 'i'))
    if (m) {
      ops.push({
        kind: 'createIndex',
        table: pickIdent(m, 4),
        index: pickIdent(m, 2),
        unique: Boolean(m[1]),
      })
      continue
    }

    m = flat.match(new RegExp(`^ALTER\\s+TABLE\\s+${IDENT}\\s+(.+)$`, 'i'))
    if (m) {
      const table = pickIdent(m, 1)
      const rest = m[3]
      const restUp = rest.toUpperCase()
      let sub

      sub = rest.match(new RegExp(`^ADD\\s+(?:COLUMN\\s+)?${IDENT}\\s*(.*)$`, 'i'))
      if (restUp.startsWith('ADD') && sub) {
        ops.push({ kind: 'addColumn', table, column: pickIdent(sub, 1), detail: sub[3].trim() })
        continue
      }
      sub = rest.match(new RegExp(`^RENAME\\s+TO\\s+${IDENT}`, 'i'))
      if (sub) {
        ops.push({ kind: 'renameTable', table, to: pickIdent(sub, 1) })
        continue
      }
      sub = rest.match(new RegExp(`^RENAME\\s+(?:COLUMN\\s+)?${IDENT}\\s+TO\\s+${IDENT}`, 'i'))
      if (sub) {
        ops.push({ kind: 'renameColumn', table, column: pickIdent(sub, 1), to: pickIdent(sub, 3) })
        continue
      }
      sub = rest.match(new RegExp(`^DROP\\s+(?:COLUMN\\s+)?${IDENT}`, 'i'))
      if (sub) {
        ops.push({ kind: 'dropColumn', table, column: pickIdent(sub, 1) })
        continue
      }
      ops.push({ kind: 'alterOther', table, detail: rest })
      continue
    }

    m = flat.match(new RegExp(`^DROP\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?${IDENT}`, 'i'))
    if (m) { ops.push({ kind: 'dropTable', table: pickIdent(m, 1) }); continue }

    m = flat.match(new RegExp(`^DROP\\s+INDEX\\s+(?:IF\\s+EXISTS\\s+)?${IDENT}`, 'i'))
    if (m) { ops.push({ kind: 'dropIndex', index: pickIdent(m, 1) }); continue }

    m = flat.match(new RegExp(`^INSERT\\s+(?:OR\\s+\\w+\\s+)?INTO\\s+${IDENT}`, 'i'))
    if (m) { ops.push({ kind: 'insert', table: pickIdent(m, 1) }); continue }

    m = flat.match(new RegExp(`^UPDATE\\s+${IDENT}`, 'i'))
    if (m) { ops.push({ kind: 'update', table: pickIdent(m, 1) }); continue }

    m = flat.match(new RegExp(`^DELETE\\s+FROM\\s+${IDENT}`, 'i'))
    if (m) { ops.push({ kind: 'delete', table: pickIdent(m, 1) }); continue }

    if (up.startsWith('PRAGMA')) { ops.push({ kind: 'pragma', detail: flat }); continue }

    ops.push({ kind: 'other', detail: flat.slice(0, 120) })
  }
  return ops
}

/** 把一筆 migration 的操作清單整理成人類可讀的條列。 */
function describeOps(ops) {
  // Prisma 的 SQLite「重建資料表」樣式：CREATE new_X → INSERT INTO new_X → DROP X → RENAME new_X→X
  const rebuilt = new Set()
  for (const op of ops) {
    if (op.kind === 'renameTable' && /^new_/i.test(op.table)) rebuilt.add(op.to)
  }

  const lines = []
  for (const op of ops) {
    switch (op.kind) {
      case 'createTable':
        if (rebuilt.has(op.table.replace(/^new_/i, '')) && /^new_/i.test(op.table)) break
        lines.push(`新增資料表 ${op.table}${op.detail ? `（${op.detail}）` : ''}`)
        break
      case 'addColumn':
        lines.push(`資料表 ${op.table} 新增欄位 ${op.column}${op.detail ? ` ${op.detail}` : ''}`)
        break
      case 'createIndex':
        lines.push(`${op.unique ? '唯一索引' : '索引'} ${op.index}（於 ${op.table}）`)
        break
      case 'renameTable':
        if (/^new_/i.test(op.table)) break
        lines.push(`資料表更名 ${op.table} → ${op.to}`)
        break
      case 'renameColumn':
        lines.push(`資料表 ${op.table} 欄位更名 ${op.column} → ${op.to}`)
        break
      case 'dropColumn':
        lines.push(`⚠️ 資料表 ${op.table} 移除欄位 ${op.column}`)
        break
      case 'dropTable':
        if (rebuilt.has(op.table)) break
        lines.push(`⚠️ 刪除資料表 ${op.table}`)
        break
      case 'dropIndex':
        lines.push(`移除索引 ${op.index}`)
        break
      case 'insert':
        if (/^new_/i.test(op.table)) break
        lines.push(`資料寫入 INSERT INTO ${op.table}（資料 backfill）`)
        break
      case 'update':
        lines.push(`⚠️ 資料更新 UPDATE ${op.table}`)
        break
      case 'delete':
        lines.push(`⚠️ 資料刪除 DELETE FROM ${op.table}`)
        break
      case 'alterOther':
        lines.push(`ALTER TABLE ${op.table} ${op.detail}`)
        break
      case 'pragma':
      case 'other':
      default:
        break
    }
  }
  for (const t of rebuilt) {
    lines.unshift(`♻️ 重建資料表 ${t}（Prisma RedefineTables：建暫存表→搬資料→丟原表→更名，過程含 DROP TABLE）`)
  }
  return lines.length ? lines : ['（無可辨識的結構變更；可能只有 PRAGMA 或註解）']
}

// ---------------------------------------------------------------------------
// 本機 migration 清單
// ---------------------------------------------------------------------------

const migrationsDir = join(process.cwd(), 'prisma/migrations')

function listLocalMigrations() {
  return readdirSync(migrationsDir)
    .filter((f) => {
      try { return statSync(join(migrationsDir, f)).isDirectory() } catch { return false }
    })
    .sort()
    .map((name) => {
      let sql = ''
      let error = null
      try {
        sql = readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf-8')
      } catch (e) {
        error = e.message
      }
      return { name, sql, error, ops: error ? [] : parseMigrationSql(sql) }
    })
}

/**
 * 依序套用本機所有 migration 的結構操作，推導出「schema 完整套用後應有的資料表」。
 * 純文字模擬，不碰任何資料庫。
 */
function expectedTablesFromLocal(locals) {
  const tables = new Set()
  for (const mig of locals) {
    for (const op of mig.ops) {
      if (op.kind === 'createTable') tables.add(op.table)
      else if (op.kind === 'dropTable') tables.delete(op.table)
      else if (op.kind === 'renameTable') { tables.delete(op.table); tables.add(op.to) }
    }
  }
  return tables
}

// ---------------------------------------------------------------------------
// 遠端讀取（全部唯讀）
// ---------------------------------------------------------------------------

async function remoteTableExists(client, name) {
  const r = await readOnlyQuery(
    client,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [name],
  )
  return r.rows.length > 0
}

async function listRemoteTables(client) {
  const r = await readOnlyQuery(
    client,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  return r.rows.map((row) => String(row.name))
}

async function fetchAppliedMigrations(client) {
  const r = await readOnlyQuery(
    client,
    'SELECT migration_name, finished_at, rolled_back_at, applied_steps_count, started_at' +
      ' FROM _prisma_migrations ORDER BY started_at, migration_name',
  )
  return r.rows.map((row) => ({
    name: String(row.migration_name),
    finishedAt: row.finished_at ?? null,
    rolledBackAt: row.rolled_back_at ?? null,
    steps: row.applied_steps_count ?? null,
    startedAt: row.started_at ?? null,
  }))
}

async function countRows(client, table) {
  try {
    const r = await readOnlyQuery(client, `SELECT COUNT(*) AS n FROM ${quoteIdent(table)}`)
    return Number(r.rows[0].n)
  } catch (e) {
    return `讀取失敗（${redact(e.message).slice(0, 60)}）`
  }
}

async function listRemoteColumns(client, table) {
  try {
    const r = await readOnlyQuery(client, `PRAGMA table_info(${quoteIdent(table)})`)
    return r.rows.map((row) => String(row.name))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 報告輸出
// ---------------------------------------------------------------------------

const out = []
const say = (line = '') => out.push(line)

function pad(s, n) {
  const str = String(s)
  // 中文字寬約兩倍，粗略補償讓表格對齊
  const width = [...str].reduce((w, ch) => w + (/[　-鿿＀-￯]/.test(ch) ? 2 : 1), 0)
  return str + ' '.repeat(Math.max(1, n - width))
}

async function main() {
  const client = createClient(authToken ? { url, authToken } : { url })
  const warnings = []
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  say('=========================================================')
  say(' PurePaw / Dr.Pet — 正式庫 migration 落差檢查（唯讀）')
  say('=========================================================')
  say(`檢查時間（UTC）：${now}`)
  say(`目標資料庫：${safeHost(url)}`)
  say('操作模式：唯讀（本腳本不執行任何 CREATE / INSERT / UPDATE / DELETE / ALTER / DROP）')
  if (allowFileUrl && url.startsWith('file:')) {
    say('')
    say('⚠️⚠️ AUDIT_ALLOW_FILE_URL=1 已解除 file: 守衛 —— 目前查的是「本機檔案資料庫」，')
    say('     不是正式 Turso。此模式僅供腳本自我驗證，正式稽核請勿使用。')
  }
  say('')

  // --- 1. 本機 migration ---------------------------------------------------
  const locals = listLocalMigrations()
  const localNames = locals.map((m) => m.name)

  say('---------------------------------------------------------')
  say('【1】本機 prisma/migrations/ 的 migration')
  say('---------------------------------------------------------')
  say(`共 ${locals.length} 筆：`)
  locals.forEach((m, i) => {
    say(`  ${String(i + 1).padStart(2, ' ')}. ${m.name}${m.error ? `  ← ⚠️ 讀取 migration.sql 失敗：${m.error}` : ''}`)
    if (m.error) warnings.push(`本機 migration ${m.name} 的 migration.sql 無法讀取`)
  })
  say('')

  // --- 2. 遠端 _prisma_migrations -----------------------------------------
  say('---------------------------------------------------------')
  say('【2】遠端 _prisma_migrations 已套用紀錄')
  say('---------------------------------------------------------')

  const hasTrackingTable = await remoteTableExists(client, '_prisma_migrations')
  let applied = []

  if (!hasTrackingTable) {
    say('遠端「沒有」_prisma_migrations 表。')
    say('意義：這個資料庫從未透過 Prisma migrate / scripts/migrate-turso.mjs 建立過追蹤紀錄。')
    say('可能情況：')
    say('  (a) 全新的空資料庫 —— 直接跑完整 migration 即可；')
    say('  (b) 資料表是用 `prisma db push` 或手動 SQL 建的 —— 結構可能已存在但「無紀錄」，')
    say('      此時直接跑 migration 會撞 "table already exists"，須先用 `migrate resolve --applied` 補紀錄。')
    say('請對照下方【5】遠端資料表清單判斷是 (a) 還是 (b)。')
    warnings.push('遠端沒有 _prisma_migrations 表 —— 套用前必須先確認結構是否已用其他方式建立')
  } else {
    applied = await fetchAppliedMigrations(client)
    if (applied.length === 0) {
      say('_prisma_migrations 表存在，但「沒有任何紀錄」（0 筆）。')
      warnings.push('遠端 _prisma_migrations 表存在但為空')
    } else {
      say(`共 ${applied.length} 筆紀錄：`)
      say('')
      say(`  ${pad('migration', 52)}${pad('finished_at', 24)}狀態`)
      say(`  ${'-'.repeat(52)}${'-'.repeat(24)}${'-'.repeat(12)}`)
      for (const a of applied) {
        let status = '已完成'
        if (a.rolledBackAt) { status = '⚠️ 已回滾'; warnings.push(`遠端 migration ${a.name} 被標記為 rolled back`) }
        else if (!a.finishedAt) { status = '⚠️ 未完成'; warnings.push(`遠端 migration ${a.name} 沒有 finished_at（可能中途失敗）`) }
        say(`  ${pad(a.name, 52)}${pad(a.finishedAt ?? '(null)', 24)}${status}`)
      }
    }
  }
  say('')

  // --- 3. 差集 -------------------------------------------------------------
  const appliedOk = applied.filter((a) => !a.rolledBackAt).map((a) => a.name)
  const appliedSet = new Set(appliedOk)
  const localSet = new Set(localNames)

  const pending = localNames.filter((n) => !appliedSet.has(n))
  const divergent = appliedOk.filter((n) => !localSet.has(n))

  say('---------------------------------------------------------')
  say('【3】落差（本機 ↔ 遠端）')
  say('---------------------------------------------------------')

  if (divergent.length > 0) {
    say('🚨 分歧警告：遠端有「本機不存在」的 migration 紀錄！')
    divergent.forEach((n) => say(`     - ${n}`))
    say('  代表遠端曾被別的分支 / 別的人套用過，或本機 migration 目錄被改名 / 刪除。')
    say('  請先釐清來源再動正式庫，不要盲目往前套。')
    warnings.push(`遠端有 ${divergent.length} 筆本機沒有的 migration（分歧）`)
    say('')
  }

  // 順序檢查：本機已套用的部分應是 localNames 的前綴
  const firstPendingIdx = localNames.findIndex((n) => !appliedSet.has(n))
  if (firstPendingIdx !== -1) {
    const appliedAfterGap = localNames.slice(firstPendingIdx + 1).filter((n) => appliedSet.has(n))
    if (appliedAfterGap.length > 0) {
      say('⚠️ 順序異常：遠端跳過了較早的 migration，卻套用了較晚的：')
      appliedAfterGap.forEach((n) => say(`     - ${n}（但 ${localNames[firstPendingIdx]} 尚未套用）`))
      say('')
      warnings.push('遠端 migration 套用順序不連續（有跳號）')
    }
  }

  if (pending.length === 0) {
    say('✅ 沒有待套用的 migration —— 本機所有 migration 遠端都已套用。')
  } else {
    say(`遠端缺少 ${pending.length} 筆 migration，應依下列順序套用：`)
    pending.forEach((n, i) => say(`  ${String(i + 1).padStart(2, ' ')}. ${n}`))
  }
  say('')

  // --- 4. 每筆待套用 migration 的內容 --------------------------------------
  say('---------------------------------------------------------')
  say('【4】待套用 migration 會做什麼')
  say('---------------------------------------------------------')

  const remoteTables = await listRemoteTables(client)
  const remoteTableSet = new Set(remoteTables)
  const collisions = []

  if (pending.length === 0) {
    say('（無待套用 migration）')
  } else {
    for (const [i, name] of pending.entries()) {
      const mig = locals.find((m) => m.name === name)
      say(`${String(i + 1).padStart(2, ' ')}. ${name}`)
      if (mig.error) {
        say('    ⚠️ migration.sql 無法讀取，內容不明')
        say('')
        continue
      }
      for (const line of describeOps(mig.ops)) say(`    - ${line}`)

      // 撞表 / 撞欄位預檢：這些會讓套用當場失敗
      for (const op of mig.ops) {
        if (op.kind === 'createTable' && !/^new_/i.test(op.table) && remoteTableSet.has(op.table)) {
          collisions.push(`${name}：CREATE TABLE ${op.table} —— 但遠端已有此表`)
        }
        if (op.kind === 'addColumn' && remoteTableSet.has(op.table)) {
          const cols = await listRemoteColumns(client, op.table)
          if (cols && cols.includes(op.column)) {
            collisions.push(`${name}：ALTER TABLE ${op.table} ADD COLUMN ${op.column} —— 但遠端已有此欄位`)
          }
        }
      }
      say('')
    }
  }

  if (collisions.length > 0) {
    say('🚨 套用前衝突預檢：下列操作的目標「遠端已經存在」，直接套用會失敗：')
    collisions.forEach((c) => say(`     - ${c}`))
    say('  多半代表該 migration 其實已生效、只是缺 _prisma_migrations 紀錄。')
    say('  處理方式：`npx prisma migrate resolve --applied <migration_name>` 補紀錄，而非重跑。')
    say('')
    warnings.push(`偵測到 ${collisions.length} 項「目標已存在」的衝突，套用前必須先處理`)
  } else if (pending.length > 0) {
    say('✅ 衝突預檢通過：待套用 migration 要建立的資料表 / 欄位，遠端目前都不存在。')
    say('')
  }

  // --- 5. 遠端資料表與資料量 ------------------------------------------------
  say('---------------------------------------------------------')
  say('【5】遠端現有資料表與資料筆數')
  say('---------------------------------------------------------')

  if (remoteTables.length === 0) {
    say('遠端「沒有任何資料表」—— 這是一個全新的空資料庫。')
  } else {
    const counts = []
    for (const t of remoteTables) counts.push({ table: t, n: await countRows(client, t) })
    counts.sort((a, b) => {
      const an = typeof a.n === 'number' ? a.n : -1
      const bn = typeof b.n === 'number' ? b.n : -1
      if (bn !== an) return bn - an
      return a.table.localeCompare(b.table)
    })

    const total = counts.reduce((s, c) => s + (typeof c.n === 'number' ? c.n : 0), 0)
    say(`共 ${remoteTables.length} 個資料表，總計 ${total} 筆資料：`)
    say('')
    say(`  ${pad('資料表', 34)}筆數`)
    say(`  ${'-'.repeat(34)}${'-'.repeat(10)}`)
    for (const c of counts) say(`  ${pad(c.table, 34)}${c.n}`)
    say('')

    const withData = counts.filter((c) => typeof c.n === 'number' && c.n > 0 && c.table !== '_prisma_migrations')
    if (withData.length === 0) {
      say('👉 除了 migration 紀錄外沒有任何真實資料 —— 正式庫目前是空的。')
    } else {
      say(`👉 有 ${withData.length} 個資料表含真實資料，操作正式庫務必小心（本腳本不會寫入）。`)
    }
  }
  say('')

  // --- 6. 結構落差（表層級） ------------------------------------------------
  const expected = expectedTablesFromLocal(locals)
  const missingTables = [...expected].filter((t) => !remoteTableSet.has(t)).sort()
  const extraTables = remoteTables
    .filter((t) => t !== '_prisma_migrations' && !expected.has(t))
    .sort()

  say('---------------------------------------------------------')
  say('【6】資料表層級落差（本機 schema 推導 ↔ 遠端實況）')
  say('---------------------------------------------------------')
  say(`本機 migration 全部套用後應有 ${expected.size} 個資料表。`)
  if (missingTables.length === 0) {
    say('✅ 遠端不缺任何資料表。')
  } else {
    say(`遠端缺少 ${missingTables.length} 個資料表：`)
    missingTables.forEach((t) => say(`  - ${t}`))
  }
  if (extraTables.length > 0) {
    say('')
    say(`⚠️ 遠端有 ${extraTables.length} 個「本機 schema 沒有」的資料表：`)
    extraTables.forEach((t) => say(`  - ${t}`))
    say('  可能是舊版殘留、手動建立、或 schema 分歧。請確認來源。')
    warnings.push(`遠端有 ${extraTables.length} 個本機 schema 不存在的資料表`)
  }
  say('')

  // --- 7. 結論 -------------------------------------------------------------
  say('---------------------------------------------------------')
  say('【7】結論與建議')
  say('---------------------------------------------------------')
  say(`待套用 migration：${pending.length} 筆`)
  say(`遠端缺少資料表：${missingTables.length} 個`)
  say(`分歧 migration（遠端有本機無）：${divergent.length} 筆`)
  say(`套用前衝突：${collisions.length} 項`)
  say('')

  if (warnings.length === 0 && pending.length === 0) {
    say('✅ 遠端與本機完全同步，Step 6 無事可做。')
  } else if (warnings.length === 0) {
    say('✅ 沒有偵測到風險項目。可依【3】的順序套用 migration。')
    say('   建議：套用前先在 Turso 主控台建立資料庫快照 / 備份。')
  } else {
    say('⚠️ 偵測到下列需人工確認的項目，處理完再動正式庫：')
    warnings.forEach((w, i) => say(`  ${i + 1}. ${w}`))
  }
  say('')
  say('（本次檢查全程唯讀，未對遠端資料庫做任何修改。）')
  say('=========================================================')

  console.log(out.join('\n'))
  await client.close()
}

try {
  await main()
} catch (err) {
  // 錯誤訊息可能夾帶連線字串，只印訊息本身並額外標註 safeHost；絕不印完整 DATABASE_URL。
  console.error(`檢查失敗（目標 ${safeHost(url)}）：${redact(err.message)}`)
  console.error('')
  console.error('常見原因：')
  console.error('  - DATABASE_AUTH_TOKEN 過期或不正確（Turso token 有有效期限）')
  console.error('  - DATABASE_URL 的資料庫名稱 / 區域打錯，或該資料庫已刪除')
  console.error('  - 網路無法連出（Codespace / CI 的對外連線被擋）')
  console.error('請用 `turso db show <db>` 與 `turso db tokens create <db>` 重新取得連線資訊後再試。')
  process.exit(1)
}
