import crypto from 'crypto'
import https from 'https'
import { env } from '../config/env'

type RazorpayMethod = 'GET' | 'POST'

export interface RazorpaySubscription {
  id: string
  status?: string
  plan_id?: string
  customer_id?: string
  short_url?: string
  current_start?: number
  current_end?: number
  charge_at?: number
  ended_at?: number
  paid_count?: number
  total_count?: number
  remaining_count?: number
  notes?: Record<string, string>
}

export interface RazorpayPayment {
  id?: string
  status?: string
  amount?: number
  currency?: string
  created_at?: number
}

export interface RazorpayWebhookEvent {
  event?: string
  created_at?: number
  payload?: {
    subscription?: { entity?: RazorpaySubscription }
    payment?: { entity?: RazorpayPayment }
    order?: { entity?: { notes?: Record<string, string>; created_at?: number } }
  }
}

interface RazorpayResponse<T> {
  ok: boolean
  status: number
  body: T
}

export class RazorpayApiError extends Error {
  statusCode: number
  body: unknown

  constructor(statusCode: number, message: string, body: unknown) {
    super(message)
    this.statusCode = statusCode
    this.body = body
  }
}

function getAuthHeader() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null
  return `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`
}

function getRazorpayErrorMessage(body: any) {
  return body?.error?.description ||
    body?.error?.reason ||
    body?.message ||
    'Razorpay request failed'
}

export function verifyRazorpayPaymentSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string
) {
  if (env.PAYMENT_SIMULATION && signature === 'simulation') return true
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex')

  return safeCompare(expected, signature)
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string) {
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  return safeCompare(expected, signature)
}

function safeCompare(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual || '')
  if (expectedBuffer.length !== actualBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

async function requestRazorpay<T>(
  path: string,
  method: RazorpayMethod = 'POST',
  payload?: Record<string, unknown>
) {
  const authHeader = getAuthHeader()
  if (!authHeader) {
    throw new RazorpayApiError(500, 'Razorpay keys are not configured', {})
  }

  const hasBody = method !== 'GET' && payload && Object.keys(payload).length > 0
  const data = hasBody ? JSON.stringify(payload) : ''
  const headers: Record<string, string | number> = { Authorization: authHeader }

  if (hasBody) {
    headers['Content-Type'] = 'application/json'
    headers['Content-Length'] = Buffer.byteLength(data)
  }

  const response = await new Promise<RazorpayResponse<T>>((resolve, reject) => {
    const req = https.request({
      hostname: 'api.razorpay.com',
      path,
      method,
      headers,
    }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          resolve({
            ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
            status: res.statusCode || 500,
            body: body ? JSON.parse(body) : {} as T,
          })
        } catch {
          resolve({
            ok: false,
            status: res.statusCode || 500,
            body: { message: body || 'Invalid Razorpay response' } as T,
          })
        }
      })
    })

    req.on('error', reject)
    if (hasBody) req.write(data)
    req.end()
  })

  if (!response.ok) {
    throw new RazorpayApiError(
      response.status,
      getRazorpayErrorMessage(response.body),
      response.body
    )
  }

  return response.body
}

export function createRazorpaySubscription(payload: {
  plan_id: string
  total_count: number
  quantity: number
  customer_notify: 0 | 1
  notes: Record<string, string>
}) {
  return requestRazorpay<RazorpaySubscription>('/v1/subscriptions', 'POST', payload)
}

export function getRazorpaySubscription(subscriptionId: string) {
  return requestRazorpay<RazorpaySubscription>(
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    'GET'
  )
}

export function cancelRazorpaySubscription(subscriptionId: string, cancelAtCycleEnd = true) {
  return requestRazorpay<RazorpaySubscription>(
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    'POST',
    { cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }
  )
}
