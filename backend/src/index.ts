import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { rateLimit } from 'express-rate-limit'

import { env } from './config/env'
import { logger } from './config/logger'
import { prisma } from './config/database'
import { redis } from './config/redis'
import { errorHandler, notFound } from './middleware/errorHandler'

// Routes
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import leaseRoutes from './routes/leases'
import analysisRoutes from './routes/analysis'
import chatRoutes from './routes/chat'
import billingRoutes from './routes/billing'
import notificationRoutes from './routes/notifications'
import templateRoutes from './routes/templates'
import webhookRoutes from './routes/webhooks'

const app = express()

// ─── TRUST PROXY (for Railway/Render) ───────────────────────
app.set('trust proxy', 1)

// ─── SECURITY HEADERS ────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // handled by frontend
  crossOriginEmbedderPolicy: false,
}))

// ─── CORS ────────────────────────────────────────────────────
app.use(cors({
  origin: env.CORS_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}))

// Razorpay webhook routes need the raw body before JSON parsing.
app.use('/api/webhooks', webhookRoutes)

// ─── BODY PARSING ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(compression())

// ─── LOGGING ─────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.url === '/health',
  }))
}

// ─── GLOBAL RATE LIMITING ────────────────────────────────────
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})
app.use('/api/', limiter)

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    await redis.ping()
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      services: { database: 'ok', redis: 'ok' },
    })
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Service unavailable' })
  }
})

// ─── API ROUTES ──────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/leases', leaseRoutes)
app.use('/api/analysis', analysisRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/templates', templateRoutes)

// ─── ERROR HANDLING ──────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ─── SERVER START ─────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect()
    logger.info('✅ Database connected')

    await redis.ping()
    logger.info('✅ Redis connected')

    const PORT = env.PORT
    app.listen(PORT, () => {
      logger.info(`🚀 SmartLease API running on port ${PORT}`)
      logger.info(`   Environment: ${env.NODE_ENV}`)
      logger.info(`   Docs: http://localhost:${PORT}/health`)
    })
  } catch (err) {
    logger.error('❌ Failed to start server:', err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...')
  await prisma.$disconnect()
  redis.quit()
  process.exit(0)
})

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err)
  process.exit(1)
})

bootstrap()

export default app
