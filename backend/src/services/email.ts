import { Resend } from 'resend'
import { env } from '../config/env'
import { logger } from '../config/logger'

const resend = new Resend(env.RESEND_API_KEY)

const BASE_STYLES = `
  font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0f0e0c;
  max-width: 560px;
  margin: 0 auto;
`

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#faf8f4;padding:40px 20px;margin:0">
  <div style="${BASE_STYLES}">
    <div style="text-align:center;margin-bottom:32px">
      <div style="background:#2c5f2e;display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px">
        <span style="font-size:18px">🏠</span>
        <span style="color:#fff;font-size:18px;font-weight:600">SmartLease</span>
      </div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e8e4da">
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;font-size:12px;color:#8a8680">
      SmartLease · Protecting renters across India<br>
      <a href="{{unsubscribe}}" style="color:#8a8680">Unsubscribe</a> · 
      <a href="${env.APP_URL}/privacy" style="color:#8a8680">Privacy Policy</a>
    </div>
  </div>
</body>
</html>`
}

async function send(to: string, subject: string, html: string) {
  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    })
    if (error) throw new Error(error.message)
    logger.info(`Email sent to ${to}: ${subject}`)
  } catch (err) {
    logger.error(`Failed to send email to ${to}:`, err)
    // Don't throw — email failures shouldn't break the flow
  }
}

// ─── VERIFICATION EMAIL ───────────────────────────────────────
export async function sendVerificationEmail(email: string, name: string, token: string) {
  const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`
  const html = emailWrapper(`
    <h1 style="font-size:24px;margin:0 0 8px">Verify your email ✉️</h1>
    <p style="color:#4a4843;margin:0 0 24px">Hi ${name}, one quick step to activate your SmartLease account.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${verifyUrl}" style="background:#2c5f2e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">Verify Email Address</a>
    </div>
    <p style="color:#8a8680;font-size:13px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
  `)
  await send(email, 'Verify your SmartLease email', html)
}

// ─── PASSWORD RESET ───────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`
  const html = emailWrapper(`
    <h1 style="font-size:24px;margin:0 0 8px">Reset your password 🔐</h1>
    <p style="color:#4a4843;margin:0 0 24px">Hi ${name}, we received a request to reset your SmartLease password.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${resetUrl}" style="background:#2c5f2e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">Reset Password</a>
    </div>
    <p style="color:#8a8680;font-size:13px">This link expires in 1 hour. If you didn't request this, your account is safe — just ignore this email.</p>
  `)
  await send(email, 'Reset your SmartLease password', html)
}

// ─── ANALYSIS COMPLETE ───────────────────────────────────────
export async function sendAnalysisCompleteEmail(
  email: string,
  name: string,
  data: { leaseName: string; riskScore: number; criticalCount: number; leaseId: string }
) {
  const { leaseName, riskScore, criticalCount, leaseId } = data
  const scoreColor = riskScore >= 70 ? '#1a6b3a' : riskScore >= 40 ? '#b85c00' : '#c0392b'
  const scoreLabel = riskScore >= 70 ? '✅ Safe to proceed' : riskScore >= 40 ? '⚠️ Review before signing' : '🚨 Do not sign without changes'
  const viewUrl = `${env.APP_URL}/dashboard/leases/${leaseId}`

  const html = emailWrapper(`
    <h1 style="font-size:24px;margin:0 0 8px">Your lease analysis is ready 🔍</h1>
    <p style="color:#4a4843;margin:0 0 24px">Hi ${name}, we've finished analyzing <strong>${leaseName}</strong>.</p>
    
    <div style="background:#f3f0e8;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
      <div style="font-size:48px;font-weight:700;color:${scoreColor}">${riskScore}</div>
      <div style="font-size:14px;color:#4a4843;margin-top:4px">out of 100</div>
      <div style="font-size:14px;font-weight:600;color:${scoreColor};margin-top:8px">${scoreLabel}</div>
    </div>

    ${criticalCount > 0 ? `
    <div style="background:#fdf0ee;border:1px solid #f5c0bb;border-radius:10px;padding:14px;margin-bottom:20px">
      <strong style="color:#c0392b">⚠️ ${criticalCount} critical clause${criticalCount > 1 ? 's' : ''} found</strong>
      <p style="color:#4a4843;margin:6px 0 0;font-size:13px">Review these before signing — some may be illegal or expose you to significant costs.</p>
    </div>` : ''}

    <div style="text-align:center;margin:24px 0">
      <a href="${viewUrl}" style="background:#2c5f2e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">View Full Analysis →</a>
    </div>
  `)
  await send(email, `Lease analysis ready: ${riskScore}/100 — ${leaseName}`, html)
}

// ─── WELCOME EMAIL ────────────────────────────────────────────
export async function sendWelcomeEmail(email: string, name: string) {
  const html = emailWrapper(`
    <h1 style="font-size:24px;margin:0 0 8px">Welcome to SmartLease! 🏠</h1>
    <p style="color:#4a4843;margin:0 0 20px">Hi ${name}, you're all set. Here's what you can do:</p>
    
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">
      ${[
        ['🔍','Upload your first lease','Get instant AI clause analysis — free'],
        ['⚖️','Know your rights','Access our Indian tenant rights library'],
        ['🤝','Negotiate confidently','Get AI-generated negotiation scripts'],
      ].map(([icon, title, desc]) => `
      <div style="display:flex;gap:12px;align-items:flex-start;padding:12px;background:#f3f0e8;border-radius:10px">
        <span style="font-size:20px">${icon}</span>
        <div><div style="font-weight:600;margin-bottom:2px">${title}</div><div style="font-size:13px;color:#8a8680">${desc}</div></div>
      </div>`).join('')}
    </div>

    <div style="text-align:center">
      <a href="${env.APP_URL}/dashboard" style="background:#2c5f2e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">Open Dashboard →</a>
    </div>
  `)
  await send(email, 'Welcome to SmartLease — Let\'s protect your rights', html)
}

// ─── UPGRADE CONFIRMATION ─────────────────────────────────────
export async function sendUpgradeEmail(email: string, name: string, plan: string) {
  const html = emailWrapper(`
    <h1 style="font-size:24px;margin:0 0 8px">You're on ${plan}! 🎉</h1>
    <p style="color:#4a4843;margin:0 0 20px">Hi ${name}, your SmartLease ${plan} plan is now active.</p>
    <div style="background:#edf7f1;border:1px solid #a8dbbe;border-radius:10px;padding:16px;margin-bottom:24px">
      <strong style="color:#1a6b3a">What's unlocked:</strong>
      <ul style="color:#4a4843;margin:8px 0 0;padding-left:20px">
        ${plan === 'PRO' ? '<li>10 lease analyses per month</li><li>Full clause-by-clause breakdown</li><li>Unlimited AI chat</li><li>Negotiation scripts & PDF reports</li>' : '<li>Unlimited analyses</li><li>Team accounts (5 seats)</li><li>API access & white-label reports</li>'}
      </ul>
    </div>
    <div style="text-align:center">
      <a href="${env.APP_URL}/dashboard" style="background:#2c5f2e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">Start Analyzing →</a>
    </div>
  `)
  await send(email, `Your SmartLease ${plan} plan is active`, html)
}
