import { Router } from 'express'
import TelegramBot from 'node-telegram-bot-api'
import { prisma } from '../config/db.js'
import { pendingProfitForAdmin, pendingTradeAfterDeposit } from '../utils/telegramState.js'
import { kvGet, kvSet } from '../utils/telegramKv.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
// This must be the same value supplied as `secret_token` when registering the
// Telegram webhook. Never fall back to a public, source-controlled value.
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ''

const router = Router()

const answerCallback = async (callbackQueryId: string, text?: string) => {
  if (!BOT_TOKEN) return
  try {
    const bot = new TelegramBot(BOT_TOKEN, { polling: false })
    await bot.answerCallbackQuery(callbackQueryId, { text: text || 'Processed' })
  } catch (err) {
    console.error('Answer callback error:', err)
  }
}

router.post('/webhook', async (req, res) => {
    const receivedSecret = req.get('X-Telegram-Bot-Api-Secret-Token')
    if (!WEBHOOK_SECRET || receivedSecret !== WEBHOOK_SECRET) {
      console.warn('Rejected Telegram webhook with an invalid or missing secret token')
      res.sendStatus(401)
      return
    }

    res.sendStatus(200)
    try {
      const body = req.body

      if (body.message && body.message.text) {
      const chatId = body.message.chat.id
      const text = body.message.text

      if (text === '/start') {
        await sendMessage(chatId, 'Welcome to EcoCash Investment Bot\n\nCommands:\n/pending - View pending actions\n/users - List all users\n/investments - List investments')
      } else if (String(chatId) !== ADMIN_CHAT_ID) {
        console.warn(`Rejected Telegram command from non-admin chat ${chatId}`)
        await sendMessage(chatId, '❌ This command is restricted to the bot administrator.')
      } else if (text === '/pending') {
        const pending = await prisma.deposit.findMany({
          where: { status: 'WAITING_FOR_PAYMENT_DETAILS' },
          include: { user: true },
          take: 5,
        })
        const msg = pending.length
          ? `Pending Approvals:\n${pending.map((d: any) => `- ${d.user?.email}: $${d.amount}`).join('\n')}`
          : 'No pending actions.'
        await sendMessage(chatId, msg)
      } else if (text.toLowerCase().startsWith('ecocash:')) {
        const parts = text.substring(8).split(',')
        if (parts.length >= 2) {
          const number = parts[0].trim()
          const accountName = parts[1].trim()
          const deposit = await prisma.deposit.findFirst({
            where: { status: 'WAITING_FOR_PAYMENT_DETAILS' },
            orderBy: { createdAt: 'desc' },
            include: { user: true },
          })
          if (!deposit) {
            const chatIdStr = String(chatId)
            const notifyKey = `no_deposit_ctx:${chatIdStr}`
            if ((await kvGet(notifyKey)) !== '1') {
              await kvSet(notifyKey, '1')
              await sendMessage(chatId, '❌ No pending deposit found. Please check the admin panel.')
            }
            return
          }
          const updatedDeposit = await prisma.deposit.update({
            where: { id: deposit.id },
            data: {
              ecocashNumber: number,
              ecocashAccountName: accountName,
              status: 'PAYMENT_DETAILS_SENT',
            },
            include: { user: true },
          })
          if (updatedDeposit?.user?.telegramChatId) {
            await sendMessage(Number(updatedDeposit.user.telegramChatId),
              `💰 Payment Details Received!\n\nEcoCash Number: ${number}\nAccount Name: ${accountName}\n\nPlease make the payment and upload proof.`)
          }
          await sendMessage(chatId, '✅ Payment details sent to user!')
        }
      } else {
        // Check for profit amount reply from admin
        const profitData = await pendingProfitForAdmin.get()
        if (profitData) {
          const amountMatch = text.match(/^\$?\s*([0-9]+(?:\.[0-9]+)?)$/)
          if (amountMatch) {
            const profitAmount = parseFloat(amountMatch[1])
            if (profitAmount > 0) {
              const investment = await prisma.investment.findUnique({ where: { id: profitData.id } })
              if (investment) {
                const currentBalance = Number(investment.currentBalance || investment.depositAmount || 0)
                const depositAmount = Number(investment.depositAmount || currentBalance)
                const newBalance = currentBalance + profitAmount
                const calculatedPercentage = profitAmount / depositAmount * 100
                const updated = await prisma.investment.update({
                  where: { id: profitData.id },
                  data: {
                    currentBalance: newBalance,
                    profitAmount: profitAmount,
                    profitPercentage: calculatedPercentage,
                    // Only a reply to a requested profit update enables this prompt.
                    profitActionRequiredAt: new Date(),
                  },
                  include: { user: true },
                })
                await sendMessage(chatId, `✅ Profit of $${profitAmount} added to investment ${updated.investmentId}. New balance: $${newBalance.toFixed(2)}`)
              } else {
                await sendMessage(chatId, '❌ Investment not found.')
              }
              await pendingProfitForAdmin.delete()
            }
          }
        }
      }
    }

    if (body.callback_query) {
      const callbackQuery = body.callback_query
      const callbackData = callbackQuery.data
      const chatId = callbackQuery.message.chat.id
      const callbackQueryId = callbackQuery.id

      if (String(chatId) !== ADMIN_CHAT_ID) {
        console.warn(`Rejected Telegram callback from non-admin chat ${chatId}`)
        await answerCallback(callbackQueryId, 'Unauthorized')
        return
      }

      if (callbackData.startsWith('approve_user_')) {
        const userId = callbackData.replace('approve_user_', '')
        await answerCallback(callbackQueryId)
        await handleApproveUser(userId, chatId)
      } else if (callbackData.startsWith('reject_user_')) {
        const userId = callbackData.replace('reject_user_', '')
        await answerCallback(callbackQueryId)
        await handleRejectUser(userId, chatId)
      } else if (callbackData.startsWith('approve_kyc_')) {
        const userId = callbackData.replace('approve_kyc_', '')
        await answerCallback(callbackQueryId, 'Approving KYC...')
        await handleApproveKYC(userId, chatId)
      } else if (callbackData.startsWith('reject_kyc_')) {
        const userId = callbackData.replace('reject_kyc_', '')
        await answerCallback(callbackQueryId, 'Rejecting KYC...')
        await handleRejectKYC(userId, chatId)
      } else if (callbackData.startsWith('approve_deposit_')) {
        const depositId = callbackData.replace('approve_deposit_', '')
        await answerCallback(callbackQueryId, 'Approving deposit...')
        await handleApproveDeposit(depositId, chatId)
      } else if (callbackData.startsWith('reject_deposit_')) {
        const depositId = callbackData.replace('reject_deposit_', '')
        await answerCallback(callbackQueryId, 'Rejecting deposit...')
        await handleRejectDeposit(depositId, chatId)
      } else if (callbackData.startsWith('confirm_payment_')) {
        const depositId = callbackData.replace('confirm_payment_', '')
        await answerCallback(callbackQueryId, 'Confirming payment...')
        await handleApproveDeposit(depositId, chatId)
      } else if (callbackData.startsWith('reject_payment_')) {
        const depositId = callbackData.replace('reject_payment_', '')
        await answerCallback(callbackQueryId, 'Rejecting payment...')
        await handleRejectDeposit(depositId, chatId)
      } else if (callbackData.startsWith('start_trade_after_approve_')) {
        const depositId = callbackData.replace('start_trade_after_approve_', '')
        await answerCallback(callbackQueryId, 'Starting trade...')
        await handleStartTradeAfterApprove(depositId, chatId)
      } else if (callbackData.startsWith('dont_start_trade_')) {
        const depositId = callbackData.replace('dont_start_trade_', '')
        await answerCallback(callbackQueryId, 'Okay, trade not started.')
        await pendingTradeAfterDeposit.delete()
        await sendMessage(chatId, `ℹ️ Trade was not started for deposit ${depositId}. You can start it later from the admin panel.`)
      } else if (callbackData.startsWith('start_trade_')) {
        const investmentId = callbackData.replace('start_trade_', '')
        await answerCallback(callbackQueryId, 'Starting trade...')
        await handleStartTrade(investmentId, chatId)
      } else if (callbackData.startsWith('approve_investment_')) {
        const investmentId = callbackData.replace('approve_investment_', '')
        await answerCallback(callbackQueryId)
        await sendMessage(chatId, `Investment ${investmentId} approved via webhook.`)
      } else if (callbackData.startsWith('reject_investment_')) {
        const investmentId = callbackData.replace('reject_investment_', '')
        await answerCallback(callbackQueryId)
        await sendMessage(chatId, `Investment ${investmentId} rejected via webhook.`)
      } else if (callbackData.startsWith('paid_withdrawal_')) {
        const withdrawalId = callbackData.replace('paid_withdrawal_', '')
        await answerCallback(callbackQueryId, 'Processing withdrawal...')
        await handlePaidWithdrawal(withdrawalId, chatId)
      } else if (callbackData.startsWith('reject_withdrawal_')) {
        const withdrawalId = callbackData.replace('reject_withdrawal_', '')
        await answerCallback(callbackQueryId, 'Rejecting withdrawal...')
        await handleRejectWithdrawal(withdrawalId, chatId)
      } else {
        await answerCallback(callbackQueryId, 'Unknown action')
      }
    }
    } catch (error) {
      console.error('Telegram webhook error:', error)
    }
  })

