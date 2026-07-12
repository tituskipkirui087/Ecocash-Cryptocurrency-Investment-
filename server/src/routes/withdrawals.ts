import { Router } from 'express'
import { getWithdrawals, createWithdrawal, approveWithdrawal, rejectWithdrawal, verifyWithdrawal } from '../controllers/withdrawalController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

router.get('/', getWithdrawals)
router.post('/', createWithdrawal)
router.put('/:id/verify', verifyWithdrawal)
router.put('/:id/approve', approveWithdrawal)
router.put('/:id/reject', rejectWithdrawal)

export default router
