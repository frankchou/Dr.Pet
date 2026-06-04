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

// 🔴 防呆：seed 只能對本機 SQLite（file:）執行。
// 正式站 DATABASE_URL 指向 Turso（libsql://...），誤跑會把假資料寫進正式庫。
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
  console.error('✋ 中止 seed：DATABASE_URL 不是本機 SQLite（file:）。')
  console.error(`   目前 DATABASE_URL = ${process.env.DATABASE_URL}`)
  console.error('   seed 只允許對本機 dev.db 執行，請改用：')
  console.error('   DATABASE_URL="file:./dev.db" npx prisma db seed')
  process.exit(1)
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

  // ── 2b. Owner membership ────────────────────────────────────────────────────
  // requirePetAccess 已用雙重判定（Pet.userId 即視為 owner），此處補一筆 owner member
  // 作保險，使 demo 寵物與「建立寵物即建 owner membership」的正式流程資料一致。
  await prisma.petMember.upsert({
    where:  { petId_userId: { petId: pet.id, userId: user.id } },
    update: {},
    create: { petId: pet.id, userId: user.id, role: 'owner' },
  })

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
    // 共用預設（多選觀察欄位預設空，避免值與 UI 選項對不上）
    const base = {
      skinHair: '[]', eyeEar: '[]', dental: '[]', digestion: '[]',
      respiratory: '[]', neuro: '[]', reproductive: '[]', stoolDetails: '[]',
      dietStatusTab: 'all', mealStatuses: '{}',
      dailyChecklist: JSON.stringify(['刷牙清潔', '日常散步', '梳毛護理']),
    }
    // 6 種彼此不同的每日樣態，依日期輪替 → 連續天數不會長一樣（6/1~6/4 各自不同）。
    // 單選值皆採 schema 註解的合法選項，避免顯示不出來。
    const templates: LogTemplate[] = [
      // T0 良好
      { ...base, vitality: '精神飽滿', appetite: '食慾正常', waterMl: 290, waterStatus: '飲水正常',
        stoolType: '正常成形', urineStatus: '尿量正常', mood: JSON.stringify(['平靜放鬆']) },
      // T1 活力充沛
      { ...base, vitality: '活動意願高', appetite: '胃口極佳', waterMl: 330, waterStatus: '飲水正常',
        stoolType: '正常成形', urineStatus: '尿量正常', mood: JSON.stringify(['平靜放鬆']),
        dailyChecklist: JSON.stringify(['日常散步', '梳毛護理']) },
      // T2 輕微軟便
      { ...base, vitality: '精神飽滿', appetite: '食慾正常', waterMl: 300, waterStatus: '飲水正常',
        stoolType: '便便偏軟', urineStatus: '尿量正常', mood: JSON.stringify(['平靜放鬆']) },
      // T3 疲倦 + 喝得少 + 頻尿
      { ...base, vitality: '異常疲倦', appetite: '猶豫慢食', waterMl: 150, waterStatus: '幾乎沒喝',
        stoolType: '正常成形', urineStatus: '頻尿蹲', mood: '[]',
        dailyChecklist: JSON.stringify(['梳毛護理']),
        dietStatusTab: 'reduced', mealStatuses: JSON.stringify({ morning: 'done', evening: 'reduced' }) },
      // T4 腸胃 + 情緒（挑食、便便偏軟帶黏液、焦躁）
      { ...base, vitality: '精神飽滿', appetite: '挑食偏食', waterMl: 210, waterStatus: '飲水正常',
        stoolType: '便便偏軟', stoolDetails: JSON.stringify(['帶黏液']), urineStatus: '尿量正常',
        mood: JSON.stringify(['焦躁不安']),
        dailyChecklist: JSON.stringify(['梳毛護理']),
        dietStatusTab: 'reduced', mealStatuses: JSON.stringify({ morning: 'done', evening: 'refused' }) },
      // T5 喝水偏多
      { ...base, vitality: '精神飽滿', appetite: '食慾正常', waterMl: 480, waterStatus: '異常狂喝',
        stoolType: '正常成形', urineStatus: '尿量正常', mood: JSON.stringify(['平靜放鬆']) },
    ]
    return { date, ...templates[Math.abs(offset) % templates.length] }
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
  // ingredientJson 結構對照 /api/extract 輸出與 /api/analysis nutritional_facts 期望，
  // 補上範例成分讓 /nutrition 營養圖表有資料可呈現
  const products = [
    {
      id: 'demo-prod-1', type: 'feed', name: '自然本色無穀鮭魚配方', brand: 'Natural Balance',
      ingredient: {
        ingredients: ['鮭魚', '鮭魚粉', '豌豆', '地瓜', '鷹嘴豆', '鮭魚油', '亞麻仁', '乾燥蔓越莓'],
        protein_sources: ['鮭魚', '鮭魚粉'],
        additives: ['混合生育醇（天然抗氧化劑）'],
        functional_ingredients: ['Omega-3 脂肪酸', '維生素 E', '牛磺酸', '葡萄糖胺'],
        nutritional_facts: [
          { name: '粗蛋白', value: 26.0, unit: '%' },
          { name: '粗脂肪', value: 15.0, unit: '%' },
          { name: '粗纖維', value: 4.0, unit: '%' },
          { name: '水分', value: 10.0, unit: '%' },
          { name: '粗灰分', value: 7.5, unit: '%' },
          { name: 'Omega-3 脂肪酸', value: 0.6, unit: '%' },
        ],
        raw_text: '鮭魚、鮭魚粉、豌豆、地瓜、鷹嘴豆、鮭魚油、亞麻仁、乾燥蔓越莓。粗蛋白 26%、粗脂肪 15%、粗纖維 4%、水分 10%、粗灰分 7.5%。',
      },
    },
    {
      id: 'demo-prod-2', type: 'supplement', name: '毛孩時代腸胃益生菌', brand: '毛孩時代',
      ingredient: {
        ingredients: ['菊苣纖維（益生質）', '乳酸菌', '比菲德氏菌', '酵母萃取物', '麥芽糊精'],
        protein_sources: [],
        additives: [],
        functional_ingredients: ['乳酸菌', '比菲德氏菌', '益生質菊苣纖維'],
        nutritional_facts: [
          { name: '粗蛋白', value: 8.0, unit: '%' },
          { name: '粗脂肪', value: 1.5, unit: '%' },
          { name: '粗纖維', value: 12.0, unit: '%' },
          { name: '水分', value: 6.0, unit: '%' },
          { name: '活菌數', value: 50, unit: '億 CFU/g' },
        ],
        raw_text: '菊苣纖維、乳酸菌、比菲德氏菌、酵母萃取物、麥芽糊精。每公克含活菌數 50 億 CFU。',
      },
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where:  { id: p.id },
      update: { ingredientJson: JSON.stringify(p.ingredient) },
      create: {
        id:    p.id,
        type:  p.type,
        name:  p.name,
        brand: p.brand,
        ingredientJson: JSON.stringify(p.ingredient),
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

  // ── 9. SymptomEntry — 多種症狀類型，分布在近兩週 ───────────────────────────
  const symptomEntries = [
    { id: 'demo-symptom-1', symptomType: 'skin',      severity: 3, side: null,    notes: '右後腿頻繁抓搔，皮膚微紅', offset: -12 },
    { id: 'demo-symptom-2', symptomType: 'digestive', severity: 2, side: null,    notes: '晚餐後軟便一次',           offset: -9 },
    { id: 'demo-symptom-3', symptomType: 'ear',       severity: 2, side: 'left',  notes: '左耳搔抓、輕微異味',       offset: -6 },
    { id: 'demo-symptom-4', symptomType: 'tear',      severity: 1, side: 'both',  notes: '輕微淚痕',                 offset: -4 },
    { id: 'demo-symptom-5', symptomType: 'skin',      severity: 2, side: null,    notes: '抓搔頻率較前次下降',       offset: -1 },
  ]
  for (const s of symptomEntries) {
    await prisma.symptomEntry.upsert({
      where:  { id: s.id },
      update: {},
      create: {
        id:          s.id,
        petId:       pet.id,
        symptomType: s.symptomType,
        severity:    s.severity,
        side:        s.side,
        notes:       s.notes,
        photos:      JSON.stringify([]),
        createdAt:   new Date(`${dateStr(s.offset)}T09:00:00.000Z`),
      },
    })
  }
  console.log(`  SymptomEntry: ${symptomEntries.length} 筆`)

  // ── 10. ProductReaction — 每日好/一般/不好評分（@@unique[petId,productId,date]）─
  // 益生菌偏好評，飼料偶有不適，呼應上方症狀紀錄
  const reactions = [
    { productId: 'demo-prod-1', rating: 'ok',   notes: null,           offset: -5 },
    { productId: 'demo-prod-1', rating: 'bad',  notes: '當晚軟便',     offset: -3 },
    { productId: 'demo-prod-1', rating: 'good', notes: null,           offset: -1 },
    { productId: 'demo-prod-2', rating: 'good', notes: '排便狀況改善', offset: -4 },
    { productId: 'demo-prod-2', rating: 'good', notes: null,           offset: -2 },
    { productId: 'demo-prod-2', rating: 'ok',   notes: null,           offset: 0  },
  ]
  for (const r of reactions) {
    const date = dateStr(r.offset)
    await prisma.productReaction.upsert({
      where:  { petId_productId_date: { petId: pet.id, productId: r.productId, date } },
      update: { rating: r.rating, notes: r.notes },
      create: { petId: pet.id, productId: r.productId, date, rating: r.rating, notes: r.notes },
    })
  }
  console.log(`  ProductReaction: ${reactions.length} 筆`)

  // ── 11. ChatMessage — AI 營養師歷史對話 ───────────────────────────────────
  const chatMessages = [
    { id: 'demo-chat-1', role: 'user',      content: '布丁最近一直抓癢，是不是飼料的問題？',                                                               offset: -2 },
    { id: 'demo-chat-2', role: 'assistant', content: '布丁對雞肉、牛肉過敏，目前的鮭魚配方理論上較安全。建議先觀察 7 天抓搔頻率，並留意是否有換新零食。若持續惡化，建議就診皮膚科。', offset: -2 },
    { id: 'demo-chat-3', role: 'user',      content: '益生菌要餐前還是餐後吃？',                                                                           offset: -1 },
    { id: 'demo-chat-4', role: 'assistant', content: '一般益生菌建議隨餐或餐後給予，胃酸較緩和有助菌種存活。每日固定時間給予效果較穩定。',                       offset: -1 },
  ]
  for (let i = 0; i < chatMessages.length; i++) {
    const m = chatMessages[i]
    await prisma.chatMessage.upsert({
      where:  { id: m.id },
      update: {},
      create: {
        id:        m.id,
        petId:     pet.id,
        role:      m.role,
        content:   m.content,
        // 同一天的訊息用分鐘錯開，確保排序穩定
        createdAt: new Date(`${dateStr(m.offset)}T${10 + i}:00:00.000Z`),
      },
    })
  }
  console.log(`  ChatMessage: ${chatMessages.length} 筆`)

  // ── 12. InstantAnalysis — 即時成分掃描歷史 ─────────────────────────────────
  const instantAnalyses = [
    {
      id:      'demo-instant-1',
      verdict: 'safe',
      summary: '此款鮭魚凍乾零食成分單純，未檢出布丁過敏原，可安心給予。',
      result:  { concerns: [], positives: ['單一蛋白來源', '無人工添加物'], ingredients: ['鮭魚', '鮭魚油'] },
      offset:  -8,
    },
    {
      id:      'demo-instant-2',
      verdict: 'caution',
      summary: '含少量雞肉風味成分，布丁對雞肉過敏，建議避免或少量試吃觀察。',
      result:  { concerns: ['含雞肉風味（過敏原）'], positives: ['低脂'], ingredients: ['米', '雞肉風味粉', '蔬菜纖維'] },
      offset:  -5,
    },
    {
      id:      'demo-instant-3',
      verdict: 'danger',
      summary: '成分含木糖醇，對犬隻具毒性，切勿食用。',
      result:  { concerns: ['木糖醇（對犬有毒）'], positives: [], ingredients: ['花生醬', '木糖醇'] },
      offset:  -2,
    },
  ]
  for (const a of instantAnalyses) {
    await prisma.instantAnalysis.upsert({
      where:  { id: a.id },
      update: {},
      create: {
        id:         a.id,
        petId:      pet.id,
        verdict:    a.verdict,
        summary:    a.summary,
        resultJson: JSON.stringify(a.result),
        createdAt:  new Date(`${dateStr(a.offset)}T14:00:00.000Z`),
      },
    })
  }
  console.log(`  InstantAnalysis: ${instantAnalyses.length} 筆`)

  // ── 13. NutritionAnalysis — AI 深度營養分析快取 ───────────────────────────
  const nutritionResult = {
    overallScore: 82,
    summary:      '布丁目前的鮭魚主食搭配腸胃益生菌，整體營養均衡，蛋白質來源避開過敏原。建議補充 Omega-3 以改善皮膚狀況。',
    strengths:    ['避開雞肉、牛肉過敏原', '益生菌有助腸道健康'],
    gaps:         ['皮膚保健的 Omega-3 攝取偏低', '纖維來源可再多元'],
    suggestions:  ['可加入魚油或亞麻仁油', '觀察換食後抓搔頻率變化'],
  }
  await prisma.nutritionAnalysis.upsert({
    where:  { id: 'demo-nutrition-1' },
    update: {},
    create: {
      id:           'demo-nutrition-1',
      petId:        pet.id,
      resultJson:   JSON.stringify(nutritionResult),
      productCount: products.length,
      createdAt:    new Date(`${dateStr(-3)}T16:00:00.000Z`),
    },
  })
  console.log('  NutritionAnalysis: 1 筆')

  // ── 14. AIInsight — 症狀關聯分析結果 ──────────────────────────────────────
  await prisma.aIInsight.upsert({
    where:  { id: 'demo-insight-1' },
    update: {},
    create: {
      id:                 'demo-insight-1',
      petId:              pet.id,
      symptomType:        'skin',
      suspectedTriggers:  JSON.stringify(['含雞肉成分零食', '環境塵蟎']),
      helpfulFactors:     JSON.stringify(['鮭魚單一蛋白主食', '規律梳毛護理']),
      confidence:         'medium',
      rationale:          '近兩週抓搔紀錄多集中在試吃新零食後 1～2 天，避開雞肉成分後抓搔頻率下降，推測與食物過敏原相關。',
      recommendedActions: JSON.stringify(['暫停含雞肉零食', '補充 Omega-3', '持續記錄抓搔頻率 7 天']),
      createdAt:          new Date(`${dateStr(-1)}T11:00:00.000Z`),
    },
  })
  console.log('  AIInsight: 1 筆')

  // ── 15. WeeklyTask — 歷史觀察計畫 ─────────────────────────────────────────
  const weeklyTasks = [
    { id: 'demo-task-1', title: '每日記錄抓搔頻率',     description: '早晚各觀察一次，記錄抓搔次數與部位', completed: true,  due: -2 },
    { id: 'demo-task-2', title: '暫停含雞肉零食一週',   description: '改用鮭魚凍乾作為獎勵',               completed: true,  due: -1 },
    { id: 'demo-task-3', title: '補充 Omega-3 魚油',    description: '隨晚餐給予，觀察皮膚與毛量變化',     completed: false, due: 3  },
    { id: 'demo-task-4', title: '回診皮膚科追蹤',       description: '若抓搔未改善則預約就診',             completed: false, due: 5  },
  ]
  for (const t of weeklyTasks) {
    await prisma.weeklyTask.upsert({
      where:  { id: t.id },
      update: {},
      create: {
        id:          t.id,
        petId:       pet.id,
        title:       t.title,
        description: t.description,
        completed:   t.completed,
        dueDate:     new Date(`${dateStr(t.due)}T00:00:00.000Z`),
      },
    })
  }
  console.log(`  WeeklyTask: ${weeklyTasks.length} 筆`)

  // ── 16. NewsArticle — 三分類各數筆健康快訊 ────────────────────────────────
  const newsArticles = [
    {
      id: 'demo-news-1', category: 'food_safety', subCategory: '飼料召回',
      title: '某品牌乾糧因黃麴毒素超標啟動自主回收',
      summary: '近日某飼料品牌特定批號因黃麴毒素檢出超標，廠商已啟動自主回收。建議飼主核對批號，如有疑慮暫停餵食並洽詢通路。',
      sourceName: '農業部動植物防疫檢疫署', isUrgent: true,  offset: -1,
    },
    {
      id: 'demo-news-2', category: 'food_safety', subCategory: '成分知識',
      title: '挑選零食時該注意的三種隱藏添加物',
      summary: '人工甜味劑、過量鹽分與不明肉粉是常見的隱藏風險。選購時優先看完整成分表，避免「肉類副產品」等模糊標示。',
      sourceName: '寵物營養學會', isUrgent: false, offset: -4,
    },
    {
      id: 'demo-news-3', category: 'danger', subCategory: '有毒食物',
      title: '木糖醇對犬隻劇毒，誤食恐致命',
      summary: '木糖醇常見於無糖口香糖與部分花生醬，犬隻誤食會引發急性低血糖與肝衰竭。家中相關產品務必收好。',
      sourceName: 'ASPCA 動物毒物控制中心', isUrgent: true,  offset: -2,
    },
    {
      id: 'demo-news-4', category: 'danger', subCategory: '居家風險',
      title: '夏季高溫，車內與密閉空間中暑風險升高',
      summary: '即使短時間將寵物留在車內也可能致命。外出散步避開正午，留意喘氣急促、流口水等中暑徵兆。',
      sourceName: '台灣獸醫急診醫學會', isUrgent: false, offset: -6,
    },
    {
      id: 'demo-news-5', category: 'health', subCategory: '皮膚保健',
      title: '反覆抓搔別輕忽，食物過敏與環境過敏的分辨',
      summary: '食物過敏多為全年性、與飲食變化相關；環境過敏常具季節性。建議透過飲食排除法搭配紀錄，協助獸醫判斷。',
      sourceName: '小動物皮膚科醫學會', isUrgent: false, offset: -3,
    },
    {
      id: 'demo-news-6', category: 'health', subCategory: '腸胃保健',
      title: '益生菌怎麼吃才有效？菌數與持續性是關鍵',
      summary: '益生菌需足夠菌數並持續給予才能定殖。換食或腸胃敏感期間補充有助穩定，建議隨餐給予。',
      sourceName: '寵物營養學會', isUrgent: false, offset: -7,
    },
  ]
  for (const n of newsArticles) {
    await prisma.newsArticle.upsert({
      where:  { id: n.id },
      update: {},
      create: {
        id:          n.id,
        category:    n.category,
        subCategory: n.subCategory,
        title:       n.title,
        summary:     n.summary,
        sourceName:  n.sourceName,
        isUrgent:    n.isUrgent,
        publishedAt: new Date(`${dateStr(n.offset)}T08:00:00.000Z`),
        createdAt:   new Date(`${dateStr(n.offset)}T08:00:00.000Z`),
      },
    })
  }
  console.log(`  NewsArticle: ${newsArticles.length} 筆`)

  console.log('')
  console.log('✅ Seed 完成！')
  console.log(`   Pet ID：${pet.id}`)
  console.log('   請到「設定頁」選擇「布丁」作為當前寵物，')
  console.log('   或直接在 localStorage 設定 drpet_currentPetId = "demo-pet-pudding"')
}

main()
  .catch((err) => { console.error('Seed 失敗：', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
