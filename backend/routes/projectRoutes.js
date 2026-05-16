import { Router } from 'express'
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../controllers/projectController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

router.use(protect)
router.get('/', listProjects)
router.post('/', createProject)
router.get('/:id', getProject)
router.patch('/:id', updateProject)
router.delete('/:id', deleteProject)

export default router