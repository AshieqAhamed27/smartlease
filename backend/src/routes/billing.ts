import { Router, Request, Response } from 'express'
import { env } from '../config/env'
import { prisma } from '../config/database'
import { authenticate } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { logger } from '../config/logger'
import {
  RazorpayApiError,
  RazorpaySubscription,
  RazorpayWebhookEvent,
  cancelRazorpaySubscription,
  createRazorpaySubscription,
  getRazorpaySubscription,
  verifyRazorpayPaymentSignature,
} from '../services/razorpay'

const router = Router()

const PLAN_LIMITS = {
  FREE: 2,
  PRO: 10,
  BUSINESS: 999999,
}

const PLAN_CONFIG = {
  PRO: {
    planId: env.RAZORPAY_PRO_PLAN_ID,
    totalCount: 120,
  },
  BUSINESS: {
    planId: env.RAZORPAY_BUSINESS_PLAN_ID,
    totalCount: 120,
  },
}

const ACTIVE_RAZORPAY_STATUSES = new Set(['authenticated', 'active'])
const INACTIVE_RAZORPAY_STATUSES = new Set(['cancelled', 'completed', 'expired', 'halted', 'paused'])

function unixToDate(value?: number | null) {
  return value ? new Date(Number(value) * 1000) : undefined
}

function getFallbackPeriodEnd(startedAtUnix?: number | null) {
  const end = unixToDate(startedAtUnix) || new Date()
  end.setMonth(end.getMonth() + 1)
  return end
}

function mapRazorpayStatus(status?: string) {
  const normalized = String(status || '').toLowerCase()
  if (ACTIVE_RAZORPAY_STATUSES.has(normalized)) return 'ACTIVE'
  if (normalized === 'pending' || normalized === 'created') return 'INCOMPLETE'
  if (normalized === 'halted') return 'PAST_DUE'
  if (INACTIVE_RAZORPAY_STATUSES.has(normalized)) return 'CANCELED'
  return 'ACTIVE'
}

function getPlanConfig(plan: string) {
  if (plan !== 'PRO' && plan !== 'BUSINESS') {
    throw new AppError(400, 'Invalid plan')
  }
  return PLAN_CONFIG[plan]
}

async function syncSubscriptionFromRazorpay(
  subscription: RazorpaySubscription,
  fallback?: { userId?: string; plan?: string; paymentId?: string }
) {
  const notes = subscription.notes || {}
  const userId = fallback?.userId || notes.userId
  const plan = fallback?.plan || notes.plan
  if (!userId || (plan !== 'PRO' && plan !== 'BUSINESS')) return

  const status = mapRazorpayStatus(subscription.status)
  const currentPeriodEnd = unixToDate(subscription.current_end) || unixToDate(subscription.charge_at) || getFallbackPeriodEnd()

  await prisma.subscription.update({
    where: { userId },
    data: {
      plan: status === 'CANCELED' ? 'FREE' : plan,
      status: status as any,
      analysesLimit: status === 'CANCELED' ? PLAN_LIMITS.FREE : PLAN_LIMITS[plan],
      analysesUsed: status === 'CANCELED' ? 0 : undefined,
      razorpayCustomerId: subscription.customer_id || undefined,
      razorpaySubscriptionId: status === 'CANCELED' ? null : subscription.id,
      razorpayPlanId: subscription.plan_id || getPlanConfig(plan).planId,
      razorpayPaymentId: fallback?.paymentId || undefined,
      currentPeriodStart: unixToDate(subscription.current_start) || new Date(),
      currentPeriodEnd,
      cancelAtPeriodEnd: status === 'CANCELED' || subscription.status === 'cancel_scheduled',
    }
  })
}

function toHttpError(err: unknown) {
  if (err instanceof RazorpayApiError) {
    return new AppError(err.statusCode, err.message)
  }
  if (err instanceof AppError) return err
  return new AppError(500, 'Razorpay request failed')
}

// GET BILLING INFO
router.get('/', authenticate, async (req: Request, res: Response) => {
  const sub = await prisma.subscription.findUnique({
    where: { userId: req.user!.userId }
  })
  if (!sub) throw new AppError(404, 'Subscription not found')

  let razorpayData: RazorpaySubscription | null = null
  if (sub.razorpaySubscriptionId && !env.PAYMENT_SIMULATION) {
    try {
      razorpayData = await getRazorpaySubscription(sub.razorpaySubscriptionId)
    } catch (err) {
      logger.warn('Could not refresh Razorpay subscription', { err, subscriptionId: sub.razorpaySubscriptionId })
    }
  }

  return res.json({
    plan: sub.plan,
    status: sub.status,
    analysesUsed: sub.analysesUsed,
    analysesLimit: sub.analysesLimit,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    razorpayData,
  })
})

