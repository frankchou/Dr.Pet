import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

function resolveDbUrl(): string {
  const raw = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'dev.db')}`
  if (raw.startsWith('file:') && !raw.startsWith('file:/')) {
    const relative = raw.replace(/^file:/, '')
    return `file:${path.resolve(process.cwd(), relative)}`
  }
  return raw
}

function createPrismaClient() {
  const url = resolveDbUrl()
  const authToken = process.env.DATABASE_AUTH_TOKEN
  const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
