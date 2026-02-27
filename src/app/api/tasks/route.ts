import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { parseJson, symptomTypeLabel } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')

    const tasks = await prisma.weeklyTask.findMany({
      where: petId ? { petId } : undefined,
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

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentSymptoms = await prisma.symptomEntry.findMany({
      where: { petId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const mainProblems = parseJson<string[]>(pet.mainProblems, [])

    const prompt = `幫寵物「${pet.name}」（${pet.species}）制定本週健康管理任務清單。

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

    let tasksData: Array<{ title: string; description?: string }>
    try {
      const cleanedText = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      tasksData = JSON.parse(cleanedText)
    } catch {
      tasksData = [{ title: '每日觀察寵物狀態', description: '記錄任何異常症狀' }]
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
