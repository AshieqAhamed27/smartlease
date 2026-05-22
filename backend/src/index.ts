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
import { hasRedis, redis } from './config/redis'
import { errorHandler, notFound } from './middleware/errorHandler'
import { wrapAsyncRouter } from './middleware/wrapAsyncRouter'

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
  origin: env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}))

// Razorpay webhook routes need the raw body before JSON parsing.
app.use('/api/webhooks', wrapAsyncRouter(webhookRoutes))

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
    await prisma.$runCommandRaw({ ping: 1 })
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      services: {
        database: 'ok',
        queue: hasRedis ? 'redis' : 'inline',
      },
    })
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Service unavailable' })
  }
})

// ─── API ROUTES ──────────────────────────────────────────────
app.use('/api/auth', wrapAsyncRouter(authRoutes))
app.use('/api/users', wrapAsyncRouter(userRoutes))
app.use('/api/leases', wrapAsyncRouter(leaseRoutes))
app.use('/api/analysis', wrapAsyncRouter(analysisRoutes))
app.use('/api/chat', wrapAsyncRouter(chatRoutes))
app.use('/api/billing', wrapAsyncRouter(billingRoutes))
app.use('/api/notifications', wrapAsyncRouter(notificationRoutes))
app.use('/api/templates', wrapAsyncRouter(templateRoutes))

// ─── ERROR HANDLING ──────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ─── SERVER START ─────────────────────────────────────────────
async function bootstrap() {
  const PORT = env.PORT
  app.listen(PORT, () => {
    logger.info(`🚀 SmartLease API running on port ${PORT}`)
    logger.info(`   Environment: ${env.NODE_ENV}`)
    logger.info(`   Docs: http://localhost:${PORT}/health`)
    logger.info(redis ? 'Queue mode: Redis configured' : 'Queue mode: inline analysis without Redis')
  })

  prisma.$connect()
    .then(() => logger.info('✅ Database connected'))
    .catch((err) => logger.error('Database connection check failed:', err))
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...')
  await prisma.$disconnect()
  redis?.quit()
  process.exit(0)
})

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err)
  process.exit(1)
})

bootstrap()

export default app