const sendMessage = async (chatId: number, text: string, options?: TelegramBot.SendMessageOptions) => {
  if (!BOT_TOKEN) return
  try {
    const bot = new TelegramBot(BOT_TOKEN, { polling: false })
    await bot.sendMessage(chatId, text, options)
  } catch (error) {
    console.error('Send message error:', error)
  }
}

const handleApproveUser = async (userId: string, adminChatId: number) => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    })
    if (user?.telegramChatId) {
      await sendMessage(Number(user.telegramChatId),
        `🎉 Congratulations! Your account has been approved. You can now log in and start investing.`)
    }
    await sendMessage(adminChatId, '✅ User approved and notified!')
  } catch (error) {
    console.error('Approve user error:', error)
    await sendMessage(adminChatId, '❌ Failed to approve user.')
  }
}

const handleRejectUser = async (userId: string, adminChatId: number) => {
  await sendMessage(adminChatId, 'User rejected.')
}

const handleApproveKYC = async (userId: string, adminChatId: number) => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'APPROVED', isVerified: true, isActive: true },
    })
    if (user?.telegramChatId) {
      await sendMessage(Number(user.telegramChatId),
        `✅ KYC Approved! Your account is now fully verified and you can make investments.`)
    }
    await sendMessage(adminChatId, '✅ KYC approved and notified!')
  } catch (error) {
    console.error('Approve KYC error:', error)
    await sendMessage(adminChatId, '❌ Failed to approve KYC.')
  }
}

