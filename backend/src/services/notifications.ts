import { prisma } from '../config/database'

interface NotificationData {
  title: string
  body: string
  icon?: string
  link?: string
}

export async function createNotification(userId: string, data: NotificationData) {
  return prisma.notification.create({
    data: { userId, ...data }
  })
}
