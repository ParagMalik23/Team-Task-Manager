import { Router } from 'express'
import { listUsers } from '../controllers/userController.js'
import { authorizeRoles, protect } from '../middleware/auth.js'

const router = Router()

router.get('/', protect, authorizeRoles('Admin'), listUsers)

export default router