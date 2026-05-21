// worker.ts - Standalone BullMQ worker for Render
import { prisma } from './config/database'
import { redis } from './config/redis'
import { logger } from './config/logger'
import { startWorker } from './services/queue'

async function bootstrap() {
  try {
    await prisma.$connect()
    logger.info('✅ Worker: Database connected')

    await redis.ping()
    logger.info('✅ Worker: Redis connected')

    const worker = startWorker()
    logger.info('🚀 SmartLease Worker running — waiting for jobs')

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing worker...')
      await worker?.close()
      await prisma.$disconnect()
      redis.quit()
      process.exit(0)
    })
  } catch (err) {
    logger.error('Worker failed to start:', err)
    process.exit(1)
  }
}

bootstrap()
