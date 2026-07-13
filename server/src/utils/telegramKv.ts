import { prisma } from '../config/db.js'

let ensured = false

const ensureTable = async (): Promise<void> => {
  if (ensured) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS telegram_kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    ensured = true
  } catch (e) {
    console.error('Failed to ensure telegram_kv table:', e)
  }
}

export const kvGet = async (key: string): Promise<string | null> => {
  try {
    await ensureTable()
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT value FROM telegram_kv WHERE key = $1`,
      key,
    )
    return rows.length ? rows[0].value : null
  } catch {
    return null
  }
}

export const kvSet = async (key: string, value: string): Promise<void> => {
  try {
    await ensureTable()
    await prisma.$executeRawUnsafe(
      `INSERT INTO telegram_kv (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      key,
      value,
    )
  } catch (e) {
    console.error('kvSet error:', e)
  }
}

export const kvDel = async (key: string): Promise<void> => {
  try {
    await ensureTable()
    await prisma.$executeRawUnsafe(`DELETE FROM telegram_kv WHERE key = $1`, key)
  } catch (e) {
    console.error('kvDel error:', e)
  }
}
