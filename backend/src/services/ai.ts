import Anthropic from '@anthropic-ai/sdk'
import { env } from '../config/env'
import { logger } from '../config/logger'

let anthropic: Anthropic | null = null

function getAnthropic() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it in Render before using AI analysis.')
  }

  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  }

  return anthropic
}

export interface LeaseIssue {
  severity: 'CRITICAL' | 'WARNING' | 'GOOD'
  clause: string
  explanation: string
  quote: string
  action: string
  legalRef?: string
  pageNumber?: number
}

export interface LeaseAnalysisResult {
  riskScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  summary: string
  issues: LeaseIssue[]
  metadata: {
    rent?: string
    deposit?: string
    duration?: string
    city?: string
    state?: string
    parties?: string
    pages?: number
  }
}

const SYSTEM_PROMPT = `You are SmartLease AI — an expert in Indian tenancy law and rental agreements.
Your job is to analyze lease agreements and identify issues that could harm tenants.

You are deeply familiar with:
- Model Tenancy Act 2021 (MTA 2021)
- Karnataka Rent Control Act
- Maharashtra Rent Control Act
- Tamil Nadu Buildings (Lease and Rent Control) Act
- Delhi Rent Control Act
- Consumer Protection Act 2019
- General principles of Indian Contract Act 1872

ANALYSIS FRAMEWORK:
1. Extract ALL key clauses — rent, deposit, duration, maintenance, entry rights, termination, penalties
2. Flag CRITICAL issues: illegal clauses, rights violations, financial traps that could cause significant harm
3. Flag WARNINGS: unfair but legal clauses worth negotiating
4. Note GOOD clauses: tenant-friendly provisions
5. Calculate an overall risk score 0-100 (100 = perfectly safe for tenant)
6. Provide specific legal references where applicable

SEVERITY DEFINITIONS:
- CRITICAL: Violates law, or exposes tenant to >₹20,000 unexpected cost, or fundamentally unfair
- WARNING: Legal but unfair or worth negotiating
- GOOD: Tenant-favorable or standard/fair clause

You MUST respond in valid JSON only. No preamble, no markdown, no explanations outside the JSON.`

const ANALYSIS_PROMPT = (leaseText: string) => `Analyze this lease agreement and respond with ONLY valid JSON in this exact structure:

{
  "riskScore": <integer 0-100, higher = safer for tenant>,
  "riskLevel": <"LOW" | "MEDIUM" | "HIGH">,
  "summary": "<2-3 sentence overall assessment for the tenant>",
  "metadata": {
    "rent": "<monthly rent amount if found>",
    "deposit": "<security deposit if found>",
    "duration": "<lease duration if found>",
    "city": "<city if mentioned>",
    "state": "<state if mentioned>",
    "parties": "<landlord and tenant names if found>"
  },
  "issues": [
    {
      "severity": "CRITICAL" | "WARNING" | "GOOD",
      "clause": "<short name of the clause, max 5 words>",
      "explanation": "<2-3 sentence plain English explanation of why this matters to the tenant>",
      "quote": "<exact verbatim text from the document, max 100 chars>",
      "action": "<specific action tenant should take, max 80 chars>",
      "legalRef": "<relevant law section, e.g. MTA 2021 §7, or null>",
      "pageNumber": <page number or null>
    }
  ]
}

IMPORTANT:
- Include ALL significant clauses (typically 5-15 issues total)
- Order: CRITICAL first, then WARNING, then GOOD
- The riskScore should reflect: 0-39 = HIGH risk (don't sign), 40-69 = MEDIUM (negotiate), 70-100 = LOW risk (good to go)
- Be specific — mention actual amounts (rent, penalties) when found in the document

LEASE TEXT:
---
${leaseText.slice(0, 15000)}
---`

export async function analyzeLease(leaseText: string): Promise<LeaseAnalysisResult> {
  logger.info(`Starting AI lease analysis, text length: ${leaseText.length}`)

  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: ANALYSIS_PROMPT(leaseText) }
    ]
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from AI')

  let result: LeaseAnalysisResult
  try {
    // Strip any accidental markdown fences
    const clean = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    result = JSON.parse(clean)
  } catch (err) {
    logger.error('Failed to parse AI response:', content.text.slice(0, 500))
    throw new Error('AI returned invalid JSON response')
  }

  // Validate and sanitize
  if (typeof result.riskScore !== 'number') result.riskScore = 50
  result.riskScore = Math.max(0, Math.min(100, result.riskScore))

  if (!['LOW', 'MEDIUM', 'HIGH'].includes(result.riskLevel)) {
    result.riskLevel = result.riskScore >= 70 ? 'LOW' : result.riskScore >= 40 ? 'MEDIUM' : 'HIGH'
  }

  if (!Array.isArray(result.issues)) result.issues = []

  // Normalize severity values
  result.issues = result.issues.map((issue, idx) => ({
    ...issue,
    severity: (['CRITICAL', 'WARNING', 'GOOD'].includes(issue.severity) ? issue.severity : 'WARNING') as any,
    position: idx,
  }))

  logger.info(`Analysis complete: score=${result.riskScore}, issues=${result.issues.length}`)
  return result
}

