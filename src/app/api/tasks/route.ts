import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { parseJson, symptomTypeLabel, VET_REFERENCE_SCOPE } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess, requirePetAccessByRecord } from '@/lib/petAccess'
import { isDemoUser } from '@/lib/demo'

// demo 帳號的固定示意本週健康任務（不打 AI）。內容代表性涵蓋觀察 / 飲食 / 護理，
// 結構與 AI 路徑解析出的 tasksData 一致（title + 可選 description）。
const DEMO_WEEKLY_TASKS: Array<{ title: string; description?: string }> = [
  { title: '每日記錄皮膚搔抓狀況', description: '觀察搔抓頻率與部位，方便追蹤趨勢' },
  { title: '維持單一蛋白飲食試行', description: '本週不更換主食，觀察過敏反應變化' },
  { title: '確保每日飲水充足', description: '可增加濕食比例，協助代謝' },
  { title: '補充 Omega-3 魚油', description: '依體重給予適量，支持皮膚與毛髮健康' },
  { title: '檢查耳道清潔', description: '每週清潔 1-2 次，留意異味或紅腫' },
  { title: '每日適度運動與互動', description: '維持活力與情緒穩定' },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')

    // petId 改必填：無 petId 則無從驗權限（原本回全站資料屬漏洞）
    if (!petId) return NextResponse.json({ error: 'petId is required' }, { status: 400 })

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const tasks = await prisma.weeklyTask.findMany({
      where: { petId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { petId } = body

    if (!petId) {
      return NextResponse.json({ error: 'petId is required' }, { status: 400 })
    }

    // AI route：先驗權限再呼叫 anthropic，避免無權者燒 token
    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    let tasksData: Array<{ title: string; description?: string }>

    // demo 帳號：用固定示意任務，不打 AI。仍走下方刪舊建新流程讓清單正常更新。
    if (isDemoUser(session)) {
      tasksData = DEMO_WEEKLY_TASKS
    } else {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentSymptoms = await prisma.symptomEntry.findMany({
        where: { petId, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      const mainProblems = parseJson<string[]>(pet.mainProblems, [])

      const prompt = `幫寵物「${pet.name}」（${pet.species}）制定本週健康管理任務清單。
${VET_REFERENCE_SCOPE}


主要健康問題：${mainProblems.map((p: string) => symptomTypeLabel(p)).join('、') || '無特別問題'}
近期症狀：${
  recentSymptoms.length > 0
    ? recentSymptoms.map((s) => `${symptomTypeLabel(s.symptomType)}(嚴重度${s.severity})`).join('、')
    : '無'
}

請生成5-7個本週健康管理任務，以JSON陣列格式回答：
[
  {"title": "任務標題", "description": "任務說明（可選）"},
  ...
]`

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.content[0]
      if (content.type !== 'text') throw new Error('Unexpected response')

      try {
        const cleanedText = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        tasksData = JSON.parse(cleanedText)
      } catch {
        tasksData = [{ title: '每日觀察寵物狀態', description: '記錄任何異常症狀' }]
      }
    }

    // Delete old incomplete tasks for this pet
    await prisma.weeklyTask.deleteMany({
      where: { petId, completed: false },
    })

    // Create new tasks
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const newTasks = await prisma.weeklyTask.createMany({
      data: tasksData.map((t) => ({
        petId,
        title: t.title,
        description: t.description || null,
        completed: false,
        dueDate: nextWeek,
      })),
    })

    const tasks = await prisma.weeklyTask.findMany({
      where: { petId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tasks, count: newTasks.count }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks error:', error)
    return NextResponse.json({ error: 'Failed to generate tasks' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, completed } = body

    if (!taskId || completed === undefined) {
      return NextResponse.json(
        { error: 'taskId and completed are required' },
        { status: 400 }
      )
    }

    // 由 taskId 反查所屬寵物驗權限（W 級：owner + co_owner），擋跨寵物越權
    const session = await auth()
    const access = await requirePetAccessByRecord('weeklyTask', taskId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const task = await prisma.weeklyTask.update({
      where: { id: taskId },
      data: { completed },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('PATCH /api/tasks error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
