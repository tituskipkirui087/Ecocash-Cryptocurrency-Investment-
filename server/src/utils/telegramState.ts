import { kvGet, kvSet, kvDel } from './telegramKv.js'

type ProfitPending = { userId: string; id: string; investmentId: string }

const profitKey = (chatId: string) => `profit:${chatId}`

export const pendingProfitForAdmin = {
  async set(chatId: string, value: ProfitPending): Promise<void> {
    await kvSet(profitKey(chatId), JSON.stringify(value))
  },
  async get(chatId: string): Promise<ProfitPending | undefined> {
    const raw = await kvGet(profitKey(chatId))
    return raw ? (JSON.parse(raw) as ProfitPending) : undefined
  },
  async delete(chatId: string): Promise<void> {
    await kvDel(profitKey(chatId))
  },
}
