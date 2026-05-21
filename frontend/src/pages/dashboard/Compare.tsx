import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { leasesApi } from '../../lib/api'
import { RingScore } from '../../components/RingScore'
import { EmptyState } from '../../components/EmptyState'
import { cn } from '../../lib/utils'

const COMPARE_ROWS = [
  { label: 'Entry Notice', keys: ['entryNotice'] },
  { label: 'Rent Increase', keys: ['rentIncrease'] },
  { label: 'Early Exit Penalty', keys: ['exitPenalty'] },
  { label: 'Maintenance', keys: ['maintenance'] },
  { label: 'Parking', keys: ['parking'] },
]

export function ComparePage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['leases', 'all'],
    queryFn: async () => {
      const res = await leasesApi.list({ limit: 10 })
      return res.data
    },
  })

  const leases = data?.leases?.filter((l: any) => l.status === 'ANALYZED') || []

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-paper rounded"/><div className="grid grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="h-64 bg-paper rounded-2xl"/>)}</div></div>

  if (leases.length < 2) return (
    <EmptyState
      icon="⚖️"
      title="Nothing to compare yet"
      description="Upload at least 2 leases to compare them side by side"
      action={{ label: '+ Analyze a Lease', onClick: () => navigate('/dashboard') }}
    />
  )

  const best = leases.reduce((b: any, l: any) => l.riskScore > (b?.riskScore || 0) ? l : b, null)

  return (
    <div className="animate-fade-up">
      <p className="text-sm text-ink-3 mb-5">
        Comparing {leases.length} analyzed leases. Higher score = safer for you as a tenant.
      </p>

      {/* Score cards */}
      <div className={cn('grid gap-4 mb-6', leases.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {leases.map((lease: any) => (
          <div key={lease.id} className={cn(
            'bg-white border rounded-2xl overflow-hidden',
            lease.id === best?.id ? 'border-success-mid border-2' : 'border-border'
          )}>
            <div className="p-4 border-b border-border">
              {lease.id === best?.id && (
                <div className="mb-2"><span className="badge-green text-xs px-2 py-0.5 rounded-md font-mono">⭐ Best Option</span></div>
              )}
              <div className="font-semibold text-sm mb-0.5">{lease.name}</div>
              <div className="text-xs text-ink-3 font-mono mb-3">{lease.address || lease.city || 'No address'}</div>
              <div className="flex items-center justify-between">
                <RingScore score={lease.riskScore} risk={lease.riskLevel} size={56} />
                <div className="flex flex-col gap-1 items-end">
                  {lease.criticalCount > 0 && <span className="badge-red text-[10px] px-2 py-0.5 rounded font-mono">{lease.criticalCount} critical</span>}
                  {lease.warningCount > 0 && <span className="badge-amber text-[10px] px-2 py-0.5 rounded font-mono">{lease.warningCount} warnings</span>}
                  {!lease.criticalCount && !lease.warningCount && <span className="badge-green text-[10px] px-2 py-0.5 rounded font-mono">All clear ✓</span>}
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              {[['Rent', lease.rent], ['Deposit', lease.deposit], ['Duration', lease.duration], ['Area', lease.city]].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-sm">
                  <span className="text-ink-3 text-[11px] font-mono uppercase tracking-wide">{k}</span>
                  <span className="font-semibold">{v || '—'}</span>
                </div>
              ))}
              <button onClick={() => navigate(`/dashboard/leases/${lease.id}`)}
                className="w-full mt-2 border border-border hover:bg-paper text-ink-2 text-xs py-2 rounded-lg transition-colors">
                View Full Analysis →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Side-by-side clause table */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="font-serif text-base font-medium">Clause Comparison</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-paper">
                <th className="text-left px-5 py-3 text-xs font-mono text-ink-3 uppercase tracking-wider w-36">Clause</th>
                {leases.map((l: any) => (
                  <th key={l.id} className="text-center px-4 py-3 text-xs font-mono text-ink-3 uppercase tracking-wider">
                    {l.name.split(' ').slice(0, 2).join(' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['Entry Notice', leases.map((l: any) => l.issues?.find((i: any) => i.clause?.toLowerCase().includes('entry')) ? (l.issues.find((i: any) => i.clause?.toLowerCase().includes('entry')).severity === 'CRITICAL' ? '🚨 No notice' : '⚠️ Limited') : '✓ 24 hrs')],
                ['Rent Increase', leases.map((l: any) => l.issues?.find((i: any) => i.clause?.toLowerCase().includes('rent')) ? '⚠️ Review needed' : '✓ Fixed schedule')],
                ['Maintenance', leases.map((l: any) => l.issues?.find((i: any) => i.clause?.toLowerCase().includes('maintenance') && i.severity !== 'GOOD') ? '⚠️ Tenant liability' : '✓ Landlord covers')],
                ['Deposit Terms', leases.map((l: any) => l.issues?.find((i: any) => i.clause?.toLowerCase().includes('deposit') && i.severity === 'GOOD') ? '✓ Fair terms' : '⚠️ Review needed')],
              ].map(([clause, vals]) => (
                <tr key={clause as string} className="hover:bg-paper/50">
                  <td className="px-5 py-3 font-medium text-ink">{clause}</td>
                  {(vals as string[]).map((v, i) => (
                    <td key={i} className="px-4 py-3 text-center text-xs font-mono">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
