import { Prisma } from '@prisma/client'
import type { User } from '@prisma/client'
import { prisma } from './prisma'

/**
 * 登入時確保 User 這一列存在。
 *
 * 本專案用 `session: { strategy: 'jwt' }` 且**沒有掛 PrismaAdapter**，所以 NextAuth
 * 不會替我們寫任何一列 User —— session 完全活在 cookie 裡的 JWT。但 schema 中
 * `Pet.userId`、`PetMember.userId`、`PushSubscription.userId`、`Account.userId`
 * 都是指向 `User.id` 的外鍵，libSQL 連線的 `PRAGMA foreign_keys` 預設為 ON，
 * 因此使用者一按「新增毛孩」就會撞 P2003（外鍵違反）。這支函式補上那一列。
 *
 * 設計原則：
 *   - `User.id` 直接沿用 provider 的使用者識別碼（Google 為 sub），
 *     讓 `session.user.id` 的語意維持「這一列 User 的 id」不變。
 *   - 只在登入當下呼叫一次，之後的請求都讀 cookie 裡的 JWT，不再打資料庫。
 */

const UNIQUE_CONSTRAINT = 'P2002'

export type ProvisionUserInput = {
  /** provider 給的穩定使用者識別碼（Google 為 `sub`），直接當作 `User.id`。 */
  providerUserId: string
  email?: string | null
  /** provider 是否已驗證這個 email。未驗證者不參與 email 帳號連結。 */
  emailVerified: boolean
  name?: string | null
  image?: string | null
}

export type ProvisionUserResult =
  | { ok: true; userId: string }
  | { ok: false; error: string }

export async function provisionUser(
  input: ProvisionUserInput
): Promise<ProvisionUserResult> {
  if (!input.providerUserId) {
    return { ok: false, error: '登入資訊缺少使用者識別碼' }
  }

  try {
    return await resolveUser(input)
  } catch (error) {
    // 同一使用者開兩個分頁同時登入時，兩邊都會查不到 User 而各自 create，
    // 其中一邊必然撞唯一鍵。這不是真的失敗：重跑一次就會走到「已存在 → 更新」分支。
    if (isUniqueConstraintError(error)) {
      try {
        return await resolveUser(input)
      } catch (retryError) {
        console.error('[auth] provisionUser 重試後仍失敗:', retryError)
        return { ok: false, error: '建立使用者資料失敗' }
      }
    }
    console.error('[auth] provisionUser 失敗:', error)
    return { ok: false, error: '建立使用者資料失敗' }
  }
}

async function resolveUser(
  input: ProvisionUserInput
): Promise<ProvisionUserResult> {
  const { providerUserId, name, image } = input
  const email = normalizeEmail(input.email)
  // 未驗證的 email 一律不拿來比對或寫入，否則任何人只要在自家 IdP 填上他人信箱
  // 就能接管既有帳號。Google 正常帳號的 email_verified 恆為 true。
  const trustedEmail = input.emailVerified ? email : null

  const byId = await prisma.user.findUnique({ where: { id: providerUserId } })
  if (byId) {
    await syncProfile(byId, { email: trustedEmail, name, image })
    return { ok: true, userId: byId.id }
  }

  if (trustedEmail) {
    const byEmail = await prisma.user.findUnique({ where: { email: trustedEmail } })
    if (byEmail) {
      // `User.email` 有唯一約束，這個 email 已被別筆佔用（v1 暱稱使用者、demo 帳號，
      // 或先前以其他 provider 建立的列）。此時 create 一定會炸；另開一筆分身帳號
      // 又會讓使用者跟自己既有的寵物、成員資格失聯。因此改為「沿用既有那一列」，
      // 並把 session.user.id 指向它 —— 語意仍是「這一列 User 的 id」，只是不等於 provider sub。
      await syncProfile(byEmail, { email: null, name, image })
      return { ok: true, userId: byEmail.id }
    }
  }

  // email 為 null（未提供或未驗證）時刻意留空：SQLite 唯一索引允許多筆 NULL，
  // 而寫入未驗證的 email 反倒會擋掉日後真正持有該信箱的人。
  const created = await prisma.user.create({
    data: {
      id: providerUserId,
      email: trustedEmail,
      emailVerified: trustedEmail ? new Date() : null,
      name: name ?? null,
      image: image ?? null,
    },
  })
  return { ok: true, userId: created.id }
}

type ProfilePatch = {
  /** 傳 null 代表這次不動 email（例如剛以 email 找到既有列，值本來就一樣）。 */
  email: string | null
  name?: string | null
  image?: string | null
}

/**
 * 把 provider 的個資同步進既有的 User 列。
 * 只寫真的有變的欄位，並且**完全不碰 `nickname`** —— 那是 v1 使用者自己取的顯示名稱，
 * 不該被 OAuth profile 蓋掉。
 */
async function syncProfile(existing: User, patch: ProfilePatch): Promise<void> {
  const data: Prisma.UserUpdateInput = {}
  if (patch.name && patch.name !== existing.name) data.name = patch.name
  if (patch.image && patch.image !== existing.image) data.image = patch.image
  if (patch.email && patch.email !== existing.email) {
    data.email = patch.email
    data.emailVerified = existing.emailVerified ?? new Date()
  }
  if (Object.keys(data).length === 0) return

  try {
    await prisma.user.update({ where: { id: existing.id }, data })
  } catch (error) {
    // 使用者換綁 Google 信箱、而新信箱已被另一列佔用時會撞唯一鍵。
    // 此時 User 這一列已經存在，外鍵不會壞，個資同步失敗不該擋住登入 —— 記錄後放行。
    if (isUniqueConstraintError(error)) {
      console.warn(
        `[auth] 使用者 ${existing.id} 的 profile 同步遇到唯一鍵衝突，已略過 email 更新`
      )
      return
    }
    throw error
  }
}

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT
  )
}
