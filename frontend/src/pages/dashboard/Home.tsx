import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  FileText, TrendingUp, AlertTriangle, DollarSign,
  Upload, ChevronRight, Trash2, Eye, BarChart2
} from 'lucide-react'

import { useAuthStore } from '../../store/auth'
import { leasesApi } from '../../lib/api'
import { cn, formatDate, riskColor, riskLabel, scoreColor } from '../../lib/utils'
import { UploadModal } from '../../components/UploadModal'
import { RingScore } from '../../components/RingScore'
import { EmptyState } from '../../components/EmptyState'
import { RealWorldDecisionPanel } from '../../components/RealWorldDecisionPanel'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🔴 High Risk', value: 'HIGH' },
  { label: '🟡 Medium', value: 'MEDIUM' },
  { label: '🟢 Good', value: 'LOW' },
]

export function DashboardHome() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [showUpload, setShowUpload] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['leases', filter],
    queryFn: async () => {
      const params: any = {}
      if (filter !== 'all') params.risk = filter
      const res = await leasesApi.list(params)
      return res.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leasesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leases'] })
      toast.success('Lease deleted')
    },
    onError: () => toast.error('Failed to delete lease'),
  })

  const leases = data?.leases || []
  const stats = computeStats(leases)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: () => setShowUpload(true),
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    noClick: true,
  })

  return (
    <div className="animate-fade-up">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Leases Analyzed" value={leases.length} sub="↑ lifetime" subColor="text-success" icon={<FileText className="w-5 h-5 text-accent" />} />
        <StatCard label="Critical Issues" value={stats.criticalTotal} sub="Need attention" subColor="text-warning" icon={<AlertTriangle className="w-5 h-5 text-danger" />} valueColor="text-danger" />
        <StatCard label="Savings Found" value="₹18k" sub="in hidden charges" icon={<DollarSign className="w-5 h-5 text-success" />} valueColor="text-success" />
        <StatCard label="Avg. Risk Score" value={stats.avgScore ? `${stats.avgScore}/100` : '—'} sub={stats.avgScore ? (stats.avgScore >= 70 ? 'Low risk' : stats.avgScore >= 40 ? 'Moderate risk' : 'High risk') : 'Upload to start'} subColor={stats.avgScore ? (stats.avgScore >= 70 ? 'text-success' : stats.avgScore >= 40 ? 'text-warning' : 'text-danger') : 'text-ink-3'} icon={<BarChart2 className="w-5 h-5 text-ink-3" />} />
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        onClick={() => setShowUpload(true)}
        className={cn(
          'bg-white border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-5',
          isDragActive ? 'border-accent bg-success-light scale-[1.01]' : 'border-border-2 hover:border-accent hover:bg-success-light/20'
        )}
      >
        <input {...getInputProps()} />
        <div className="text-3xl mb-2">📎</div>
        <div className="font-serif text-[17px] font-medium mb-1">Drop your lease agreement here</div>
        <div className="text-sm text-ink-3">
          AI scans every clause — flags illegal terms, hidden fees &amp; rights violations<br />
          <strong className="text-accent">Results in under 60 seconds</strong>
        </div>
        <div className="flex justify-center gap-2 mt-3">
          {['PDF', 'DOC', 'DOCX', 'Max 20MB'].map(f => (
            <span key={f} className="text-[11px] font-mono bg-paper border border-border px-2 py-1 rounded text-ink-3">{f}</span>
          ))}
        </div>
      </div>

      <RealWorldDecisionPanel leases={leases} onViewLease={(leaseId) => navigate(`/dashboard/leases/${leaseId}`)} />

      {/* Lease list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-[17px] font-medium">Your Leases</h2>
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'text-[12px] px-3 py-1 rounded-md border transition-all',
                filter === f.value
                  ? 'bg-dark text-accent-3 border-dark'
                  : 'bg-white text-ink-3 border-border hover:border-border-2'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : leases.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={filter === 'all' ? 'No leases yet' : 'No leases in this category'}
          description={filter === 'all' ? 'Upload your first lease to get started' : 'Change the filter or upload a new lease'}
          action={filter === 'all' ? { label: '+ Analyze Your First Lease', onClick: () => setShowUpload(true) } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {leases.map((lease: any) => (
            <LeaseCard
              key={lease.id}
              lease={lease}
              onView={() => navigate(`/dashboard/leases/${lease.id}`)}
              onDelete={() => {
                setDeleting(lease.id)
                if (window.confirm(`Delete "${lease.name}"? This cannot be undone.`)) {
                  deleteMutation.mutate(lease.id)
                }
                setDeleting(null)
              }}
            />
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  )
}

function StatCard({ label, value, sub, subColor = 'text-ink-3', valueColor = 'text-ink', icon }: {
  label: string; value: string | number; sub: string; subColor?: string; valueColor?: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="text-[11px] text-ink-3 font-mono uppercase tracking-wider">{label}</div>
        <div className="p-1.5 bg-paper rounded-lg">{icon}</div>
      </div>
      <div className={cn('font-serif text-[26px] font-light tracking-tight', valueColor)}>{value}</div>
      <div className={cn('text-[11px] font-mono mt-1', subColor)}>{sub}</div>
    </div>
  )
}

function LeaseCard({ lease, onView, onDelete }: { lease: any; onView: () => void; onDelete: () => void }) {
  const icon = lease.riskLevel === 'HIGH' ? '🏚️' : lease.riskLevel === 'MEDIUM' ? '🏠' : '🏡'
  return (
    <div className="bg-white border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-border-2 hover:shadow-card transition-all group">
      <div className="w-10 h-10 bg-paper border border-border rounded-xl flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
        <div className="font-semibold text-sm text-ink truncate">{lease.name}</div>
        <div className="text-[11px] text-ink-3 font-mono mt-0.5 truncate">
          {lease.address || lease.city || 'No address'} · {formatDate(lease.createdAt)} · {lease.rent || '—'}/mo
        </div>
      </div>
      <div className="flex flex-col gap-1 items-end">
        {lease.criticalCount > 0 && (
          <span className="badge-red text-[10px] px-2 py-0.5 rounded font-mono">{lease.criticalCount} Critical</span>
        )}
        {lease.warningCount > 0 && (
          <span className="badge-amber text-[10px] px-2 py-0.5 rounded font-mono">{lease.warningCount} Warn</span>
        )}
        {lease.goodCount > 0 && !lease.criticalCount && !lease.warningCount && (
          <span className="badge-green text-[10px] px-2 py-0.5 rounded font-mono">{lease.goodCount} Good</span>
        )}
        {lease.status === 'PROCESSING' && (
          <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-info-light text-info border border-info-mid">Analyzing…</span>
        )}
        {lease.status === 'FAILED' && (
          <span className="badge-red text-[10px] px-2 py-0.5 rounded font-mono">Failed</span>
        )}
      </div>
      {lease.riskScore != null && (
        <RingScore score={lease.riskScore} risk={lease.riskLevel} size={48} />
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onView} className="p-1.5 hover:bg-paper rounded-lg transition-colors text-ink-3 hover:text-ink">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-1.5 hover:bg-danger-light rounded-lg transition-colors text-ink-3 hover:text-danger">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 bg-paper rounded-xl flex-shrink-0" />
      <div className="flex-1">
        <div className="h-3.5 bg-paper rounded w-2/5 mb-2" />
        <div className="h-2.5 bg-paper rounded w-3/5" />
      </div>
      <div className="w-12 h-12 bg-paper rounded-full" />
    </div>
  )
}

function computeStats(leases: any[]) {
  const analyzed = leases.filter(l => l.status === 'ANALYZED')
  return {
    criticalTotal: leases.reduce((s, l) => s + (l.criticalCount || 0), 0),
    avgScore: analyzed.length ? Math.round(analyzed.reduce((s, l) => s + l.riskScore, 0) / analyzed.length) : null,
  }
}
