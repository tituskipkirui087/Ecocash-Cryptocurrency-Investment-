import { kvGet, kvSet, kvDel } from './telegramKv.js'

type ProfitPending = { userId: string; id: string; investmentId: string }
type TradeAfterDepositPending = { depositId: string; investmentId: string }

export const pendingProfitForAdmin = {
  async set(value: ProfitPending): Promise<void> {
    try {
      await kvSet('pending_profit_request', JSON.stringify(value))
    } catch (e) {
      console.error('Failed to set pending profit:', e)
    }
  },
  async get(): Promise<ProfitPending | undefined> {
    try {
      const raw = await kvGet('pending_profit_request')
      return raw ? JSON.parse(raw) as ProfitPending : undefined
    } catch {
      return undefined
    }
  },
  async delete(): Promise<void> {
    try {
      await kvDel('pending_profit_request')
    } catch (e) {
      console.error('Failed to delete pending profit:', e)
    }
  },
}

export const pendingTradeAfterDeposit = {
  async set(value: TradeAfterDepositPending): Promise<void> {
    try {
      await kvSet('pending_trade_after_deposit', JSON.stringify(value))
    } catch (e) {
      console.error('Failed to set pending trade:', e)
    }
  },
  async get(): Promise<TradeAfterDepositPending | undefined> {
    try {
      const raw = await kvGet('pending_trade_after_deposit')
      return raw ? JSON.parse(raw) as TradeAfterDepositPending : undefined
    } catch {
      return undefined
    }
  },
  async delete(): Promise<void> {
    try {
      await kvDel('pending_trade_after_deposit')
    } catch (e) {
      console.error('Failed to delete pending trade:', e)
    }
  },
}
