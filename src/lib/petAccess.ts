import { prisma } from './prisma'

type PetAccessResult =
  | { ok: true; role: 'owner' | 'co_owner' }
  | { ok: false; status: 401 | 403; error: string }

export async function requirePetAccess(
  petId: string,
  userId: string
): Promise<PetAccessResult> {
  if (!userId) return { ok: false, status: 401, error: 'Unauthorized' }

  const member = await prisma.petMember.findUnique({
    where: { petId_userId: { petId, userId } },
  })

  if (!member) return { ok: false, status: 403, error: 'Forbidden' }

  return { ok: true, role: member.role as 'owner' | 'co_owner' }
}
