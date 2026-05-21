import type React from 'react'
import { AlertTriangle, Banknote, Camera, CheckCircle2, ClipboardList, ShieldCheck } from 'lucide-react'
import { cn } from '../lib/utils'
import {
  LeaseLike,
  formatRupees,
  getDecision,
  getIssueCounts,
  getMoveInCosts,
  getReadinessChecklist,
  getTopActions,
  sortByUrgency,
} from '../lib/leaseInsights'

interface Props {
  lease?: LeaseLike
  leases?: LeaseLike[]
  onViewLease?: (id: string) => void
}

const toneClass = {
  danger: 'border-danger-mid bg-danger-light text-danger',
  warning: 'border-warning-mid bg-warning-light text-warning',
  success: 'border-success-mid bg-success-light text-success',
  info: 'border-info-mid bg-info-light text-info',
}

export function RealWorldDecisionPanel({ lease, leases = [], onViewLease }: Props) {
  if (lease) return <LeaseDecision lease={lease} />
  return <DecisionQueue leases={leases} onViewLease={onViewLease} />
}

function LeaseDecision({ lease }: { lease: LeaseLike }) {
  const decision = getDecision(lease)
  const { critical, warning } = getIssueCounts(lease)
  const { rent, deposit, firstMonthCash, depositMonths } = getMoveInCosts(lease)
  const actions = getTopActions(lease)
  const checklist = getReadinessChecklist(lease)

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center border', toneClass[decision.tone])}>
          {decision.tone === 'success' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>
        <div>
          <div className="font-serif text-base font-medium">{decision.label}</div>
          <p className="text-[12px] text-ink-3 leading-relaxed mt-0.5">{decision.detail}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <InsightMetric icon={<Banknote className="w-4 h-4" />} label="Move-in cash" value={formatRupees(firstMonthCash)} />
        <InsightMetric icon={<ClipboardList className="w-4 h-4" />} label="Deposit load" value={depositMonths ? `${depositMonths}x rent` : 'Unknown'} tone={depositMonths && depositMonths > 2 ? 'danger' : 'default'} />
        <InsightMetric label="Rent" value={formatRupees(rent)} />
        <InsightMetric label="Deposit" value={formatRupees(deposit)} />
      </div>

      <div className="border-t border-border pt-3 mb-3">
        <div className="text-[11px] font-mono uppercase tracking-wider text-ink-3 mb-2">Next best actions</div>
        <div className="space-y-2">
          {actions.map((action) => (
            <div key={action} className="flex gap-2 text-[12px] text-ink-2 leading-snug">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="text-[11px] font-mono uppercase tracking-wider text-ink-3 mb-2">Before paying deposit</div>
        <div className="space-y-1.5">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-start gap-2 text-[12px] text-ink-2">
              {item.done ? <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" /> : <Camera className="w-3.5 h-3.5 text-ink-4 mt-0.5 flex-shrink-0" />}
              <span>{item.label}{item.caution ? ` (${item.caution})` : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {(critical > 0 || warning > 0) && (
        <div className="mt-4 rounded-lg border border-warning-mid bg-warning-light px-3 py-2 text-[12px] text-warning leading-relaxed">
          {critical} critical and {warning} warning item{critical + warning === 1 ? '' : 's'} should be resolved before money changes hands.
        </div>
      )}
    </div>
  )
}

function DecisionQueue({ leases, onViewLease }: { leases: LeaseLike[]; onViewLease?: (id: string) => void }) {
  const active = sortByUrgency(leases).filter(lease => lease.status !== 'FAILED').slice(0, 3)
  if (!active.length) return null

  return (
    <div className="bg-white border border-border rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <div className="font-serif text-[17px] font-medium">Decision Queue</div>
          <p className="text-[12px] text-ink-3 mt-0.5">Turn reports into actions before you sign or pay deposit.</p>
        </div>
        <span className="text-[11px] font-mono bg-paper border border-border rounded px-2 py-1 text-ink-3">highest risk first</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {active.map((lease) => {
          const decision = getDecision(lease)
          const { firstMonthCash, depositMonths } = getMoveInCosts(lease)
          return (
            <button
              key={lease.id || lease.name}
              onClick={() => lease.id && onViewLease?.(lease.id)}
              className="text-left border border-border rounded-xl p-3 hover:border-accent hover:bg-success-light/20 transition-all"
            >
              <div className="font-semibold text-[13px] truncate">{lease.name || 'Untitled lease'}</div>
              <div className={cn('w-fit mt-2 text-[10px] font-mono rounded border px-2 py-0.5', toneClass[decision.tone])}>
                {decision.label}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <div className="text-ink-4 font-mono uppercase">Cash</div>
                  <div className="font-semibold text-ink">{formatRupees(firstMonthCash)}</div>
                </div>
                <div>
                  <div className="text-ink-4 font-mono uppercase">Deposit</div>
                  <div className="font-semibold text-ink">{depositMonths ? `${depositMonths}x` : 'Unknown'}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function InsightMetric({ icon, label, value, tone = 'default' }: {
  icon?: React.ReactNode
  label: string
  value: string
  tone?: 'default' | 'danger'
}) {
  return (
    <div className={cn('rounded-lg border px-3 py-2', tone === 'danger' ? 'border-danger-mid bg-danger-light' : 'border-border bg-paper')}>
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-ink-3">
        {icon}
        {label}
      </div>
      <div className={cn('mt-1 text-[13px] font-semibold', tone === 'danger' && 'text-danger')}>{value}</div>
    </div>
  )
}
