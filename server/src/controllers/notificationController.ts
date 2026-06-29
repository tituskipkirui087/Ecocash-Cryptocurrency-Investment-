import { Response, Request } from 'express'
import { AuthRequest, authenticateToken } from '../middleware/auth'
import { sendTelegramMessage } from '../services/telegramService'
import { prisma } from '../config/db'

export const requestProfit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const user = req.user!
    const message = `📊 Profit Request\n\nUser: ${user.firstName} ${user.lastName}\nID: ${userId}\n\nPlease input profit in format:\n$1200`
    await sendTelegramMessage(message)
    res.json({ success: true, message: 'Profit request sent to admin' })
  } catch (error) {
    console.error('Profit request error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const updateLatestProfit = async (req: Request, res: Response): Promise<void> => {
  const { profitAmount } = req.body as { profitAmount: number }
  const authReq = req as any
  const botSecret = req.headers['x-bot-secret'] as string
  const expectedSecret = process.env.BOT_SECRET || 'ecocash_bot_secret_2024'

  if (botSecret !== expectedSecret) {
    res.status(401).json({ success: false, message: 'Unauthorized' })
    return
  }

  try {
    // Get the most recent active investment
    const latestInvestment = await prisma.investment.findFirst({
      where: {
        status: { in: ['PAYMENT_RECEIVED', 'ACTIVE_TRADE'] }
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!latestInvestment) {
      res.status(404).json({ success: false, message: 'No active investments found' })
      return
    }

    const currentBalance = Number(latestInvestment.currentBalance || latestInvestment.depositAmount || 0)
    const depositAmount = Number(latestInvestment.depositAmount || currentBalance)
    const newBalance = currentBalance + profitAmount
    const calculatedPercentage = profitAmount / depositAmount * 100

    const updated = await prisma.investment.update({
      where: { id: latestInvestment.id },
      data: {
        currentBalance: newBalance,
        profitAmount: profitAmount,
        profitPercentage: calculatedPercentage,
      },
      include: { user: true },
    })

    // Notify user via SSE
    ;(global as any).sseClients?.forEach((client: any) => {
      if (client.userId === updated.userId) {
        client.send(JSON.stringify({
          type: 'profit_updated',
          profitAmount: updated.profitAmount,
          investmentId: updated.investmentId,
        }))
      }
    })

    res.status(200).json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Update latest profit error:', error)
    res.status(500).json({ success: false, message: error.message || 'Server error' })
  }
}