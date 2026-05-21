import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'demo@smartlease.in' },
    update: {},
    create: {
      email: 'demo@smartlease.in',
      passwordHash,
      name: 'Demo User',
      city: 'Bengaluru',
      state: 'Karnataka',
      emailVerified: true,
      subscription: {
        create: {
          plan: 'PRO',
          status: 'ACTIVE',
          analysesUsed: 3,
          analysesLimit: 10,
        }
      }
    },
    include: { subscription: true }
  })

  console.log(`✅ Demo user: ${user.email} / password123`)

  // Create sample analyzed lease
  const existingLease = await prisma.lease.findFirst({
    where: { userId: user.id, name: 'Koramangala 2BHK' },
  })

  const lease = existingLease || await prisma.lease.create({
    data: {
      userId: user.id,
      name: 'Koramangala 2BHK',
      address: '12 Residency Rd, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      rent: '₹32,000',
      deposit: '₹1,92,000',
      duration: '11 months',
      pages: 18,
      status: 'ANALYZED',
      riskScore: 38,
      riskLevel: 'HIGH',
      analysisAt: new Date(),
      issues: {
        create: [
          {
            severity: 'CRITICAL',
            clause: 'Landlord Entry Without Notice',
            explanation: 'Clause 7.3 allows the landlord to enter at any time with no prior notice — void under Karnataka Rent Control Act §20 and Model Tenancy Act 2021.',
            quote: 'Landlord may enter at his discretion at any hour without prior intimation.',
            action: 'Request 24-hour written notice minimum',
            legalRef: 'Karnataka RCA §20 / MTA 2021 §11',
            position: 0,
          },
          {
            severity: 'CRITICAL',
            clause: 'Unilateral Rent Increase',
            explanation: 'Clause 4.1 allows up to 20% rent hike with only 7 days notice. MTA 2021 requires 90-day advance notice and a fixed annual schedule.',
            quote: 'Rent may be revised by Landlord with 7 days written notice at any point.',
            action: 'Negotiate fixed 5% annual increase only',
            legalRef: 'MTA 2021 §8',
            position: 1,
          },
          {
            severity: 'WARNING',
            clause: 'Excessive Early Exit Penalty',
            explanation: '3-month rent penalty (₹96,000) for early vacating. Industry standard is 1 month. You lose full deposit for less than 60 days notice.',
            quote: 'Vacating before term attracts penalty equivalent to three months rent.',
            action: 'Negotiate down to 1 month penalty',
            position: 2,
          },
          {
            severity: 'WARNING',
            clause: 'Maintenance Responsibility Shift',
            explanation: 'All appliance repairs become tenant responsibility after 30 days — exposing you to ₹50,000+ for aging appliances.',
            quote: 'After 30 days, all maintenance including electrical and plumbing borne by Tenant.',
            action: 'Cap tenant liability at ₹5,000 per incident',
            position: 3,
          },
          {
            severity: 'GOOD',
            clause: 'Deposit Refund Terms',
            explanation: '45-day refund timeline with itemized deductions. Clear, fair, and above average.',
            quote: 'Security deposit shall be refunded within 45 days of vacant possession.',
            action: 'No action needed',
            position: 4,
          },
        ]
      }
    }
  })

  // Seed demo notifications
  await prisma.notification.deleteMany({
    where: { userId: user.id, link: `/dashboard/leases/${lease.id}` },
  })

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        title: '🚨 Critical clause detected',
        body: 'Koramangala lease has 2 clauses requiring immediate attention',
        icon: '🚨',
        link: `/dashboard/leases/${lease.id}`,
        read: false,
      },
      {
        userId: user.id,
        title: '✅ Analysis complete',
        body: 'Your lease analysis is ready. Score: 38/100',
        icon: '✅',
        link: `/dashboard/leases/${lease.id}`,
        read: true,
      },
    ]
  })

  console.log(`✅ Demo lease created: ${lease.name}`)
  console.log('\n🎉 Seed complete!')
  console.log('   Login: demo@smartlease.in / password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
