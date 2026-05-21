import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { authenticate } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { generateTemplate } from '../services/ai'

const router = Router()
router.use(authenticate)

const ALLOWED_TYPES = [
  'lease_amendment',
  'deposit_refund',
  'maintenance',
  'illegal_entry',
  'rent_dispute',
  'checklist',
  'custom',
]

// POST /api/templates/generate
router.post('/generate',
  [
    body('type').isIn(ALLOWED_TYPES).withMessage('Invalid template type'),
    body('context').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg)

    const { type, context = {} } = req.body

    const content = await generateTemplate(type, context)

    return res.json({ content, type })
  }
)

export default router
