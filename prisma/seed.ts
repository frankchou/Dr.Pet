/**
 * Prisma seed 腳本 — 為 demo 帳號建立完整 mock 資料
 * 執行方式：npx prisma db seed
 * 可重複執行（upsert 保護），不會重複新增。
 */

import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

function resolveDbUrl(): string {
  const raw = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'dev.db')}`
  if (raw.startsWith('file:') && !raw.startsWith('file:/')) {
    return `file:${path.resolve(process.cwd(), raw.replace(/^file:/, ''))}`
  }
  return raw
}

const url = resolveDbUrl()
const authToken = process.env.DATABASE_AUTH_TOKEN
const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url })
const prisma = new PrismaClient({ adapter })

const DEMO_EMAIL    = 'demo@drpet.com'
const DEMO_USER_ID  = 'demo-user'
const DEMO_PET_ID   = 'demo-pet-pudding'

function dateStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

async function main() {
  console.log('▶ 開始 seed demo 資料…')

  // ── 1. User ───────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where:  { email: DEMO_EMAIL },
    update: {},
    create: {
      id:       DEMO_USER_ID,
      name:     '示範飼主',
      email:    DEMO_EMAIL,
      nickname: 'demo_owner',
    },
  })
  console.log(`  User: ${user.id}`)

  // ── 2. Pet ────────────────────────────────────────────────────────────────
  const pet = await prisma.pet.upsert({
    where:  { id: DEMO_PET_ID },
    update: {},
    create: {
      id:           DEMO_PET_ID,
      name:         '布丁',
      species:      'dog',
      breed:        '馬爾濟斯',
      sex:          'female',
      birthday:     new Date('2021-03-15'),
      weight:       3.2,
      isNeutered:   true,
      mainProblems: JSON.stringify(['digestive', 'skin']),
      allergies:    JSON.stringify(['雞肉', '牛肉']),
      userId:       user.id,
    },
  })
  console.log(`  Pet: ${pet.id} (${pet.name})`)

  // ── 3. DailyHealthLog — 本月前 20 天（含今日）────────────────────────────
  // 每次呼叫 dateStr 都重新計算，避免跨日誤差
  // 分佈比例：60% 正常、20% 活動高/軟便、10% 疲倦/慢食/眼耳、10% 皮膚+消化異常
  type LogTemplate = {
    vitality: string
    appetite: string
    waterMl: number
    waterStatus: string
    stoolType: string
    urineStatus: string
    mood: string
    skinHair: string
    eyeEar: string
    dental: string
    digestion: string
    respiratory: string
    neuro: string
    reproductive: string
    dailyChecklist: string
    dietStatusTab: string
    mealStatuses: string
    stoolDetails: string
  }

  function makeLog(offset: number): { date: string } & LogTemplate {
    const date = dateStr(offset)
    const idx = Math.abs(offset) % 10

    // 0–5：正常（60%）
    if (idx <= 5) {
      return {
        date, vitality: '精神飽滿', appetite: '食慾正常',
        waterMl: 280 + (idx * 10), waterStatus: '飲水正常',
        stoolType: '正常成形', stoolDetails: '[]', urineStatus: '尿量正常',
        mood: JSON.stringify(['平靜放鬆']),
        skinHair: '[]', eyeEar: '[]', dental: '[]', digestion: '[]',
        respiratory: '[]', neuro: '[]', reproductive: '[]',
        dailyChecklist: JSON.stringify(['刷牙清潔', '日常散步', '梳毛護理']),
        dietStatusTab: 'all', mealStatuses: '{}',
      }
    }
    // 6–7：活動意願高 + 軟便（20%）
    if (idx <= 7) {
      return {
        date, vitality: '活動意願高', appetite: '胃口極佳',
        waterMl: 310, waterStatus: '飲水正常',
        stoolType: '軟便', stoolDetails: '[]', urineStatus: '尿量正常',
        mood: JSON.stringify(['活潑好動']),
        skinHair: '[]', eyeEar: '[]', dental: '[]', digestion: '[]',
        respiratory: '[]', neuro: '[]', reproductive: '[]',
        dailyChecklist: JSON.stringify(['日常散步']),
        dietStatusTab: 'all', mealStatuses: '{}',
      }
    }
    // 8：疲倦 + 慢食 + 眼耳（10%）
    if (idx === 8) {
      return {
        date, vitality: '異常疲倦', appetite: '猶豫慢食',
        waterMl: 150, waterStatus: '幾乎沒喝',
        stoolType: '正常成形', stoolDetails: '[]', urineStatus: '頻尿蹲',
        mood: '[]',
        skinHair: '[]', eyeEar: JSON.stringify(['流淚淚痕']),
        dental: '[]', digestion: '[]', respiratory: '[]', neuro: '[]', reproductive: '[]',
        dailyChecklist: JSON.stringify(['梳毛護理']),
        dietStatusTab: 'reduced',
        mealStatuses: JSON.stringify({ morning: 'done', evening: 'reduced' }),
      }
    }
    // 9：皮膚 + 消化異常（10%）
    return {
      date, vitality: '精神飽滿', appetite: '挑食偏食',
      waterMl: 200, waterStatus: '飲水正常',
      stoolType: '帶黏液', stoolDetails: '[]', urineStatus: '尿量正常',
      mood: JSON.stringify(['焦躁不安']),
      skinHair: JSON.stringify(['頻繁抓搔', '掉毛嚴重']),
      eyeEar: '[]', dental: '[]',
      digestion: JSON.stringify(['嘔吐']),
      respiratory: '[]', neuro: '[]', reproductive: '[]',
      dailyChecklist: JSON.stringify(['梳毛護理']),
      dietStatusTab: 'reduced',
      mealStatuses: JSON.stringify({ morning: 'done', evening: 'refused' }),
    }
  }

  let healthLogCount = 0
  for (let offset = -19; offset <= 0; offset++) {
    const log = makeLog(offset)
    await prisma.dailyHealthLog.upsert({
      where:  { petId_date: { petId: pet.id, date: log.date } },
      update: log,
      create: { petId: pet.id, ...log },
    })
    healthLogCount++
  }
  console.log(`  DailyHealthLog: ${healthLogCount} 筆（本月前 20 天）`)

  // ── 4. HealthMetric（今日）────────────────────────────────────────────────
  await prisma.healthMetric.upsert({
    where:  { petId_date: { petId: pet.id, date: dateStr(0) } },
    update: { vitality: 'high', waterIntake: 'medium', bodyScore: 5 },
    create: { petId: pet.id, date: dateStr(0), vitality: 'high', waterIntake: 'medium', bodyScore: 5 },
  })
  console.log('  HealthMetric: 今日已建立')

  // ── 5. MeasurementRecord（今日）──────────────────────────────────────────
  await prisma.measurementRecord.upsert({
    where:  { id: `demo-measure-${dateStr(0)}` },
    update: {},
    create: {
      id:           `demo-measure-${dateStr(0)}`,
      petId:        pet.id,
      date:         dateStr(0),
      weightKg:     3.2,
      bodyCondition: 'normal',
      rrr:          20,
      tempMethod:   'rectal',
      tempCelsius:  38.5,
    },
  })
  console.log('  MeasurementRecord: 今日已建立')

  // ── 6. MedicationRecord ───────────────────────────────────────────────────
  await prisma.medicationRecord.upsert({
    where:  { id: `demo-med-${dateStr(-7)}` },
    update: {},
    create: {
      id:            `demo-med-${dateStr(-7)}`,
      petId:         pet.id,
      date:          dateStr(-7),
      vaccines:      JSON.stringify([]),
      deworming:     JSON.stringify(['新疥爽（滴劑）']),
      prescriptions: JSON.stringify([]),
      clinicVisits:  JSON.stringify([]),
    },
  })
  console.log('  MedicationRecord: 1 筆')

  // ── 7. GroomingRecord ─────────────────────────────────────────────────────
  await prisma.groomingRecord.upsert({
    where:  { id: `demo-groom-${dateStr(-3)}` },
    update: {},
    create: {
      id:    `demo-groom-${dateStr(-3)}`,
      petId: pet.id,
      date:  dateStr(-3),
      mode:  'home',
    },
  })
  console.log('  GroomingRecord: 1 筆')

  // ── 8. Product + ProductUsage（使用中產品）────────────────────────────────
  const products = [
    { id: 'demo-prod-1', type: 'feed',       name: '自然本色無穀鮭魚配方', brand: 'Natural Balance' },
    { id: 'demo-prod-2', type: 'supplement', name: '毛孩時代腸胃益生菌',    brand: '毛孩時代' },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where:  { id: p.id },
      update: {},
      create: {
        id:    p.id,
        type:  p.type,
        name:  p.name,
        brand: p.brand,
        ingredientJson: '{}',
      },
    })
    // PetProduct 沒有複合唯一索引，改用 findFirst + create
    const existing = await prisma.petProduct.findFirst({
      where: { petId: pet.id, productId: p.id },
    })
    if (!existing) {
      await prisma.petProduct.create({
        data: { petId: pet.id, productId: p.id, listType: 'fixed' },
      })
    }
  }
  console.log(`  Product + PetProduct: ${products.length} 筆`)

  console.log('')
  console.log('✅ Seed 完成！')
  console.log(`   Pet ID：${pet.id}`)
  console.log('   請到「設定頁」選擇「布丁」作為當前寵物，')
  console.log('   或直接在 localStorage 設定 drpet_currentPetId = "demo-pet-pudding"')
}

main()
  .catch((err) => { console.error('Seed 失敗：', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
