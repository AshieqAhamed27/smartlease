import Redis from 'ioredis'
import { env } from './env'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
})

redis.on('error', (err) => {
  if (!err.message.includes('ECONNREFUSED')) {
    console.error('Redis error:', err.message)
  }
})
