export interface LeaseLike {
  id?: string
  name?: string
  address?: string | null
  city?: string | null
  rent?: string | number | null
  deposit?: string | number | null
  duration?: string | null
  status?: string
  riskScore?: number | null
  riskLevel?: string | null
  criticalCount?: number
  warningCount?: number
  issues?: Array<{
    severity?: string
    clause?: string
    explanation?: string
    action?: string | null
  }>
}

export function parseMoney(value?: string | number | null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (!value) return null

  const raw = String(value).toLowerCase()
  const numeric = Number(raw.replace(/,/g, '').match(/\d+(\.\d+)?/)?.[0])
  if (!Number.isFinite(numeric)) return null

  if (raw.includes('lakh') || raw.includes('lac')) return Math.round(numeric * 100000)
  if (raw.includes('cr')) return Math.round(numeric * 10000000)
  return Math.round(numeric)
}

export function formatRupees(amount: number | null) {
  if (amount == null) return 'Unknown'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getIssueCounts(lease: LeaseLike) {
  const critical = lease.criticalCount ?? lease.issues?.filter(i => i.severity === 'CRITICAL').length ?? 0
  const warning = lease.warningCount ?? lease.issues?.filter(i => i.severity === 'WARNING').length ?? 0
  const good = lease.issues?.filter(i => i.severity === 'GOOD').length ?? 0
  return { critical, warning, good }
}

export function getMoveInCosts(lease: LeaseLike) {
  const rent = parseMoney(lease.rent)
  const deposit = parseMoney(lease.deposit)
  const firstMonthCash = rent != null && deposit != null ? rent + deposit : null
  const depositMonths = rent && deposit ? Number((deposit / rent).toFixed(1)) : null

  return { rent, deposit, firstMonthCash, depositMonths }
}

export function getDecision(lease: LeaseLike) {
  const { critical, warning } = getIssueCounts(lease)
  const score = lease.riskScore ?? 50

  if (lease.status === 'PENDING' || lease.status === 'PROCESSING') {
    return {
      label: 'Wait for analysis',
      tone: 'info' as const,
      detail: 'The document is still being analyzed. Do not pay a token amount until the report is ready.',
    }
  }

  if (lease.status === 'FAILED') {
    return {
      label: 'Retry before deciding',
      tone: 'danger' as const,
      detail: 'The analysis failed, so SmartLease cannot estimate signing risk yet.',
    }
  }

  if (critical >= 2 || score < 40) {
    return {
      label: 'Do not sign yet',
      tone: 'danger' as const,
      detail: 'Ask for written amendments first. If the landlord refuses, compare another property.',
    }
  }

  if (critical === 1 || warning >= 2 || score < 70) {
    return {
      label: 'Negotiate first',
      tone: 'warning' as const,
      detail: 'The lease may be usable, but you should close the flagged gaps before paying deposit.',
    }
  }

  return {
    label: 'Ready with checks',
    tone: 'success' as const,
    detail: 'The lease looks reasonable. Still collect proof, receipts, and handover records.',
  }
}

export function getTopActions(lease: LeaseLike, limit = 3) {
  const issues = lease.issues || []
  const issueActions = issues
    .filter(issue => issue.severity !== 'GOOD')
    .slice(0, limit)
    .map(issue => issue.action || `Ask to revise ${issue.clause || 'this clause'}`)

  if (issueActions.length) return issueActions

  return [
    'Collect signed agreement and payment receipts',
    'Photograph rooms, fixtures, meters, and existing damage',
    'Confirm deposit refund timing in writing',
  ].slice(0, limit)
}

export function getReadinessChecklist(lease: LeaseLike) {
  const { depositMonths } = getMoveInCosts(lease)
  const { critical } = getIssueCounts(lease)

  return [
    {
      label: 'Written lease signed by both parties',
      done: lease.status === 'ANALYZED',
    },
    {
      label: 'Critical clauses amended or accepted in writing',
      done: critical === 0 && lease.status === 'ANALYZED',
    },
    {
      label: 'Deposit amount and refund timeline confirmed',
      done: depositMonths != null && depositMonths <= 2,
      caution: depositMonths != null && depositMonths > 2 ? `${depositMonths} months deposit` : '',
    },
    {
      label: 'Move-in photos, meter readings, and inventory ready',
      done: false,
    },
    {
      label: 'Rent, deposit, and maintenance payment receipts planned',
      done: false,
    },
  ]
}

export function sortByUrgency(leases: LeaseLike[]) {
  return [...leases].sort((a, b) => {
    const ac = getIssueCounts(a).critical
    const bc = getIssueCounts(b).critical
    if (bc !== ac) return bc - ac
    return (a.riskScore ?? 100) - (b.riskScore ?? 100)
  })
}
