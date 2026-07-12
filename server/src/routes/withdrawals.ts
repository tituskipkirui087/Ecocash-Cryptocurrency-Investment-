import { Router } from 'express'
import { getWithdrawals, createWithdrawal, approveWithdrawal, rejectWithdrawal, adminApproveWithdrawal, submitOTP } from '../controllers/withdrawalController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

router.get('/', getWithdrawals)
router.post('/', createWithdrawal)
router.put('/:id/admin-approve', adminApproveWithdrawal)
router.put('/:id/otp', submitOTP)
router.put('/:id/approve', approveWithdrawal)
router.put('/:id/reject', rejectWithdrawal)

export default router
