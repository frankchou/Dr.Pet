import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveUploadedImage } from '@/lib/storage'

// 儲存後端（Vercel Blob / 本機 public/uploads）由 src/lib/storage.ts 依環境分流，
// 回傳格式維持 { url }，前端 7 個呼叫端不需要調整。
export async function POST(request: NextRequest) {
  try {
    // 需登入才可上傳：Blob 額度是實際費用，開放匿名等於任何人都能燒流量。
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const saved = await saveUploadedImage(file)
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: saved.status })
    }

    return NextResponse.json({ url: saved.url }, { status: 201 })
  } catch (error) {
    console.error('POST /api/upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
