import { Router, Request, Response } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

import { prisma } from '../config/database'
import { authenticate } from '../middleware/authenticate'
import { requirePlan } from '../middleware/requirePlan'
import { AppError } from '../middleware/errorHandler'
import { uploadFile, deleteFile, getPresignedUrl } from '../services/storage'
import { enqueueLeaseAnalysis } from '../services/queue'
import { createNotification } from '../services/notifications'

const router = Router()

// All lease routes require auth
router.use(authenticate)

// Multer: memory storage for S3 upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.mimetype)) {
      cb(new AppError(400, 'Only PDF and Word documents are allowed') as any)
    } else {
      cb(null, true)
    }
  }
})

// ─── LIST LEASES ─────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, risk } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where: any = { userId: req.user!.userId }
  if (status) where.status = status
  if (risk) where.riskLevel = risk

  const [leases, total] = await Promise.all([
    prisma.lease.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        rent: true,
        deposit: true,
        duration: true,
        pages: true,
        status: true,
        riskScore: true,
        riskLevel: true,
        analysisAt: true,
        createdAt: true,
        _count: { select: { issues: true } },
        issues: {
          select: { severity: true },
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.lease.count({ where })
  ])

  return res.json({
    leases: leases.map((l: any) => ({
      ...l,
      criticalCount: l.issues.filter((i: { severity: string }) => i.severity === 'CRITICAL').length,
      warningCount: l.issues.filter((i: { severity: string }) => i.severity === 'WARNING').length,
      goodCount: l.issues.filter((i: { severity: string }) => i.severity === 'GOOD').length,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    }
  })
})

// ─── GET SINGLE LEASE ────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const lease = await prisma.lease.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: {
      issues: { orderBy: { position: 'asc' } },
      reports: { orderBy: { createdAt: 'desc' }, take: 5 },
    }
  })
  if (!lease) throw new AppError(404, 'Lease not found')

  return res.json(lease)
})

// ─── UPLOAD & ANALYZE LEASE ──────────────────────────────────
router.post('/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) throw new AppError(400, 'No file uploaded')

    const userId = req.user!.userId

    // Check usage limits
    const subscription = await prisma.subscription.findUnique({ where: { userId } })
    if (!subscription) throw new AppError(404, 'Subscription not found')

    if (subscription.analysesUsed >= subscription.analysesLimit) {
      throw new AppError(402, `You've used all ${subscription.analysesLimit} analyses for this month. Please upgrade your plan.`, {
        code: 'ANALYSIS_LIMIT_REACHED',
        limit: subscription.analysesLimit,
        used: subscription.analysesUsed,
      })
    }

    const fileKey = `leases/${userId}/${uuidv4()}-${req.file.originalname}`

    // Upload to S3/R2
    await uploadFile({
      key: fileKey,
      body: req.file.buffer,
      contentType: req.file.mimetype,
    })

    // Create lease record
    const lease = await prisma.lease.create({
      data: {
        userId,
        name: req.body.name || req.file.originalname.replace(/\.[^/.]+$/, ''),
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        rent: req.body.rent,
        deposit: req.body.deposit,
        duration: req.body.duration,
        fileKey,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        status: 'PENDING',
      }
    })

    // Increment usage
    await prisma.subscription.update({
      where: { userId },
      data: { analysesUsed: { increment: 1 } }
    })

    // Queue background analysis job
    await enqueueLeaseAnalysis({ leaseId: lease.id, userId })

    // Notification
    await createNotification(userId, {
      title: 'Analysis started',
      body: `We're analyzing "${lease.name}" — you'll be notified when it's ready.`,
      icon: '🔍',
      link: `/dashboard/leases/${lease.id}`,
    })

    return res.status(202).json({
      lease,
      message: 'Lease uploaded successfully. Analysis in progress.',
    })
  }
)

// ─── UPDATE LEASE METADATA ───────────────────────────────────
router.patch('/:id', async (req: Request, res: Response) => {
  const lease = await prisma.lease.findFirst({
    where: { id: req.params.id, userId: req.user!.userId }
  })
  if (!lease) throw new AppError(404, 'Lease not found')

  const { name, address, city, state, rent, deposit, duration } = req.body

  const updated = await prisma.lease.update({
    where: { id: lease.id },
    data: { name, address, city, state, rent, deposit, duration }
  })

  return res.json(updated)
})

// ─── DELETE LEASE ────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const lease = await prisma.lease.findFirst({
    where: { id: req.params.id, userId: req.user!.userId }
  })
  if (!lease) throw new AppError(404, 'Lease not found')

  // Delete file from storage
  if (lease.fileKey) {
    await deleteFile(lease.fileKey).catch(() => {}) // non-fatal
  }

  await prisma.lease.delete({ where: { id: lease.id } })

  return res.json({ message: 'Lease deleted successfully' })
})

// ─── GET ANALYSIS STATUS (polling) ───────────────────────────
router.get('/:id/status', async (req: Request, res: Response) => {
  const lease = await prisma.lease.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    select: { id: true, status: true, riskScore: true, riskLevel: true, analysisAt: true }
  })
  if (!lease) throw new AppError(404, 'Lease not found')
  return res.json(lease)
})

// ─── GET DOWNLOAD URL ────────────────────────────────────────
router.get('/:id/download', async (req: Request, res: Response) => {
  const lease = await prisma.lease.findFirst({
    where: { id: req.params.id, userId: req.user!.userId }
  })
  if (!lease || !lease.fileKey) throw new AppError(404, 'File not found')

  const url = await getPresignedUrl(lease.fileKey, 3600)
  return res.json({ url, expiresIn: 3600 })
})

export default router
