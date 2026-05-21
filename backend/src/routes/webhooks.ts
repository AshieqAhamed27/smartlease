import { Router, Request, Response, raw } from 'express'
import { handleRazorpayWebhook } from './billing'
import { logger } from '../config/logger'
import { verifyRazorpayWebhookSignature } from '../services/razorpay'

const router = Router()

router.post('/razorpay',
  raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['x-razorpay-signature']
    if (!sig || Array.isArray(sig)) return res.status(400).json({ error: 'Missing signature' })

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : JSON.stringify(req.body)

    if (!verifyRazorpayWebhookSignature(rawBody, sig)) {
      logger.error('Razorpay webhook signature failed')
      return res.status(400).json({ error: 'Invalid webhook signature' })
    }

    try {
      const event = JSON.parse(rawBody)
      await handleRazorpayWebhook(event)
      return res.json({ received: true })
    } catch (err) {
      logger.error('Razorpay webhook handler error:', err)
      return res.status(500).json({ error: 'Webhook handler failed' })
    }
  }
)

export default router
