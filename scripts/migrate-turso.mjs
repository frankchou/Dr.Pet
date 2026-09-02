/**
 * 把所有 Prisma migration SQL 推上 Turso
 * 用法：DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." node scripts/migrate-turso.mjs
 */
import { createClient } from '@libsql/client'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

config()

const url = process.env.DATABASE_URL
const authToken = process.env.DATABASE_AUTH_TOKEN

if (!url || !authToken) {
  console.error('Missing DATABASE_URL or DATABASE_AUTH_TOKEN in .env')
  process.exit(1)
}

// 方向與 src/lib/prisma.ts 的防呆相反：本腳本「只准」對遠端 Turso 執行。
// devcontainer 的 containerEnv 會把 DATABASE_URL 釘成 file:./dev.db，而 dotenv 不覆蓋
// 既有環境變數 —— 若不擋，照註解直接跑會靜默地把 migration 套進本機檔案，操作者
// 卻以為自己在遷移正式庫。正確用法是行內指定：
//   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." node scripts/migrate-turso.mjs
if (url.startsWith('file:')) {
  console.error('拒絕執行：DATABASE_URL 指向本機檔案 (' + url + ')，本腳本只能對遠端 Turso 執行。')
  console.error('請以行內環境變數指定：DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." node scripts/migrate-turso.mjs')
  process.exit(1)
}

const client = createClient({ url, authToken })

// 建立 _prisma_migrations 追蹤表（若不存在）
await client.execute(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
  )
`)

const migrationsDir = join(process.cwd(), 'prisma/migrations')
const folders = readdirSync(migrationsDir)
  .filter(f => !f.endsWith('.toml'))
  .sort()

for (const folder of folders) {
  // 檢查是否已套用
  const existing = await client.execute({
    sql: 'SELECT id FROM _prisma_migrations WHERE migration_name = ?',
    args: [folder],
  })
  if (existing.rows.length > 0) {
    console.log(`✓ 已套用：${folder}`)
    continue
  }

  const sqlPath = join(migrationsDir, folder, 'migration.sql')
  const sql = readFileSync(sqlPath, 'utf-8')

  // 用分號切割，逐條執行（SQLite 不支援 multi-statement）
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)

  console.log(`→ 套用：${folder}（${statements.length} 條語句）`)
  for (const stmt of statements) {
    await client.execute(stmt)
  }

  // 記錄已套用
  await client.execute({
    sql: `INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count)
          VALUES (?, '', ?, datetime('now'), 1)`,
    args: [crypto.randomUUID(), folder],
  })
  console.log(`  ✓ 完成`)
}

console.log('\n全部 migration 套用完成！')
await client.close()
