/**
 * Prisma seed 腳本 — 為 demo 帳號建立完整 mock 資料
 * 執行方式：DATABASE_URL="file:./prisma/dev.db" npx prisma db seed
 *
 * 使用 upsert 確保可重複執行不重複建立資料。
 */

import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

// ─── 建立 Prisma 用戶端（複用 src/lib/prisma.ts 相同邏輯）─────────────────

function resolveDbUrl(): string {
  const raw = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'dev.db')}`
  if (raw.startsWith('file:') && !raw.startsWith('file:/')) {
    const relative = raw.replace(/^file:/, '')
    return `file:${path.resolve(process.cwd(), relative)}`
  }
  return raw
}

const url = resolveDbUrl()
const authToken = process.env.DATABASE_AUTH_TOKEN
const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url })
const prisma = new PrismaClient({ adapter })

// ─── 常數 ────────────────────────────────────────────────────────────────────

const DEMO_USER_ID = 'demo-user'
const DEMO_EMAIL = 'demo@drpet.com'

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Seed 主流程 ──────────────────────────────────────────────────────────────

async function main() {
  console.log('開始 seed demo 資料…')

  // ── 1. User ──────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      id: DEMO_USER_ID,
      name: '示範飼主',
      email: DEMO_EMAIL,
      nickname: 'demo_owner',
    },
  })
  console.log(`User: ${user.id} (${user.email})`)

  // ── 2. Pet ───────────────────────────────────────────────────────────────
  const pet = await prisma.pet.upsert({
    where: { id: 'demo-pet-pudding' },
    update: {},
    create: {
      id: 'demo-pet-pudding',
      name: '布丁',
      species: 'dog',
      breed: '馬爾濟斯',
      sex: 'female',
      birthday: new Date('2021-03-15'),
      weight: 3.2,
      isNeutered: true,
      mainProblems: JSON.stringify(['digestive', 'skin']),
      allergies: JSON.stringify(['雞肉', '牛肉']),
      userId: user.id,
    },
  })
  console.log(`Pet: ${pet.id} (${pet.name})`)

  // ── 3. DailyMealPlan（今日配餐） ─────────────────────────────────────────
  const today = todayString()

  // 先刪除今日舊資料再重建（DailyMealPlan → MealPlanItem 會 cascade 刪除）
  const existingPlan = await prisma.dailyMealPlan.findUnique({
    where: { petId_date: { petId: pet.id, date: today } },
  })
  if (existingPlan) {
    await prisma.dailyMealPlan.delete({ where: { id: existingPlan.id } })
  }

  const mealPlan = await prisma.dailyMealPlan.create({
    data: {
      petId: pet.id,
      date: today,
      items: {
        create: [
          // 晨間
          {
            session: 'morning',
            customName: '自然本色小型成犬亮白無穀鮭魚配方',
            quantity: 2,
            unit: '平匙',
            tags: JSON.stringify(['狗飼料', '無穀']),
            sortOrder: 0,
          },
          {
            session: 'morning',
            customName: '毛孩時代腸胃專科益生菌',
            quantity: 2,
            unit: '克',
            tags: JSON.stringify(['保健品']),
            sortOrder: 1,
          },
          {
            session: 'morning',
            customName: '新鮮花椰菜',
            quantity: 1,
            unit: '朵',
            tags: JSON.stringify(['鮮食']),
            sortOrder: 2,
          },
          // 晚間
          {
            session: 'evening',
            customName: '自然本色亮白無穀鮭魚',
            quantity: 2,
            unit: '平匙',
            tags: JSON.stringify(['狗飼料']),
            sortOrder: 0,
          },
          {
            session: 'evening',
            customName: '毛孩時代腸胃專科益生菌',
            quantity: 1,
            unit: '克',
            tags: JSON.stringify(['保健品']),
            sortOrder: 1,
          },
          {
            session: 'evening',
            customName: '有機花椰菜',
            quantity: 1,
            unit: '朵',
            tags: JSON.stringify(['鮮食']),
            sortOrder: 2,
          },
        ],
      },
    },
  })
  console.log(`DailyMealPlan: ${mealPlan.id} (${mealPlan.date})`)

  // ── 4. NewsArticle ───────────────────────────────────────────────────────
  const newsSeeds = [
    // 食安警報
    {
      id: 'news-food-safety-1',
      category: 'food_safety',
      subCategory: '食安通報',
      title: '『某品牌貓罐』含菌量檢驗不合格',
      summary:
        '北市抽驗發現某進口品牌含菌量超標，已要求全面下架。請飼主立即停止餵食相同批次產品。',
      isUrgent: true,
      sourceName: '食品藥物管理署',
      publishedAt: new Date('2024-05-15'),
    },
    {
      id: 'news-food-safety-2',
      category: 'food_safety',
      subCategory: '廠商警告',
      title: '廠商誠信警告：非法添加物疑雲',
      summary:
        '部分代工廠遭踢爆使用非許可等級之防腐劑，相關品牌正進行自主檢驗中。',
      isUrgent: false,
      sourceName: '農業部',
      publishedAt: new Date('2024-05-10'),
    },
    {
      id: 'news-food-safety-3',
      category: 'food_safety',
      subCategory: '食安通報',
      title: '農業部公告：市售進口飼料黴菌毒素抽驗結果',
      summary:
        '本次抽驗共 42 件樣本，3 件黃麴毒素超標，相關業者已接獲通知下架回收。',
      isUrgent: false,
      sourceName: '農業部動植物防疫檢疫署',
      publishedAt: new Date('2024-05-01'),
    },
    // 危險禁忌
    {
      id: 'news-danger-1',
      category: 'danger',
      subCategory: '地雷食物',
      title: '絕對禁食：巧克力、葡萄、洋蔥',
      summary:
        '葡萄與葡萄乾可能導致急性腎衰竭；洋蔥與大蒜會破壞紅血球引起貧血。此外，含有『木糖醇』的無糖口香糖對犬貓具有致命毒性。',
      isUrgent: false,
    },
    {
      id: 'news-danger-2',
      category: 'danger',
      subCategory: '室內植物',
      title: '貓咪殺手：百合花、萬年青',
      summary:
        '百合科植物對貓咪極其危險，即便是吸入花粉也可能導致器官衰竭。常見的黃金葛、虎尾蘭若誤食也會造成口腔紅腫與腸胃不適。',
      isUrgent: false,
    },
    // 健康知識
    {
      id: 'news-health-1',
      category: 'health',
      subCategory: null,
      title: '犬貓低溫烘烤糧：最新營養研究',
      summary:
        '最新研究顯示，低溫加工技術能有效保留更多蛋白質中的天然酵素與微量營養素。',
      isUrgent: false,
      sourceName: '美國獸醫營養學會 (AVMA)',
      sourceUrl: 'https://www.avma.org',
    },
    {
      id: 'news-health-2',
      category: 'health',
      subCategory: null,
      title: '如何從成分表辨識優質蛋白質來源',
      summary:
        '學會看懂『肉類副產品』與『脫水肉粉』的差異，給予毛孩最純粹的食材原型。',
      isUrgent: false,
      sourceName: '寵物營養師專欄',
      sourceUrl: 'https://www.petmd.com',
    },
  ]

  for (const article of newsSeeds) {
    const { id, subCategory, publishedAt, sourceName, sourceUrl, ...rest } = article
    await prisma.newsArticle.upsert({
      where: { id },
      update: {},
      create: {
        id,
        subCategory: subCategory ?? undefined,
        publishedAt: publishedAt ?? undefined,
        sourceName: sourceName ?? undefined,
        sourceUrl: sourceUrl ?? undefined,
        ...rest,
      },
    })
  }
  console.log(`NewsArticle: ${newsSeeds.length} 筆`)

  console.log('Seed 完成！')
}

main()
  .catch((err) => {
    console.error('Seed 失敗：', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
