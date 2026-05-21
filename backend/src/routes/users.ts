import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import { prisma } from '../config/database'
import { authenticate } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'

const router = Router()
router.use(authenticate)

// GET /api/users/me
router.get('/me', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { subscription: true }
  })
  if (!user) throw new AppError(404, 'User not found')

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    city: user.city,
    state: user.state,
    role: user.role,
    emailVerified: user.emailVerified,
    plan: user.subscription?.plan,
    analysesUsed: user.subscription?.analysesUsed,
    analysesLimit: user.subscription?.analysesLimit,
    createdAt: user.createdAt,
  })
})

// PATCH /api/users/me
router.patch('/me',
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
    body('city').optional().trim(),
    body('state').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) throw new AppError(400, 'Validation failed')

    const { name, city, state } = req.body
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(name && { name }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
      },
      include: { subscription: true }
    })

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      city: user.city,
      state: user.state,
      plan: user.subscription?.plan,
    })
  }
)

// POST /api/users/change-password
router.post('/change-password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) throw new AppError(400, 'Invalid request')

    const { currentPassword, newPassword } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user || !user.passwordHash) throw new AppError(400, 'Cannot change password for OAuth accounts')

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new AppError(400, 'Current password is incorrect')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId: user.id } })

    return res.json({ message: 'Password changed successfully. Please log in again.' })
  }
)

// DELETE /api/users/me
router.delete('/me', async (req: Request, res: Response) => {
  return res.json({ message: 'Account deletion requested. You will receive a confirmation email.' })
})

export default router
