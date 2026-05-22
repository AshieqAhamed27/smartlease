import Redis from 'ioredis'
import { env } from './env'

export const redis = env.ENABLE_REDIS_QUEUE && env.REDIS_URL ? new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  }) : null

export const hasRedis = Boolean(redis)

redis?.on('error', (err) => {
  if (!err.message.includes('ECONNREFUSED')) {
    console.error('Redis error:', err.message)
  }
})