// ─── CHAT WITH LEASE CONTEXT ──────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chatAboutLease(
  leaseContext: {
    name: string
    address: string
    rent: string
    deposit: string
    duration: string
    city: string
    state: string
    riskScore: number
    issues: Array<{ severity: string; clause: string; explanation: string }>
  },
  messages: ChatMessage[]
): Promise<string> {

  const systemPrompt = `You are a helpful lease analysis assistant specializing in Indian tenant law.
You are advising a tenant about their specific lease.

LEASE DETAILS:
- Property: ${leaseContext.name}
- Address: ${leaseContext.address}
- Rent: ${leaseContext.rent}/month
- Security Deposit: ${leaseContext.deposit}
- Duration: ${leaseContext.duration}
- Location: ${leaseContext.city}, ${leaseContext.state}
- Risk Score: ${leaseContext.riskScore}/100

KEY ISSUES FOUND:
${leaseContext.issues.map(i => `[${i.severity}] ${i.clause}: ${i.explanation}`).join('\n')}

GUIDELINES:
- Be concise: 2-4 sentences unless the question genuinely needs more
- Always take the tenant's side
- Reference specific Indian laws (MTA 2021, state RCAs, IPC) when applicable
- Give actionable, practical advice
- Never give legal advice disclaimers — be helpful and direct
- Do not use markdown formatting`

  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}

// ─── GENERATE NEGOTIATION LETTER ─────────────────────────────
export async function generateNegotiationLetter(
  tenantName: string,
  leaseAddress: string,
  issues: Array<{ severity: string; clause: string; action: string }>
): Promise<string> {

  const criticalAndWarning = issues.filter(i => i.severity !== 'GOOD')

  const prompt = `Write a formal, professional negotiation letter from a tenant to their landlord.

Tenant: ${tenantName}
Property: ${leaseAddress}

Issues to address:
${criticalAndWarning.map(i => `- ${i.clause}: ${i.action}`).join('\n')}

Requirements:
- Formal business letter format
- Reference the Model Tenancy Act 2021 where appropriate
- Polite but firm tone
- Clear numbered list of requested amendments
- Express commitment to the tenancy
- Keep it under 300 words
- Plain text only, no markdown`

  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}

// ─── GENERATE TEMPLATE ───────────────────────────────────────
export async function generateTemplate(
  type: string,
  context: Record<string, string>
): Promise<string> {

  const templates: Record<string, string> = {
    'lease_amendment': `Write a formal lease amendment request letter. Tenant: ${context.tenantName}, Address: ${context.address || 'the rental property'}, City: ${context.city}. Ask the landlord to amend unfair or unclear clauses before any deposit is paid. Include placeholders for clause numbers, requested changes, and a polite deadline for written confirmation. Plain text.`,
    'deposit_refund': `Write a formal demand letter for security deposit refund. Tenant: ${context.tenantName}, Address: ${context.address}, Amount: ${context.amount}, Move-out date: ${context.moveOutDate}. Reference MTA 2021 deposit return requirements. Firm but professional tone. Plain text.`,
    'maintenance': `Write a formal maintenance request letter. Tenant: ${context.tenantName}, Address: ${context.address}, Issue: ${context.issue}. Reference landlord's legal obligation to maintain habitable premises. Plain text.`,
    'illegal_entry': `Write a formal complaint letter about unauthorized landlord entry. Tenant: ${context.tenantName}, Address: ${context.address}, Date of entry: ${context.date}. Reference privacy rights and MTA 2021. Plain text.`,
    'rent_dispute': `Write a formal objection to a rent increase. Tenant: ${context.tenantName}, Address: ${context.address}, Current rent: ${context.currentRent}, Proposed increase: ${context.proposedRent}. Reference legal notice requirements. Plain text.`,
    'checklist': `Create a pre-signing checklist for an Indian residential tenant. Tenant: ${context.tenantName}, City: ${context.city}. Include sections for money, clauses, move-in evidence, landlord identity, utility handover, and receipts. Keep it practical, concise, and plain text.`,
  }

  const prompt = templates[type] || `Write a tenant rights letter for: ${type}. Context: ${JSON.stringify(context)}. Professional tone, plain text.`

  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}
