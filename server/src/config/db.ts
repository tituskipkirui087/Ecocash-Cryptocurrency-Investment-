import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

// Initialize on module load
if (typeof window === 'undefined') {
  prisma.$connect().catch(e => console.error('Prisma connect error:', e))
}
