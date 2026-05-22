import { z } from 'zod'

if (!process.env.MONGO_URI && process.env.DATABASE_URL?.startsWith('mongodb')) {
  process.env.MONGO_URI = process.env.DATABASE_URL
}

if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database
  MONGO_URI: z.string().startsWith('mongodb'),
  DATABASE_URL: z.string().optional(),

  // Redis is optional. When omitted, lease analysis runs in the API process.
  REDIS_URL: z.string().optional(),
  ENABLE_REDIS_QUEUE: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Anthropic. Optional at boot so deploys can start; AI features require it at runtime.
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().startsWith('rzp_'),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  RAZORPAY_PRO_PLAN_ID: z.string().optional(),
  RAZORPAY_BUSINESS_PLAN_ID: z.string().optional(),
  RAZORPAY_MONTHLY_PLAN_ID: z.string().optional(),
  RAZORPAY_YEARLY_PLAN_ID: z.string().optional(),
  PAYMENT_SIMULATION: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),

  // Storage: Cloudinary is supported for InvoicePro compatibility; S3/R2 remains optional.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().default('auto'),
  STORAGE_ENDPOINT: z.string().url().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().url().optional(),

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
  if (data.NODE_ENV === 'production' && data.PAYMENT_SIMULATION) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PAYMENT_SIMULATION'],
      message: 'PAYMENT_SIMULATION must be false in production',
    })
  }

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

  const hasCloudinary = Boolean(
    data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET
  )
  const hasS3 = Boolean(
    data.STORAGE_BUCKET && data.STORAGE_ENDPOINT && data.STORAGE_ACCESS_KEY &&
    data.STORAGE_SECRET_KEY && data.STORAGE_PUBLIC_URL
  )

  if (!hasCloudinary && !hasS3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CLOUDINARY_CLOUD_NAME'],
      message: 'Provide Cloudinary credentials or all STORAGE_* S3/R2 variables',
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
