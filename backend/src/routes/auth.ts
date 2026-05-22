import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

import { prisma } from '../config/database'
import { env } from '../config/env'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/jwt'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email'
import { createNotification } from '../services/notifications'
import { authenticate } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'

const router = Router()

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
}

const clearRefreshCookieOptions = {
  httpOnly: refreshCookieOptions.httpOnly,
  secure: refreshCookieOptions.secure,
  sameSite: refreshCookieOptions.sameSite,
  path: refreshCookieOptions.path,
}

// ─── REGISTER ────────────────────────────────────────────────
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().isLength({ min: 2, max: 80 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError(400, 'Validation failed', errors.array())
    }

    const { email, password, name, city, state } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new AppError(409, 'An account with this email already exists')

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        city,
        state,
        subscription: {
          create: {
            plan: 'FREE',
            analysesLimit: 2,
            analysesUsed: 0,
          }
        }
      },
      include: { subscription: true }
    })

    // Send verification email
    const token = uuidv4()
    await prisma.verificationToken.create({
      data: {
        email,
        token,
        type: 'email_verify',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      }
    })
    await sendVerificationEmail(email, name, token)

    // Welcome notification
    await createNotification(user.id, {
      title: 'Welcome to SmartLease! 🏠',
      body: 'Start by uploading your first lease agreement for analysis.',
      icon: '🎉',
    })

    const accessToken = signAccessToken({ userId: user.id, email, plan: user.subscription?.plan })
    const refreshToken = signRefreshToken({ userId: user.id })

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    })

    res.cookie('refresh_token', refreshToken, refreshCookieOptions)

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        plan: user.subscription?.plan,
        analysesUsed: user.subscription?.analysesUsed,
        analysesLimit: user.subscription?.analysesLimit,
      },
      accessToken,
    })
  }
)

// ─── LOGIN ───────────────────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) throw new AppError(400, 'Invalid email or password')

    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true }
    })

    if (!user || !user.passwordHash) throw new AppError(401, 'Invalid email or password')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new AppError(401, 'Invalid email or password')

    const accessToken = signAccessToken({ userId: user.id, email, plan: user.subscription?.plan })
    const refreshToken = signRefreshToken({ userId: user.id })

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    })

    res.cookie('refresh_token', refreshToken, refreshCookieOptions)

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        plan: user.subscription?.plan,
        analysesUsed: user.subscription?.analysesUsed,
        analysesLimit: user.subscription?.analysesLimit,
      },
      accessToken,
    })
  }
)

// ─── REFRESH TOKEN ────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token
  if (!refreshToken) throw new AppError(401, 'No refresh token')

  const payload = verifyRefreshToken(refreshToken)
  if (!payload) throw new AppError(401, 'Invalid refresh token')

  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: { include: { subscription: true } } }
  })

  if (!session || session.expiresAt < new Date()) {
    throw new AppError(401, 'Session expired, please login again')
  }

  const { user } = session

  const newAccessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    plan: user.subscription?.plan,
  })

  return res.json({
    accessToken: newAccessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      plan: user.subscription?.plan,
      analysesUsed: user.subscription?.analysesUsed,
      analysesLimit: user.subscription?.analysesLimit,
    }
  })
})

// ─── LOGOUT ──────────────────────────────────────────────────
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token
  if (refreshToken) {
    await prisma.session.deleteMany({ where: { refreshToken } })
  }

  res.clearCookie('refresh_token', clearRefreshCookieOptions)
  return res.json({ message: 'Logged out successfully' })
})

// ─── VERIFY EMAIL ─────────────────────────────────────────────
router.post('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.body
  if (!token) throw new AppError(400, 'Token required')

  const record = await prisma.verificationToken.findUnique({ where: { token } })
  if (!record || record.expiresAt < new Date()) {
    throw new AppError(400, 'Invalid or expired verification token')
  }

  await prisma.user.update({
    where: { email: record.email },
    data: { emailVerified: true }
  })

  await prisma.verificationToken.delete({ where: { token } })

  return res.json({ message: 'Email verified successfully' })
})

// ─── FORGOT PASSWORD ─────────────────────────────────────────
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response) => {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email } })

    // Always return 200 to prevent email enumeration
    if (!user) return res.json({ message: 'If this email exists, you will receive a reset link.' })

    // Delete old tokens
    await prisma.verificationToken.deleteMany({ where: { email, type: 'password_reset' } })

    const token = uuidv4()
    await prisma.verificationToken.create({
      data: {
        email,
        token,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
      }
    })

    await sendPasswordResetEmail(email, user.name, token)

    return res.json({ message: 'If this email exists, you will receive a reset link.' })
  }
)

// ─── RESET PASSWORD ──────────────────────────────────────────
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) throw new AppError(400, 'Invalid request')

    const { token, password } = req.body

    const record = await prisma.verificationToken.findUnique({ where: { token } })
    if (!record || record.type !== 'password_reset' || record.expiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired reset token')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { email: record.email },
      data: { passwordHash }
    })

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { user: { email: record.email } }
    })

    await prisma.verificationToken.delete({ where: { token } })

    return res.json({ message: 'Password reset successfully. Please login.' })
  }
)

// ─── ME ──────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: Request, res: Response) => {
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

export default router
