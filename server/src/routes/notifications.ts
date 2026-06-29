import { Router } from 'express'
import { requestProfit, updateLatestProfit } from '../controllers/notificationController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/profit-request', authenticateToken, requestProfit)

// Bot endpoint (no auth middleware - uses x-bot-secret header)
router.put('/update-latest-profit', updateLatestProfit)

export default router