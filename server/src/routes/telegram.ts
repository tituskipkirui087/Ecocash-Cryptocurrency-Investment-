import { Router } from 'express'
import TelegramBot from 'node-telegram-bot-api'
import { prisma } from '../config/db.js'
import { pendingProfitForAdmin } from '../utils/telegramState.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
const BOT_SECRET = process.env.BOT_SECRET || 'ecocash_bot_secret_2024'

const pendingDepositForAdmin = new Map<string, string>()
const notifiedNoDepositContext = new Set<string>()

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
  try {
    const body = req.body

    if (body.message && body.message.text) {
      const chatId = body.message.chat.id
      const text = body.message.text

      if (text === '/start') {
        await sendMessage(chatId, 'Welcome to EcoCash Investment Bot\n\nCommands:\n/pending - View pending actions\n/users - List all users\n/investments - List investments')
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
          const chatIdStr = String(chatId)
          const depositId = pendingDepositForAdmin.get(chatIdStr)
          if (!depositId) {
            if (!notifiedNoDepositContext.has(chatIdStr)) {
              notifiedNoDepositContext.add(chatIdStr)
              await sendMessage(chatId, '❌ No pending deposit context. Please use the inline button first.')
            }
            return
          }
          const deposit = await prisma.deposit.update({
            where: { id: depositId },
            data: {
              ecocashNumber: number,
              ecocashAccountName: accountName,
              status: 'PAYMENT_DETAILS_SENT',
            },
            include: { user: true },
          })
          pendingDepositForAdmin.delete(chatIdStr)
          ;(global as any).sseClients?.forEach((client: any) => {
            if (client.userId === deposit.userId) {
              client.send(JSON.stringify({
                type: 'payment_details',
                depositId: deposit.id,
                ecocashNumber: number,
                ecocashAccountName: accountName,
                ecocashReference: deposit.ecocashReference,
              }))
            }
          })
          if (deposit?.user?.telegramChatId) {
            await sendMessage(Number(deposit.user.telegramChatId),
              `💰 Payment Details Received!\n\nEcoCash Number: ${number}\nAccount Name: ${accountName}\n\nPlease make the payment and upload proof.`)
          }
          await sendMessage(chatId, '✅ Payment details sent to user!')
        }
      } else {
        // Check for profit amount reply from admin
        const chatIdStr = String(chatId)
        const profitData = pendingProfitForAdmin.get(chatIdStr)
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
                  },
                  include: { user: true },
                })
                ;(global as any).sseClients?.forEach((client: any) => {
                  if (client.userId === updated.userId) {
                    client.send(JSON.stringify({
                      type: 'profit_updated',
                      profitAmount: updated.profitAmount,
                      currentBalance: updated.currentBalance,
                      investmentId: updated.investmentId,
                      profitPercentage: updated.profitPercentage,
                    }))
                  }
                })
                await sendMessage(chatId, `✅ Profit of $${profitAmount} added to investment ${updated.investmentId}. New balance: $${newBalance.toFixed(2)}`)
              } else {
                await sendMessage(chatId, '❌ Investment not found.')
              }
              pendingProfitForAdmin.delete(chatIdStr)
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
      } else if (callbackData.startsWith('send_ecocash_')) {
        const investmentId = callbackData.replace('send_ecocash_', '')
        await answerCallback(callbackQueryId, 'Preparing payment details...')
        await handleSendEcocashDetails(investmentId, chatId)
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

    res.sendStatus(200)
  } catch (error) {
    console.error('Telegram webhook error:', error)
    res.sendStatus(200)
  }
})

const sendMessage = async (chatId: number, text: string) => {
  if (!BOT_TOKEN) return
  try {
    const bot = new TelegramBot(BOT_TOKEN, { polling: false })
    await bot.sendMessage(chatId, text)
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

const handleSendEcocashDetails = async (investmentId: string, adminChatId: number) => {
  try {
    const deposit = await prisma.deposit.findFirst({
      where: { investmentId },
      include: { user: true },
    })
    if (!deposit) {
      await sendMessage(adminChatId, '❌ Deposit not found for this investment.')
      return
    }
    pendingDepositForAdmin.set(String(adminChatId), deposit.id)
    notifiedNoDepositContext.delete(String(adminChatId))
    await sendMessage(adminChatId, `📱 Send EcoCash details.\n\nFormat:\necocash:number,accountName`)
  } catch (error) {
    console.error('Send ecocash details error:', error)
    await sendMessage(adminChatId, '❌ Failed to prepare payment details.')
  }
}

const handleApproveDeposit = async (depositId: string, adminChatId: number) => {
  try {
    const deposit = await prisma.deposit.update({
      where: { id: depositId },
      data: { status: 'PAYMENT_RECEIVED' },
      include: { user: true, investment: true },
    })
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
    ;(global as any).sseClients?.forEach((client: any) => {
      if (client.userId === deposit.userId) {
        client.send(JSON.stringify({
          type: 'payment_approved',
          status: 'PAYMENT_RECEIVED',
          depositId: deposit.id,
        }))
      }
    })
    await sendMessage(adminChatId, '✅ Payment approved and user notified!')
  } catch (error) {
    console.error('Approve deposit error:', error)
    await sendMessage(adminChatId, '❌ Failed to approve payment.')
  }
}

const handleRejectDeposit = async (depositId: string, adminChatId: number) => {
  try {
    const deposit = await prisma.deposit.update({
      where: { id: depositId },
      data: { status: 'REJECTED' },
      include: { user: true, investment: true },
    })
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

    await prisma.investment.update({
      where: { id: investmentId },
      data: {
        status: 'ACTIVE_TRADE',
        tradeStartDate: tradeStart,
        tradeEndDate: tradeEnd,
      },
    })

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

const handlePaidWithdrawal = async (withdrawalId: string, adminChatId: number) => {
  try {
    const withdrawal = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'PAID' },
      include: { user: true },
    })
    if (withdrawal?.user?.telegramChatId) {
      await sendMessage(Number(withdrawal.user.telegramChatId),
        `💸 Your withdrawal has been processed! Amount: $${withdrawal.amount}`)
    }
    await sendMessage(adminChatId, '✅ Withdrawal processed and user notified!')
  } catch (error) {
    console.error('Paid withdrawal error:', error)
    await sendMessage(adminChatId, '❌ Failed to process withdrawal.')
  }
}

const handleRejectWithdrawal = async (withdrawalId: string, adminChatId: number) => {
  await sendMessage(adminChatId, 'Withdrawal rejected.')
}

export default router
