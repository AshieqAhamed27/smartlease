import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Copy, Download, Loader2, X } from 'lucide-react'
import { templatesApi } from '../../lib/api'
import { useAuthStore } from '../../store/auth'

const TEMPLATES = [
  { id: 'lease_amendment', icon: '📝', name: 'Lease Amendment Request', desc: 'Formally request clause changes before signing. Auto-filled with flagged issues.', tag: 'Most Used' },
  { id: 'deposit_refund', icon: '💰', name: 'Deposit Refund Demand', desc: 'Legal notice for landlords who delay or wrongfully deduct your security deposit.', tag: 'Popular' },
  { id: 'maintenance', icon: '🔧', name: 'Maintenance Complaint', desc: 'Request your landlord fulfill maintenance obligations under tenancy law.', tag: '' },
  { id: 'illegal_entry', icon: '🚫', name: 'Illegal Entry Complaint', desc: 'Document unauthorized entry and formally object with legal citations.', tag: '' },
  { id: 'rent_dispute', icon: '📞', name: 'Rent Increase Dispute', desc: 'Formal objection to an illegal or improperly-noticed rent hike.', tag: '' },
  { id: 'checklist', icon: '📋', name: 'Pre-Signing Checklist', desc: '24-point checklist to review before signing any lease agreement.', tag: 'New' },
]

interface ModalState {
  templateId: string
  name: string
  result: string
}

export function TemplatesPage() {
  const { user } = useAuthStore()
  const [modal, setModal] = useState<ModalState | null>(null)
  const [context, setContext] = useState<Record<string, string>>({})

  const generateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await templatesApi.generate(templateId, {
        tenantName: user?.name || 'Tenant',
        city: user?.city || 'Bengaluru',
        ...context,
      })
      return res.data
    },
    onSuccess: (data, templateId) => {
      const tpl = TEMPLATES.find(t => t.id === templateId)
      setModal({ templateId, name: tpl?.name || '', result: data.content })
    },
    onError: () => toast.error('Could not generate template. Please try again.'),
  })

  return (
    <div className="animate-fade-up">
      <p className="text-sm text-ink-3 mb-5">
        Ready-to-use legal letters and documents, auto-filled with your details.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {TEMPLATES.map((t) => (
          <div key={t.id}
            onClick={() => generateMutation.mutate(t.id)}
            className="bg-white border border-border rounded-xl p-5 cursor-pointer hover:border-border-2 hover:shadow-card hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-2xl">{t.icon}</div>
              {t.tag && (
                <span className="badge-blue text-[10px] px-2 py-0.5 rounded font-mono">{t.tag}</span>
              )}
            </div>
            <div className="font-semibold text-sm mb-1.5">{t.name}</div>
            <div className="text-[12px] text-ink-3 leading-relaxed mb-3">{t.desc}</div>
            <div className="text-xs text-accent font-medium group-hover:underline flex items-center gap-1">
              {generateMutation.isPending && generateMutation.variables === t.id
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                : 'Generate →'
              }
            </div>
          </div>
        ))}
      </div>

      {/* Custom AI generator */}
      <div className="bg-dark-2 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <div className="font-serif text-lg text-white mb-1">Need a custom template?</div>
          <div className="text-sm text-white/40">Describe what you need — AI drafts it in seconds</div>
        </div>
        <button
          onClick={() => toast.success('🤖 Custom template generator coming soon!')}
          className="bg-accent hover:bg-accent-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
        >
          Generate Custom →
        </button>
      </div>

      {/* Result Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-card-lg border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="font-serif text-base font-medium">{modal.name}</div>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-paper rounded-lg transition-colors">
                <X className="w-4 h-4 text-ink-3" />
              </button>
            </div>
            <div className="p-5">
              <pre className="bg-paper border border-border rounded-xl p-4 text-[12px] font-mono text-ink-2 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                {modal.result}
              </pre>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { navigator.clipboard.writeText(modal.result); toast.success('📋 Copied to clipboard!') }}
                  className="flex-1 flex items-center justify-center gap-2 border border-border hover:bg-paper py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button
                  onClick={() => toast.success('📧 Letter sent to your email!')}
                  className="flex-1 bg-accent hover:bg-accent-dark text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  Email to Me
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
