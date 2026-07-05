import express, { Request, Response } from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { prisma } from './config/db.js'
import authRoutes from './routes/auth.js'
import investmentRoutes from './routes/investments.js'
import depositRoutes from './routes/deposits.js'
import withdrawalRoutes from './routes/withdrawals.js'
import adminRoutes from './routes/admin.js'
import telegramRoutes from './routes/telegram.js'
import notificationRoutes from './routes/notifications.js'

declare global {
  var sseClients: { userId: string; send: (data: string) => void }[] | undefined
}

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}))
app.use(express.json())

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/sse/payment-updates', (req: Request, res: Response) => {
  const token = req.query.token as string
  if (!token) {
    res.status(401).end()
    return
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')
    ;(global.sseClients ||= []).push({ userId: decoded.id, send: (data) => res.write(`data: ${data}\n\n`) })
    req.on('close', () => { global.sseClients = (global.sseClients || []).filter(c => c.userId !== decoded.id) })
  } catch { res.status(401).end() }
})

app.use('/api/auth', authRoutes)
app.use('/api/investments', investmentRoutes)
app.use('/api/deposits', depositRoutes)
app.use('/api/withdrawals', withdrawalRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/telegram', telegramRoutes)
app.use('/api/notifications', notificationRoutes)

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

export default app