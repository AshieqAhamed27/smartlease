import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().startsWith('rzp_'),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  RAZORPAY_PRO_PLAN_ID: z.string().optional(),
  RAZORPAY_BUSINESS_PLAN_ID: z.string().optional(),
  RAZORPAY_MONTHLY_PLAN_ID: z.string().optional(),
  RAZORPAY_YEARLY_PLAN_ID: z.string().optional(),
  PAYMENT_SIMULATION: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),

  // Storage
  STORAGE_BUCKET: z.string(),
  STORAGE_REGION: z.string().default('auto'),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_ACCESS_KEY: z.string(),
  STORAGE_SECRET_KEY: z.string(),
  STORAGE_PUBLIC_URL: z.string().url(),

  // Email
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_FROM: z.string().min(1).optional().default('SmartLease <hello@smartlease.in>'),

  // App
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
}).transform((data) => ({
  ...data,
  RAZORPAY_PRO_PLAN_ID: data.RAZORPAY_PRO_PLAN_ID || data.RAZORPAY_MONTHLY_PLAN_ID || '',
  RAZORPAY_BUSINESS_PLAN_ID: data.RAZORPAY_BUSINESS_PLAN_ID || data.RAZORPAY_YEARLY_PLAN_ID || '',
})).superRefine((data, ctx) => {
  if (!data.RAZORPAY_PRO_PLAN_ID) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['RAZORPAY_PRO_PLAN_ID'],
      message: 'RAZORPAY_PRO_PLAN_ID or RAZORPAY_MONTHLY_PLAN_ID is required',
    })
  }
  if (!data.RAZORPAY_BUSINESS_PLAN_ID) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['RAZORPAY_BUSINESS_PLAN_ID'],
      message: 'RAZORPAY_BUSINESS_PLAN_ID or RAZORPAY_YEARLY_PLAN_ID is required',
    })
  }
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }
  return result.data
}

export const env = validateEnv()
export type Env = z.infer<typeof envSchema>
