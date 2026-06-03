/**
 * 把 dev.db 的測試資料搬到 Turso
 * 用法：node scripts/seed-turso.mjs
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
