import { prisma } from './prisma'

type PetAccessResult =
  | { ok: true; role: 'owner' | 'co_owner' }
  | { ok: false; status: 401 | 403 | 404; error: string }

/**
 * 雙重判定寵物存取權限：
 * 1. 若 Pet.userId === userId → owner（涵蓋既有 owner / demo 帳號，即使無 PetMember 紀錄也不被擋）。
 * 2. 否則查 PetMember → 存在則回該 member 的 role（owner / co_owner）。
 * 3. 都沒有 → 403；userId 空 → 401；Pet 不存在 → 404。
 */
export async function requirePetAccess(
  petId: string,
  userId: string
): Promise<PetAccessResult> {
  if (!userId) return { ok: false, status: 401, error: 'Unauthorized' }

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { userId: true },
  })

  if (!pet) return { ok: false, status: 404, error: 'Pet not found' }

  // 先以 Pet.userId 判定 owner，無需依賴 PetMember 紀錄。
  if (pet.userId && pet.userId === userId) {
    return { ok: true, role: 'owner' }
  }

  const member = await prisma.petMember.findUnique({
    where: { petId_userId: { petId, userId } },
  })

  if (!member) return { ok: false, status: 403, error: 'Forbidden' }

  return { ok: true, role: member.role as 'owner' | 'co_owner' }
}

type RecordModel =
  | 'symptomEntry'
  | 'productUsage'
  | 'petProduct'
  | 'instantAnalysis'
  | 'dailyMealPlan'
  | 'communityRec'
  | 'weeklyTask'

/**
 * 由紀錄 id 反查所屬 petId 後驗權限，給「path 是 recordId 而非 petId」的 route 使用。
 * 成功時帶回 petId，呼叫端不必再查一次。紀錄不存在 → 404。
 */
export async function requirePetAccessByRecord(
  model: RecordModel,
  recordId: string,
  userId: string
): Promise<PetAccessResult & { petId?: string }> {
  if (!userId) return { ok: false, status: 401, error: 'Unauthorized' }

  const petId = await resolvePetId(model, recordId)
  if (!petId) return { ok: false, status: 404, error: 'Record not found' }

  const access = await requirePetAccess(petId, userId)
  if (!access.ok) return access
  return { ...access, petId }
}

// CommunityRec 的關聯欄位是 forPetId，其餘皆為 petId，故分開處理映射。
async function resolvePetId(
  model: RecordModel,
  recordId: string
): Promise<string | null> {
  switch (model) {
    case 'symptomEntry': {
      const r = await prisma.symptomEntry.findUnique({
        where: { id: recordId },
        select: { petId: true },
      })
      return r?.petId ?? null
    }
    case 'productUsage': {
      const r = await prisma.productUsage.findUnique({
        where: { id: recordId },
        select: { petId: true },
      })
      return r?.petId ?? null
    }
    case 'petProduct': {
      const r = await prisma.petProduct.findUnique({
        where: { id: recordId },
        select: { petId: true },
      })
      return r?.petId ?? null
    }
    case 'instantAnalysis': {
      const r = await prisma.instantAnalysis.findUnique({
        where: { id: recordId },
        select: { petId: true },
      })
      return r?.petId ?? null
    }
    case 'dailyMealPlan': {
      const r = await prisma.dailyMealPlan.findUnique({
        where: { id: recordId },
        select: { petId: true },
      })
      return r?.petId ?? null
    }
    case 'communityRec': {
      const r = await prisma.communityRec.findUnique({
        where: { id: recordId },
        select: { forPetId: true },
      })
      return r?.forPetId ?? null
    }
    case 'weeklyTask': {
      const r = await prisma.weeklyTask.findUnique({
        where: { id: recordId },
        select: { petId: true },
      })
      return r?.petId ?? null
    }
  }
}
