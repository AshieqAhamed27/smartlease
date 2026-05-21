import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { authenticate } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { chatAboutLease } from '../services/ai'

const router = Router()
router.use(authenticate)

// GET /api/chat/:leaseId — fetch history
router.get('/:leaseId', async (req: Request, res: Response) => {
  const lease = await prisma.lease.findFirst({
    where: { id: req.params.leaseId, userId: req.user!.userId }
  })
  if (!lease) throw new AppError(404, 'Lease not found')

  const messages = await prisma.chatMessage.findMany({
    where: { leaseId: lease.id },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
  return res.json(messages)
})

// POST /api/chat/:leaseId — send message
router.post('/:leaseId', async (req: Request, res: Response) => {
  const { content } = req.body
  if (!content?.trim()) throw new AppError(400, 'Message content required')

  const lease = await prisma.lease.findFirst({
    where: { id: req.params.leaseId, userId: req.user!.userId },
    include: { issues: { orderBy: { position: 'asc' } } }
  })
  if (!lease) throw new AppError(404, 'Lease not found')
  if (lease.status !== 'ANALYZED') throw new AppError(400, 'Lease has not been analyzed yet')

  // Save user message
  await prisma.chatMessage.create({
    data: { leaseId: lease.id, role: 'USER', content }
  })

  // Build history for AI (last 20 messages for context)
  const history = await prisma.chatMessage.findMany({
    where: { leaseId: lease.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  // Call AI
  const reply = await chatAboutLease(
    {
      name: lease.name,
      address: lease.address || '',
      rent: lease.rent || '',
      deposit: lease.deposit || '',
      duration: lease.duration || '',
      city: lease.city || '',
      state: lease.state || '',
      riskScore: lease.riskScore || 50,
      issues: lease.issues.map((i: { severity: string; clause: string; explanation: string }) => ({
        severity: i.severity,
        clause: i.clause,
        explanation: i.explanation,
      })),
    },
    history.map((m: { role: string; content: string }) => ({ role: m.role.toLowerCase() as 'user' | 'assistant', content: m.content }))
  )

  // Save assistant reply
  await prisma.chatMessage.create({
    data: { leaseId: lease.id, role: 'ASSISTANT', content: reply }
  })

  return res.json({ reply })
})

// DELETE /api/chat/:leaseId — clear history
router.delete('/:leaseId', async (req: Request, res: Response) => {
  const lease = await prisma.lease.findFirst({
    where: { id: req.params.leaseId, userId: req.user!.userId }
  })
  if (!lease) throw new AppError(404, 'Lease not found')

  await prisma.chatMessage.deleteMany({ where: { leaseId: lease.id } })
  return res.json({ message: 'Chat history cleared' })
})

export default router