// CREATE RAZORPAY SUBSCRIPTION
router.post('/checkout', authenticate, async (req: Request, res: Response) => {
  const { plan } = req.body
  const planConfig = getPlanConfig(plan)

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { subscription: true }
  })
  if (!user) throw new AppError(404, 'User not found')
  if (!user.subscription) throw new AppError(404, 'Subscription not found')

  if (env.PAYMENT_SIMULATION) {
    const subscriptionId = `sub_sim_${Date.now()}`
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        plan,
        status: 'ACTIVE',
        analysesLimit: PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS],
        razorpaySubscriptionId: subscriptionId,
        razorpayPlanId: planConfig.planId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: getFallbackPeriodEnd(),
        cancelAtPeriodEnd: false,
      }
    })

    return res.json({
      keyId: env.RAZORPAY_KEY_ID,
      simulation: true,
      subscription: { id: subscriptionId, status: 'active' },
      plan,
      user: {
        plan,
        analysesLimit: PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS],
        analysesUsed: user.subscription.analysesUsed,
      }
    })
  }

  try {
    const subscription = await createRazorpaySubscription({
      plan_id: planConfig.planId,
      total_count: planConfig.totalCount,
      quantity: 1,
      customer_notify: 1,
      notes: {
        userId: user.id,
        plan,
        email: user.email,
        name: user.name,
      },
    })

    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: 'INCOMPLETE',
        razorpaySubscriptionId: subscription.id,
        razorpayCustomerId: subscription.customer_id || undefined,
        razorpayPlanId: subscription.plan_id || planConfig.planId,
        cancelAtPeriodEnd: false,
      }
    })

    return res.json({
      keyId: env.RAZORPAY_KEY_ID,
      subscription,
      plan,
    })
  } catch (err) {
    throw toHttpError(err)
  }
})

// VERIFY CHECKOUT SIGNATURE
router.post('/verify', authenticate, async (req: Request, res: Response) => {
  const {
    plan,
    razorpay_subscription_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body

  if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
    throw new AppError(400, 'Missing Razorpay verification fields')
  }
  getPlanConfig(plan)

  const valid = verifyRazorpayPaymentSignature(
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature
  )
  if (!valid) throw new AppError(400, 'Payment verification failed')

  let subscription: RazorpaySubscription = {
    id: razorpay_subscription_id,
    status: 'active',
    plan_id: getPlanConfig(plan).planId,
    current_start: Math.floor(Date.now() / 1000),
  }

  if (!env.PAYMENT_SIMULATION) {
    try {
      subscription = await getRazorpaySubscription(razorpay_subscription_id)
    } catch (err) {
      logger.warn('Could not fetch verified Razorpay subscription', { err, razorpay_subscription_id })
    }
  }

  await syncSubscriptionFromRazorpay(subscription, {
    userId: req.user!.userId,
    plan,
    paymentId: razorpay_payment_id,
  })

  const updated = await prisma.subscription.findUnique({
    where: { userId: req.user!.userId }
  })

  return res.json({
    message: 'Subscription active',
    user: {
      plan: updated?.plan,
      analysesUsed: updated?.analysesUsed,
      analysesLimit: updated?.analysesLimit,
    },
  })
})

// CANCEL SUBSCRIPTION
router.post('/cancel', authenticate, async (req: Request, res: Response) => {
  const sub = await prisma.subscription.findUnique({
    where: { userId: req.user!.userId }
  })
  if (!sub?.razorpaySubscriptionId) throw new AppError(400, 'No active subscription to cancel')

  if (!env.PAYMENT_SIMULATION) {
    try {
      await cancelRazorpaySubscription(sub.razorpaySubscriptionId, true)
    } catch (err) {
      throw toHttpError(err)
    }
  }

  await prisma.subscription.update({
    where: { userId: req.user!.userId },
    data: { cancelAtPeriodEnd: true }
  })

  return res.json({ message: 'Subscription will be cancelled at end of billing period' })
})

// This checkout flow does not expose hosted invoice PDFs.
router.get('/invoices', authenticate, async (req: Request, res: Response) => {
  return res.json({ invoices: [] })
})

export async function handleRazorpayWebhook(event: RazorpayWebhookEvent) {
  logger.info(`Razorpay webhook: ${event.event}`)

  const subscription = event.payload?.subscription?.entity
  if (subscription && event.event?.startsWith('subscription.')) {
    await syncSubscriptionFromRazorpay(subscription)
    return
  }

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const notes = event.payload?.order?.entity?.notes || {}
    const paymentId = event.payload?.payment?.entity?.id
    const periodStartedAt = event.payload?.payment?.entity?.created_at ||
      event.payload?.order?.entity?.created_at ||
      event.created_at
    const plan = notes.plan
    const userId = notes.userId
    if (userId && (plan === 'PRO' || plan === 'BUSINESS')) {
      await prisma.subscription.update({
        where: { userId },
        data: {
          plan,
          status: 'ACTIVE',
          analysesLimit: PLAN_LIMITS[plan],
          razorpayPaymentId: paymentId,
          currentPeriodStart: unixToDate(periodStartedAt) || new Date(),
          currentPeriodEnd: getFallbackPeriodEnd(periodStartedAt),
        }
      })
    }
  }
}

export default router