const handleRejectKYC = async (userId: string, adminChatId: number) => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'REJECTED' },
    })
    if (user?.telegramChatId) {
      await sendMessage(Number(user.telegramChatId),
        `❌ Your KYC submission was rejected. Please check your documents and resubmit.`)
    }
    await sendMessage(adminChatId, '✅ KYC rejected and notified!')
  } catch (error) {
    console.error('Reject KYC error:', error)
    await sendMessage(adminChatId, '❌ Failed to reject KYC.')
  }
}

const handleApproveDeposit = async (depositId: string, adminChatId: number) => {
  try {
    const result = await prisma.deposit.updateMany({
      where: { id: depositId, status: 'PAYMENT_SUBMITTED' },
      data: { status: 'PAYMENT_RECEIVED' },
    })
    if (result.count === 0) {
      await sendMessage(adminChatId, 'ℹ️ This payment was already processed or is no longer awaiting approval.')
      return
    }
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { user: true, investment: true },
    })
    if (!deposit) throw new Error('Deposit not found after approval')
    if (deposit?.investmentId) {
      await prisma.investment.update({
        where: { id: deposit.investmentId },
        data: { status: 'PAYMENT_RECEIVED' },
      })
    }
    if (deposit?.user?.telegramChatId) {
      await sendMessage(Number(deposit.user.telegramChatId),
        `✅ Payment confirmed! Your investment is now active.\n\nInvestment: #${deposit.investment?.investmentId || 'N/A'}`)
    }
    await sendMessage(adminChatId, '✅ Payment approved and user notified!')

    if (deposit?.investmentId) {
      await pendingTradeAfterDeposit.set({ depositId, investmentId: deposit.investmentId })
      const buttons = [
        { text: '🚀 Start Trade Now', callback_data: `start_trade_after_approve_${depositId}` },
        { text: '⏸️ Later', callback_data: `dont_start_trade_${depositId}` },
      ]
      await sendMessage(adminChatId, `Do you want to start the trade now for investment #${deposit.investment?.investmentId || deposit.investmentId}?`, {
        reply_markup: { inline_keyboard: buttons.map((btn) => [{ text: btn.text, callback_data: btn.callback_data }]) },
      })
    }
  } catch (error) {
    console.error('Approve deposit error:', error)
    await sendMessage(adminChatId, '❌ Failed to approve payment.')
  }
}

