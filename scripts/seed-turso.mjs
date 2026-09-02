/**
 * 把 dev.db 的測試資料搬到 Turso
 * 用法：DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." node scripts/seed-turso.mjs
 */
import { createClient } from '@libsql/client'
import { execSync } from 'child_process'
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
//   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." node scripts/seed-turso.mjs
if (url.startsWith('file:')) {
  console.error('拒絕執行：DATABASE_URL 指向本機檔案 (' + url + ')，本腳本只能對遠端 Turso 執行。')
  console.error('請以行內環境變數指定：DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." node scripts/seed-turso.mjs')
  process.exit(1)
}

// ⚠️ 本腳本會把 dev.db 的「測試假資料」寫進遠端資料庫。
// 若誤對正式庫執行，正式環境會混入 demo 布丁、測試帳號等假資料，且難以完全清除。
// 因此除了連線資訊外，另要求明示確認，避免手滑或複製貼上就執行。
if (process.env.CONFIRM_SEED_PROD !== 'yes') {
  console.error('拒絕執行：本腳本會把 dev.db 的測試假資料寫入遠端資料庫。')
  console.error('確認要這麼做請加上 CONFIRM_SEED_PROD=yes。')
  console.error('（正式站絕不該執行本腳本——正式庫只跑 migration，不灌 seed。）')
  process.exit(1)
}

const client = createClient({ url, authToken })

// 資料表遷移順序（依外鍵依賴）
const TABLES = [
  'User',
  'Pet',
  'Product',
  'PetProduct',
  'ProductUsage',
  'SymptomEntry',
  'AIInsight',
  'ChatMessage',
  'WeeklyTask',
  'NutritionAnalysis',
  'InstantAnalysis',
  'ProductRecommendationResult',
  'CommunityRec',
  'Document',
  'ProductReaction',
]

function getRows(table) {
  try {
    const json = execSync(
      `sqlite3 dev.db -json "SELECT * FROM \\"${table}\\""`,
      { encoding: 'utf-8' }
    ).trim()
    return json ? JSON.parse(json) : []
  } catch {
    return []
  }
}

for (const table of TABLES) {
  const rows = getRows(table)
  if (rows.length === 0) {
    console.log(`  ─ ${table}: 0 筆，跳過`)
    continue
  }

  console.log(`→ ${table}: 搬移 ${rows.length} 筆...`)
  let success = 0

  for (const row of rows) {
    const cols = Object.keys(row)
    const placeholders = cols.map(() => '?').join(', ')
    const values = cols.map(c => row[c])
    const sql = `INSERT OR IGNORE INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
    try {
      await client.execute({ sql, args: values })
      success++
    } catch (e) {
      console.warn(`  ⚠ 第 ${success + 1} 筆失敗：${e.message.slice(0, 80)}`)
    }
  }
  console.log(`  ✓ ${success}/${rows.length} 筆完成`)
}

console.log('\n資料遷移完成！')
await client.close()
