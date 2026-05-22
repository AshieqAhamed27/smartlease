import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'
import { env } from '../config/env'

let s3: S3Client | null = null

function usingCloudinary() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)
}

function getS3Client() {
  if (!s3) {
    s3 = new S3Client({
      region: env.STORAGE_REGION,
      endpoint: env.STORAGE_ENDPOINT!,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY!,
        secretAccessKey: env.STORAGE_SECRET_KEY!,
      },
    })
  }
  return s3
}

function encodeCloudinaryPath(key: string) {
  return key.split('/').map(encodeURIComponent).join('/')
}

function cloudinaryDeliveryUrl(key: string) {
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/raw/upload/${encodeCloudinaryPath(key)}`
}

function signCloudinaryParams(params: Record<string, string | number>) {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return crypto.createHash('sha1').update(`${payload}${env.CLOUDINARY_API_SECRET}`).digest('hex')
}

async function uploadToCloudinary({ key, body, contentType }: {
  key: string; body: Buffer; contentType: string
}) {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = signCloudinaryParams({ public_id: key, timestamp })
  const form = new FormData()
  form.append('file', new Blob([body], { type: contentType }), key.split('/').pop() || 'lease.pdf')
  form.append('public_id', key)
  form.append('timestamp', String(timestamp))
  form.append('api_key', env.CLOUDINARY_API_KEY!)
  form.append('signature', signature)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/raw/upload`, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Cloudinary upload failed: ${message}`)
  }

  const result = await response.json() as { secure_url?: string }
  return result.secure_url || cloudinaryDeliveryUrl(key)
}

async function deleteFromCloudinary(key: string) {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = signCloudinaryParams({ public_id: key, timestamp })
  const form = new URLSearchParams({
    public_id: key,
    timestamp: String(timestamp),
    api_key: env.CLOUDINARY_API_KEY!,
    signature,
  })

  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/raw/destroy`, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Cloudinary delete failed: ${message}`)
  }
}

export async function uploadFile({ key, body, contentType }: {
  key: string; body: Buffer; contentType: string
}) {
  if (usingCloudinary()) {
    return uploadToCloudinary({ key, body, contentType })
  }

  await getS3Client().send(new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  return `${env.STORAGE_PUBLIC_URL}/${key}`
}

export async function downloadFile(key: string): Promise<Buffer> {
  if (usingCloudinary()) {
    const response = await fetch(cloudinaryDeliveryUrl(key))
    if (!response.ok) throw new Error(`Cloudinary download failed: ${response.statusText}`)
    return Buffer.from(await response.arrayBuffer())
  }

  const res = await getS3Client().send(new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET!,
    Key: key,
  }))
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as any) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export async function deleteFile(key: string) {
  if (usingCloudinary()) {
    await deleteFromCloudinary(key)
    return
  }

  await getS3Client().send(new DeleteObjectCommand({
    Bucket: env.STORAGE_BUCKET!,
    Key: key,
  }))
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  if (usingCloudinary()) {
    return cloudinaryDeliveryUrl(key)
  }

  return getSignedUrl(getS3Client(), new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET!,
    Key: key,
  }), { expiresIn })
}
