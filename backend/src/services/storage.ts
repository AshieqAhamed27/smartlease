import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env'

const s3 = new S3Client({
  region: env.STORAGE_REGION,
  endpoint: env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY,
  },
})

export async function uploadFile({ key, body, contentType }: {
  key: string; body: Buffer; contentType: string
}) {
  await s3.send(new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  return `${env.STORAGE_PUBLIC_URL}/${key}`
}

export async function downloadFile(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
  }))
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as any) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export async function deleteFile(key: string) {
  await s3.send(new DeleteObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
  }))
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
  }), { expiresIn })
}
