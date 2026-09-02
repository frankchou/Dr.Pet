import { put } from '@vercel/blob'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { isVercelDeployment } from './env'

/**
 * 上傳檔案儲存 —— 一份程式碼、兩種後端。
 *
 * 為什麼要分流：
 *   Vercel 的 Serverless 檔案系統是唯讀的（只有 /tmp 可寫，且函式一結束就消失），
 *   舊寫法 `writeFile(public/uploads/...)` 在正式站必定 500。線上因此改走 Vercel Blob。
 *   但本機 / Codespace 開發沒有（也不該需要）Blob token —— 為了讓 `npm run dev`
 *   在零設定下仍可上傳照片，本機維持寫進 public/uploads/（Next dev server 會直接
 *   以靜態檔案服務，不必額外設定）。
 *
 * 兩條路徑都回相同形狀的 `{ url }`，7 個前端呼叫端不需要知道差別：
 *   Blob  → https://<store>.public.blob.vercel-storage.com/uploads/xxx.jpg
 *   本機  → /uploads/xxx.jpg
 *
 * 環境判斷沿用 `src/lib/env.ts`，不自行用隱晦條件（NODE_ENV 等）推測環境。
 */

/** 單檔上限。手機直出照片多在 3–8MB，10MB 足夠且能擋住誤傳的巨檔。 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** MIME → 副檔名。用來產生檔名，不作為白名單（白名單見 isImageLike）。 */
const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

/** 瀏覽器沒給 MIME type 時，退而以副檔名判斷是否為圖片。 */
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.heic', '.heif'])

/** 比照 `requirePetAccess` 的回傳風格：成功帶 url，失敗帶可直接回給前端的訊息與 HTTP 狀態碼。 */
export type SaveFileResult =
  | { ok: true; url: string }
  | { ok: false; error: string; status: number }

export type SaveFileOptions = {
  /** 檔名前綴，方便在 Blob 後台辨識來源。預設 'upload'。 */
  prefix?: string
  /** 覆寫單檔上限（位元組）。呼叫端已有自己的限制時使用，避免改變既有行為。 */
  maxBytes?: number
}

type StorageDriver = 'blob' | 'local'

/**
 * 決定要用哪個後端。
 *
 * 1. 有 BLOB_READ_WRITE_TOKEN → Blob。顯式訊號優先，本機也可刻意設 token 實測 Blob 路徑。
 * 2. 沒 token 但人在 Vercel（isVercelDeployment）→ 仍回 'blob'。此時 `put()` 會拋出
 *    「找不到 token」這種讀得懂的錯，好過寫唯讀檔案系統噴出難解的 EROFS。
 * 3. 其餘（本機 / Codespace / CI）→ 'local'。
 */
function resolveStorageDriver(): StorageDriver {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob'
  if (isVercelDeployment()) return 'blob'
  return 'local'
}

function fileExtension(file: File): string {
  const fromMime = MIME_EXTENSION[file.type.toLowerCase()]
  if (fromMime) return fromMime
  const fromName = path.extname(file.name).toLowerCase()
  return IMAGE_EXTENSIONS.has(fromName) ? fromName.slice(1) : 'jpg'
}

function generateFilename(file: File, prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now()}-${random}.${fileExtension(file)}`
}

/**
 * 型別檢查刻意寬鬆，以維持向後相容：舊版完全不檢查，而部分行動瀏覽器（iOS 相簿的 HEIC、
 * 部分 Android 檔案選擇器）會給空字串或 application/octet-stream。這兩種情況退回看副檔名，
 * 只擋「明確不是圖片」的 MIME type，避免把真實使用者的照片誤擋在外。
 */
const UNKNOWN_MIME_TYPES = new Set(['', 'application/octet-stream'])

function isImageLike(file: File): boolean {
  const mime = file.type.toLowerCase().trim()
  if (!UNKNOWN_MIME_TYPES.has(mime)) return mime.startsWith('image/')
  return IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase())
}

function validate(file: File, maxBytes: number): SaveFileResult | null {
  if (file.size === 0) {
    return { ok: false, error: '檔案是空的，請重新選擇圖片', status: 400 }
  }
  if (file.size > maxBytes) {
    const mb = Math.floor(maxBytes / 1024 / 1024)
    return { ok: false, error: `檔案過大，請上傳 ${mb}MB 以內的圖片`, status: 413 }
  }
  if (!isImageLike(file)) {
    return { ok: false, error: '只接受圖片檔（JPG / PNG / WebP / GIF / HEIC）', status: 415 }
  }
  return null
}

/**
 * 儲存使用者上傳的圖片，回傳可公開存取的 URL。
 * 不拋例外：外部呼叫（Blob API / 檔案系統）的錯誤一律轉成 `{ ok: false }` 並記 log。
 */
export async function saveUploadedImage(file: File, options: SaveFileOptions = {}): Promise<SaveFileResult> {
  const { prefix = 'upload', maxBytes = MAX_UPLOAD_BYTES } = options

  const invalid = validate(file, maxBytes)
  if (invalid) return invalid

  const filename = generateFilename(file, prefix)

  try {
    if (resolveStorageDriver() === 'blob') {
      const blob = await put(`uploads/${filename}`, file, {
        access: 'public',
        // 檔名已含時間戳 + 亂數，不需要 Blob 再加一層亂碼（保持 URL 可預期）
        addRandomSuffix: false,
        contentType: file.type || undefined,
        // 內容不可變（每次上傳都是新檔名），可安心長快取
        cacheControlMaxAge: 31_536_000,
      })
      return { ok: true, url: blob.url }
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))
    return { ok: true, url: `/uploads/${filename}` }
  } catch (error) {
    console.error('[storage] 圖片儲存失敗:', error)
    const hint = resolveStorageDriver() === 'blob' && !process.env.BLOB_READ_WRITE_TOKEN
      ? '圖片儲存服務未設定（缺 BLOB_READ_WRITE_TOKEN）'
      : '圖片儲存失敗，請稍後再試'
    return { ok: false, error: hint, status: 500 }
  }
}
