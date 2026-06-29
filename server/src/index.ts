import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import jwt from 'jsonwebtoken'
import { prisma } from './config/db'
import { initTelegramBot, sendTelegramMessage } from './services/telegramService'

dotenv.config()

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Serve uploads from /tmp on Vercel, otherwise from public/uploads
const uploadsPath = process.env.VERCEL 
  ? '/tmp/uploads' 
  : path.join(__dirname, '../../public/uploads')

declare global {
  var sseClients: { userId: string; send: (data: string) => void }[] | undefined
}

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsPath))

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/sse/payment-updates', (req: Request, res: Response) => {
  const token = req.query.token as string
  if (!token) {
    res.status(401).end()
    return
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (!global.sseClients) global.sseClients = []
  global.sseClients.push({ userId: decoded.id, send: (data) => res.write(`data: ${data}\n\n`) })

  req.on('close', () => {
    global.sseClients = global.sseClients?.filter(c => c.userId !== decoded.id)
  })
})

import authRoutes from './routes/auth'
import investmentRoutes from './routes/investments'
import depositRoutes from './routes/deposits'
import withdrawalRoutes from './routes/withdrawals'
import adminRoutes from './routes/admin'
import telegramRoutes from './routes/telegram'
import notificationRoutes from './routes/notifications'

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

const PORT = process.env.PORT || 5000

const startServer = async () => {
  try {
    await prisma.$connect()
    console.log('Database connected')
    await initTelegramBot()
    console.log('Telegram bot initialized')

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()