const handleRejectDeposit = async (depositId: string, adminChatId: number) => {
  try {
    const result = await prisma.deposit.updateMany({
      where: { id: depositId, status: 'PAYMENT_SUBMITTED' },
      data: { status: 'REJECTED' },
    })
    if (result.count === 0) {
      await sendMessage(adminChatId, 'ℹ️ This payment was already processed or is no longer awaiting approval.')
      return
    }
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { user: true, investment: true },
    })
    if (!deposit) throw new Error('Deposit not found after rejection')
    if (deposit?.investmentId) {
      await prisma.investment.update({
        where: { id: deposit.investmentId },
        data: { status: 'REJECTED' },
      })
    }
    if (deposit?.user?.telegramChatId) {
      await sendMessage(Number(deposit.user.telegramChatId),
        `❌ Your payment was rejected. Please contact support for assistance.`)
    }
    await sendMessage(adminChatId, '✅ Payment rejected and user notified!')
  } catch (error) {
    console.error('Reject deposit error:', error)
    await sendMessage(adminChatId, '❌ Failed to reject payment.')
  }
}

const handleStartTrade = async (investmentId: string, adminChatId: number) => {
  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: { plan: true, user: true },
    })
    if (!investment) throw new Error('Investment not found')

    const tradeStart = new Date()
    const tradeEnd = new Date(tradeStart.getTime() + (investment.plan?.tradeDurationHours || 6) * 60 * 60 * 1000)

    const result = await prisma.investment.updateMany({
      where: { id: investmentId, status: 'PAYMENT_RECEIVED' },
      data: {
        status: 'ACTIVE_TRADE',
        tradeStartDate: tradeStart,
        tradeEndDate: tradeEnd,
      },
    })
    if (result.count === 0) {
      await sendMessage(adminChatId, 'ℹ️ This trade was already started or can no longer be started.')
      return
    }

    if (investment.user?.telegramChatId) {
      await sendMessage(Number(investment.user.telegramChatId),
        `🚀 Your investment #${investment.investmentId} is now trading!\n\nAmount: $${investment.depositAmount}\nDuration: ${investment.plan?.tradeDurationHours || 6}h\nExpected Return: $${(Number(investment.depositAmount) * (investment.plan?.returnMultiplier || 1)).toFixed(2)}`)
    }
    await sendMessage(adminChatId, '✅ Trade started and user notified!')
  } catch (error) {
    console.error('Start trade error:', error)
    await sendMessage(adminChatId, '❌ Failed to start trade.')
  }
}

