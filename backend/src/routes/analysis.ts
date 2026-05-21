import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { authenticate } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { enqueueLeaseAnalysis } from '../services/queue'
import { generateNegotiationLetter } from '../services/ai'

const router = Router()
router.use(authenticate)

// POST /api/analysis/:leaseId/retry  — retry failed analysis
router.post('/:leaseId/retry', async (req: Request, res: Response) => {
  const lease = await prisma.lease.findFirst({
    where: { id: req.params.leaseId, userId: req.user!.userId }
  })
  if (!lease) throw new AppError(404, 'Lease not found')
  if (lease.status === 'PROCESSING') throw new AppError(400, 'Analysis already in progress')
  if (!lease.fileKey) throw new AppError(400, 'No file found for this lease')

  await prisma.lease.update({ where: { id: lease.id }, data: { status: 'PENDING' } })
  await enqueueLeaseAnalysis({ leaseId: lease.id, userId: req.user!.userId })

  return res.json({ message: 'Analysis queued', leaseId: lease.id })
})

// POST /api/analysis/:leaseId/negotiate — generate negotiation letter
router.post('/:leaseId/negotiate', async (req: Request, res: Response) => {
  const lease = await prisma.lease.findFirst({
    where: { id: req.params.leaseId, userId: req.user!.userId },
    include: { issues: true }
  })
  if (!lease) throw new AppError(404, 'Lease not found')
  if (lease.status !== 'ANALYZED') throw new AppError(400, 'Lease must be analyzed first')

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  if (!user) throw new AppError(404, 'User not found')

  const letter = await generateNegotiationLetter(
    user.name,
    lease.address || lease.name,
    lease.issues.map((i: { severity: string; clause: string; action?: string | null }) => ({
      severity: i.severity,
      clause: i.clause,
      action: i.action || 'amendment requested',
    }))
  )

  return res.json({ letter })
})

// GET /api/analysis/:leaseId/issues — get just the issues
router.get('/:leaseId/issues', async (req: Request, res: Response) => {
  const lease = await prisma.lease.findFirst({
    where: { id: req.params.leaseId, userId: req.user!.userId }
  })
  if (!lease) throw new AppError(404, 'Lease not found')

  const issues = await prisma.leaseIssue.findMany({
    where: { leaseId: lease.id },
    orderBy: { position: 'asc' }
  })

  return res.json(issues)
})

export default router
