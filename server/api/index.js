import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from '../../src/routes/auth.js'
import investmentRoutes from '../../src/routes/investments.js'
import depositRoutes from '../../src/routes/deposits.js'
import withdrawalRoutes from '../../src/routes/withdrawals.js'
import adminRoutes from '../../src/routes/admin.js'
import telegramRoutes from '../../src/routes/telegram.js'
import notificationRoutes from '../../src/routes/notifications.js'
import cors from 'cors'
import jwt from 'jsonwebtoken'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/sse/payment-updates', (req, res) => {
  const token = req.query.token
  if (!token) {
    res.status(401).end()
    return
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret')
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (!global.sseClients) global.sseClients = []
    global.sseClients.push({ userId: decoded.id, send: (data) => res.write(`data: ${data}\n\n`) })
    req.on('close', () => {
      global.sseClients = (global.sseClients || []).filter(c => c.userId !== decoded.id)
    })
  } catch (error) {
    res.status(401).end()
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/investments', investmentRoutes)
app.use('/api/deposits', depositRoutes)
app.use('/api/withdrawals', withdrawalRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/telegram', telegramRoutes)
app.use('/api/notifications', notificationRoutes)

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

export default (req, res) => {
  return app(req, res)
}