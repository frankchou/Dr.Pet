import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { VET_REFERENCE_SCOPE } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { isDemoUser } from '@/lib/demo'

// demo 帳號的固定示意萃取結果（不打 AI vision）。依 docType 回對應結構：
// product → 成分 / 營養分析；medical → 病歷重點。結構與 AI 路徑回傳的 extracted 一致。
const DEMO_PRODUCT_EXTRACT = {
  ingredients: [
    '去骨鮭魚', '鮭魚粉', '馬鈴薯', '豌豆', '雞脂（混合生育醇保存）',
    '鮭魚油', '亞麻仁籽', '乾燥甜菜漿', '氯化鉀', '牛磺酸', '綜合維生素與礦物質',
  ],
  protein_sources: ['鮭魚', '鮭魚粉'],
  additives: ['混合生育醇（天然保存劑）'],
  functional_ingredients: ['鮭魚油（Omega-3）', '牛磺酸', '綜合維生素', '綜合礦物質'],
  nutritional_facts: [
    { name: '粗蛋白', value: 26.0, unit: '%' },
    { name: '粗脂肪', value: 15.0, unit: '%' },
    { name: '粗纖維', value: 3.5, unit: '%' },
    { name: '水分', value: 10.0, unit: '%' },
    { name: '粗灰分', value: 7.0, unit: '%' },
    { name: '鈣', value: 1.2, unit: '%' },
    { name: '磷', value: 1.0, unit: '%' },
  ],
  raw_text:
    '成分：去骨鮭魚、鮭魚粉、馬鈴薯、豌豆、雞脂（以混合生育醇保存）、鮭魚油、亞麻仁籽、乾燥甜菜漿、氯化鉀、牛磺酸、綜合維生素與礦物質。\n保證分析值：粗蛋白 26%、粗脂肪 15%、粗纖維 3.5%、水分 10%、粗灰分 7%、鈣 1.2%、磷 1.0%。',
}

const DEMO_MEDICAL_EXTRACT = {
  date: '2026-05-18',
  reason: '皮膚反覆搔癢、紅疹',
  diagnosis: ['過敏性皮膚炎', '輕度耳道發炎'],
  medications: ['抗組織胺（口服）', '外用消炎藥膏', '耳道清潔液'],
  recommendations: ['更換為單一動物性蛋白配方並觀察', '兩週後回診追蹤皮膚狀況', '維持環境清潔與除濕'],
  raw_text:
    '就診日期：2026/05/18。主訴：皮膚反覆搔癢、紅疹。診斷：過敏性皮膚炎、輕度耳道發炎。處置：抗組織胺、外用消炎藥膏、耳道清潔液。建議：飲食調整、兩週後回診。',
}

const ALLOWED_TYPES: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg':  'image/jpeg',
  'image/png':  'image/png',
  'image/gif':  'image/gif',
  'image/webp': 'image/webp',
}

