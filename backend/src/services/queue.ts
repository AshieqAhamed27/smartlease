import { Queue, Worker, Job } from 'bullmq'
import { redis } from '../config/redis'
import { prisma } from '../config/database'
import { logger } from '../config/logger'
import { analyzeLease } from './ai'
import { extractTextFromFile } from './pdfExtractor'
import { downloadFile } from './storage'
import { createNotification } from './notifications'
import { sendAnalysisCompleteEmail } from './email'

// ─── QUEUES ──────────────────────────────────────────────────
export const leaseAnalysisQueue = new Queue('lease-analysis', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
})

export async function enqueueLeaseAnalysis(data: { leaseId: string; userId: string }) {
  await leaseAnalysisQueue.add('analyze', data, {
    jobId: `lease-${data.leaseId}`,
  })
  logger.info(`Enqueued lease analysis: ${data.leaseId}`)
}

// ─── WORKER ──────────────────────────────────────────────────
let worker: Worker | null = null

export function startWorker() {
  worker = new Worker('lease-analysis', processLeaseAnalysis, {
    connection: redis,
    concurrency: 3, // Process 3 leases simultaneously
  })

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed: ${job.data.leaseId}`)
  })

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`, { leaseId: job?.data?.leaseId })
  })

  worker.on('error', (err) => {
    logger.error('Worker error:', err)
  })

  logger.info('✅ Queue worker started')
  return worker
}

// ─── JOB PROCESSOR ───────────────────────────────────────────
async function processLeaseAnalysis(job: Job<{ leaseId: string; userId: string }>) {
  const { leaseId, userId } = job.data

  logger.info(`Processing lease analysis: ${leaseId}`)

  // Mark as processing
  await prisma.lease.update({
    where: { id: leaseId },
    data: { status: 'PROCESSING' }
  })

  try {
    // 1. Get lease record
    const lease = await prisma.lease.findUnique({ where: { id: leaseId } })
    if (!lease || !lease.fileKey) throw new Error('Lease file not found')

    await job.updateProgress(10)

    // 2. Download file from S3/R2
    const fileBuffer = await downloadFile(lease.fileKey)

    await job.updateProgress(25)

    // 3. Extract text from PDF/DOC
    const extractedText = await extractTextFromFile(fileBuffer, lease.fileName || 'lease.pdf')

    if (!extractedText || extractedText.length < 100) {
      throw new Error('Could not extract meaningful text from document')
    }

    await job.updateProgress(40)

    // 4. Store extracted text
    await prisma.lease.update({
      where: { id: leaseId },
      data: {
        extractedText,
        pages: Math.ceil(extractedText.length / 3000), // rough estimate
      }
    })

    await job.updateProgress(50)

    // 5. Run AI analysis
    const analysis = await analyzeLease(extractedText)

    await job.updateProgress(85)

    // 6. Save results to database
    await prisma.$transaction([
      // Update lease
      prisma.lease.update({
        where: { id: leaseId },
        data: {
          status: 'ANALYZED',
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskLevel === 'LOW' ? 'LOW' : analysis.riskLevel === 'MEDIUM' ? 'MEDIUM' : 'HIGH',
          analysisAt: new Date(),
          // Update metadata if extracted
          rent: analysis.metadata.rent || lease.rent,
          deposit: analysis.metadata.deposit || lease.deposit,
          duration: analysis.metadata.duration || lease.duration,
          city: analysis.metadata.city || lease.city,
          state: analysis.metadata.state || lease.state,
          pages: analysis.metadata.pages || lease.pages,
        }
      }),
      // Save issues (delete old ones first)
      prisma.leaseIssue.deleteMany({ where: { leaseId } }),
      ...analysis.issues.map((issue, idx) =>
        prisma.leaseIssue.create({
          data: {
            leaseId,
            severity: issue.severity,
            clause: issue.clause,
            explanation: issue.explanation,
            quote: issue.quote,
            action: issue.action,
            legalRef: issue.legalRef,
            pageNumber: issue.pageNumber,
            position: idx,
          }
        })
      )
    ])

    await job.updateProgress(95)

    // 7. Notify user
    const criticalCount = analysis.issues.filter(i => i.severity === 'CRITICAL').length
    const user = await prisma.user.findUnique({ where: { id: userId } })

    await createNotification(userId, {
      title: `Analysis complete: ${lease.name}`,
      body: criticalCount > 0
        ? `⚠️ Found ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} — review before signing!`
        : `✅ Score: ${analysis.riskScore}/100 — ${analysis.riskLevel === 'LOW' ? 'Looks good to go.' : 'Some items to review.'}`,
      icon: criticalCount > 0 ? '🚨' : '✅',
      link: `/dashboard/leases/${leaseId}`,
    })

    if (user) {
      await sendAnalysisCompleteEmail(user.email, user.name, {
        leaseName: lease.name,
        riskScore: analysis.riskScore,
        criticalCount,
        leaseId,
      })
    }

    await job.updateProgress(100)

    return { leaseId, riskScore: analysis.riskScore, issueCount: analysis.issues.length }

  } catch (err: any) {
    logger.error(`Analysis failed for lease ${leaseId}:`, err)

    // Mark as failed
    await prisma.lease.update({
      where: { id: leaseId },
      data: { status: 'FAILED' }
    })

    // Refund the analysis credit
    await prisma.subscription.updateMany({
      where: { userId },
      data: { analysesUsed: { decrement: 1 } }
    })

    // Notify user of failure
    await createNotification(userId, {
      title: 'Analysis failed',
      body: 'We could not analyze your lease. The credit has been refunded. Please try again.',
      icon: '❌',
      link: `/dashboard`,
    })

    throw err
  }
}

export { worker }