const handleStartTradeAfterApprove = async (depositId: string, adminChatId: number) => {
  try {
    const pending = await pendingTradeAfterDeposit.get()
    if (!pending || pending.depositId !== depositId) {
      await sendMessage(adminChatId, '❌ No pending trade start context found for this deposit.')
      return
    }
    await pendingTradeAfterDeposit.delete()
    await handleStartTrade(pending.investmentId, adminChatId)
  } catch (error) {
    console.error('Start trade after approve error:', error)
    await sendMessage(adminChatId, '❌ Failed to start trade after approval.')
  }
}

const handlePaidWithdrawal = async (withdrawalId: string, adminChatId: number) => {
  try {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true, investment: true },
    })
    if (!withdrawal) {
      await sendMessage(adminChatId, 'ℹ️ Withdrawal not found.')
      return
    }
    if (!withdrawal.isVerified) {
      await sendMessage(adminChatId, '⚠️ This withdrawal must be verified by the user first!')
      return
    }
    
    // Extract fee from transactionHash if it was stored as "Fee: XX.XX"
    const feeMatch = withdrawal.transactionHash?.match(/Fee: ([\d.]+)/)
    const fee = feeMatch ? Number(feeMatch[1]) : getWithdrawalFee(Number(withdrawal.amount))
    const totalDeduct = Number(withdrawal.amount) + fee

    const result = await prisma.withdrawal.updateMany({
      where: { id: withdrawalId, status: 'WITHDRAWAL_PENDING' },
      data: { status: 'WITHDRAWN', transactionHash: 'tx_' + Date.now() },
    })
    if (result.count === 0) {
      await sendMessage(adminChatId, 'ℹ️ This withdrawal was already processed or is no longer pending.')
      return
    }
    
    // Deduct from investment balance
    if (withdrawal?.investmentId) {
      await prisma.investment.update({
        where: { id: withdrawal.investmentId },
        data: {
          currentBalance: { decrement: totalDeduct },
        },
      })
    }
    
    if (withdrawal?.user?.telegramChatId) {
      await sendMessage(Number(withdrawal.user.telegramChatId),
        `💸 Your withdrawal has been processed! Amount: $${withdrawal.amount}`)
    }
    await sendMessage(adminChatId, `✅ Withdrawal processed and user notified!\n\nCard: ${withdrawal.cardNumber?.replace(/(\d{4})(?=\d)/g, '$1 ') || 'N/A'}\nHolder: ${withdrawal.cardholderName || 'N/A'}`)
  } catch (error) {
    console.error('Paid withdrawal error:', error)
    await sendMessage(adminChatId, '❌ Failed to process withdrawal.')
  }
}

const handleRejectWithdrawal = async (withdrawalId: string, adminChatId: number) => {
  try {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    })
    
    const result = await prisma.withdrawal.updateMany({
      where: { id: withdrawalId, status: { in: ['WITHDRAWAL_PENDING', 'WAITING_FOR_VERIFICATION'] } },
      data: { status: 'REJECTED' },
    })
    if (result.count === 0) {
      await sendMessage(adminChatId, 'ℹ️ This withdrawal was already processed or is no longer pending.')
      return
    }
    
    if (withdrawal?.user?.telegramChatId) {
      await sendMessage(Number(withdrawal.user.telegramChatId),
        `❌ Your withdrawal request for $${withdrawal?.amount || 'N/A'} was rejected. Please contact support for assistance.`)
    }
    await sendMessage(adminChatId, '✅ Withdrawal rejected and user notified!')
  } catch (error) {
    console.error('Reject withdrawal error:', error)
    await sendMessage(adminChatId, '❌ Failed to reject withdrawal.')
  }
}

const getWithdrawalFee = (amount: number): number => {
  const feePercent = 0.02
  const feeMin = 1
  const feeMax = 5
  const fee = amount * feePercent
  return Math.max(feeMin, Math.min(feeMax, fee))
}

export default router