export async function POST(request: NextRequest) {
  try {
    // 接受 FormData（直接傳檔案，避免 base64 JSON 超過大小限制）
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const docType = formData.get('docType') as string | null

    if (!file || !docType) {
      return NextResponse.json({ error: 'file 和 docType 為必填' }, { status: 400 })
    }

    // demo 帳號：回固定示意萃取結果，不打 AI vision。此 endpoint 原本無 auth，
    // 故僅為判 demo 取 session；非 demo（含無 session）維持原行為。
    const session = await auth()
    if (isDemoUser(session)) {
      const extracted = docType === 'product' ? DEMO_PRODUCT_EXTRACT : DEMO_MEDICAL_EXTRACT
      return NextResponse.json({ extracted })
    }

    // 檢查大小（限制 20MB）
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: '檔案過大，請上傳 20MB 以內的圖片' }, { status: 413 })
    }

    // 讀取檔案 bytes 並轉 base64（在 server 端處理，避免瀏覽器限制）
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // 確認 media type
    const rawType = file.type.toLowerCase()
    const mediaType = ALLOWED_TYPES[rawType] ?? 'image/jpeg'

    const systemPrompt =
      `You are a veterinary nutrition assistant. Extract ingredients from product labels or key info from medical records. Return JSON only, no markdown.\n${VET_REFERENCE_SCOPE}`

    let userPrompt = ''
    if (docType === 'product') {
      userPrompt = `You are analyzing a pet food product label. Extract ALL information carefully.

IMPORTANT - Find and extract the nutritional analysis section. This section is commonly labeled:
- 「營養分析」or「營養成分分析」
- 「保證分析值」or「成分分析保證值」
- 「Guaranteed Analysis」
- 「Nutritional Facts」or「Nutrition Facts」
- A table/list showing percentages like 粗蛋白 XX%, 粗脂肪 XX%, 水分 XX%, etc.

Extract EVERY row from that section, including but not limited to:
粗蛋白 (Crude Protein), 粗脂肪 (Crude Fat), 粗纖維 (Crude Fiber), 水分 (Moisture),
粗灰分 (Crude Ash), 鈣 (Calcium), 磷 (Phosphorus), 鈉 (Sodium), 鎂 (Magnesium),
牛磺酸 (Taurine), 鋅 (Zinc), EPA, DHA, Omega-3, Omega-6, and any other listed values.

Return this JSON object (only JSON, no other text):
{
  "ingredients": ["complete list of all ingredients in order"],
  "protein_sources": ["chicken", "salmon", etc.],
  "additives": ["preservatives", "colorings", "flavor enhancers"],
  "functional_ingredients": ["vitamins", "minerals", "probiotics", "taurine", etc.],
  "nutritional_facts": [
    {"name": "粗蛋白", "value": 28.0, "unit": "%"},
    {"name": "粗脂肪", "value": 15.0, "unit": "%"},
    {"name": "水分", "value": 10.0, "unit": "%"},
    {"name": "粗纖維", "value": 3.0, "unit": "%"},
    {"name": "粗灰分", "value": 7.0, "unit": "%"}
  ],
  "raw_text": "complete raw text of ingredients and nutritional analysis as seen on label"
}

Rules:
- nutritional_facts: extract ALL values from the 營養分析/保證分析值 table — do not skip any row
- Use the exact Chinese name as printed on the label for each nutrient
- For units: use "%" for percentages, "mg/kg" for milligrams per kg, "IU/kg" for international units
- If multiple sections exist (e.g. dry matter basis vs as-fed), use the as-fed values
- If no nutritional analysis section is visible anywhere, return nutritional_facts as []
- Use Traditional Chinese for all text`
    } else {
      userPrompt = `Extract key information from this veterinary medical record. Return a JSON object with these fields:
{
  "date": "visit date if found",
  "reason": "reason for visit",
  "diagnosis": ["list of diagnoses"],
  "medications": ["list of medications prescribed"],
  "recommendations": ["list of recommendations"],
  "raw_text": "relevant raw text from record"
}`
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: userPrompt },
          ],
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

    let extracted: unknown
    try {
      const cleaned = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      extracted = JSON.parse(cleaned)
    } catch {
      extracted = { raw_text: content.text }
    }

    return NextResponse.json({ extracted })
  } catch (error) {
    console.error('POST /api/extract error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('credit balance is too low') || msg.includes('insufficient_quota')) {
      return NextResponse.json({ error: 'AI 服務餘額不足，請至 console.anthropic.com 加值後再試。' }, { status: 402 })
    }
    if (msg.includes('Could not process image') || msg.includes('invalid_request')) {
      return NextResponse.json({ error: '圖片格式不支援，請上傳 JPG、PNG 或 WebP 格式。' }, { status: 400 })
    }
    if (msg.includes('API key')) {
      return NextResponse.json({ error: 'API Key 未設定，請在 .env 填入 ANTHROPIC_API_KEY。' }, { status: 401 })
    }
    return NextResponse.json({ error: `AI 分析失敗：${msg}` }, { status: 500 })
  }
}
