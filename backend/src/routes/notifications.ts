import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { authenticate } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'

const router = Router()
router.use(authenticate)

// GET /api/notifications
router.get('/', async (req: Request, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return res.json(notifications)
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response) => {
  const notif = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.userId }
  })
  if (!notif) throw new AppError(404, 'Notification not found')

  await prisma.notification.update({ where: { id: notif.id }, data: { read: true } })
  return res.json({ message: 'Marked as read' })
})

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, read: false },
    data: { read: true }
  })
  return res.json({ message: 'All notifications marked as read' })
})

// DELETE /api/notifications/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const notif = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.userId }
  })
  if (!notif) throw new AppError(404, 'Notification not found')

  await prisma.notification.delete({ where: { id: notif.id } })
  return res.json({ message: 'Notification deleted' })
})

export default router
