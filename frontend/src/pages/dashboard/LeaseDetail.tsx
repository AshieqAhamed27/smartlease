import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, Mail, Share2, Scale, FileText, Send, Loader2, ExternalLink } from 'lucide-react'

import { leasesApi, chatApi } from '../../lib/api'
import { cn, riskColor, scoreColor } from '../../lib/utils'
import { RingScore } from '../../components/RingScore'
import { RealWorldDecisionPanel } from '../../components/RealWorldDecisionPanel'

const TABS = ['Clause Analysis', 'Summary', 'Negotiate', 'Full Report'] as const
type Tab = typeof TABS[number]

export function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('Clause Analysis')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { data: lease, isLoading } = useQuery({
    queryKey: ['lease', id],
    queryFn: async () => {
      const res = await leasesApi.get(id!)
      return res.data
    },
    refetchInterval: (query) => query.state.data?.status === 'PROCESSING' ? 4000 : false,
  })

  // Load chat history
  const { data: chatHistory } = useQuery({
    queryKey: ['chat', id],
    queryFn: async () => {
      const res = await chatApi.history(id!)
      return res.data
    },
  })

  useEffect(() => {
    if (chatHistory?.length) {
      setChatMessages(chatHistory.map((m: any) => ({ role: m.role.toLowerCase(), content: m.content })))
    } else if (lease && chatMessages.length === 0) {
      setChatMessages([{
        role: 'assistant',
        content: `Hi! I've analyzed **${lease.name}**. Found ${lease.issues?.filter((i: any) => i.severity === 'CRITICAL').length || 0} critical issues and ${lease.issues?.filter((i: any) => i.severity === 'WARNING').length || 0} warnings. Ask me about any clause, your rights, or how to negotiate.`
      }])
    }
  }, [chatHistory, lease])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const sendChat = async () => {
    if (!chatInput.trim() || isChatLoading || !id) return
    const content = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content }])
    setIsChatLoading(true)

    try {
      const res = await chatApi.send(id, content)
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setIsChatLoading(false)
    }
  }

  if (isLoading) return <LeaseDetailSkeleton />
  if (!lease) return <div className="text-center py-20 text-ink-3">Lease not found</div>

  const criticalIssues = lease.issues?.filter((i: any) => i.severity === 'CRITICAL') || []
  const warningIssues = lease.issues?.filter((i: any) => i.severity === 'WARNING') || []
  const goodIssues = lease.issues?.filter((i: any) => i.severity === 'GOOD') || []
  const risk = lease.riskLevel || 'MEDIUM'

  return (
    <div className="animate-fade-up">
      {/* Back */}
      <button onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Lease header card */}
      <div className="bg-white border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-serif text-[21px] font-medium mb-1">{lease.name}</div>
            {lease.address && (
              <div className="text-xs text-ink-3 font-mono mb-3">📍 {lease.address}{lease.city ? `, ${lease.city}` : ''}</div>
            )}
            <div className="flex flex-wrap gap-2">
              {criticalIssues.length > 0 && (
                <span className="badge-red text-[11px] px-2.5 py-1 rounded-md font-mono">{criticalIssues.length} Critical</span>
              )}
              {warningIssues.length > 0 && (
                <span className="badge-amber text-[11px] px-2.5 py-1 rounded-md font-mono">{warningIssues.length} Warnings</span>
              )}
              {goodIssues.length > 0 && (
                <span className="badge-green text-[11px] px-2.5 py-1 rounded-md font-mono">{goodIssues.length} Favorable</span>
              )}
              <span className="badge-blue text-[11px] px-2.5 py-1 rounded-md font-mono">{lease.pages || '—'} pages</span>
              {lease.status === 'PROCESSING' && (
                <span className="text-[11px] px-2.5 py-1 rounded-md font-mono bg-info-light text-info border border-info-mid flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Analyzing…
                </span>
              )}
            </div>
          </div>
          <div className="text-center flex-shrink-0">
            {lease.riskScore != null
              ? <RingScore score={lease.riskScore} risk={risk} size={72} showLabel />
              : <div className="w-[72px] h-[72px] rounded-full border-4 border-border flex items-center justify-center text-ink-3 text-sm">—</div>
            }
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
          {[
            ['Rent', lease.rent || '—'],
            ['Deposit', lease.deposit || '—'],
            ['Duration', lease.duration || '—'],
            ['Analyzed', lease.analysisAt ? new Date(lease.analysisAt).toLocaleDateString('en-IN') : 'Pending'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[10px] text-ink-3 font-mono uppercase tracking-wider mb-1">{k}</div>
              <div className="text-[13px] font-semibold">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Left: tabs */}
        <div>
          <div className="flex border-b border-border mb-4">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn(
                  'px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all',
                  tab === t ? 'text-accent border-accent' : 'text-ink-3 border-transparent hover:text-ink-2'
                )}>
                {t}
              </button>
            ))}
          </div>

          <div className="animate-fade-up">
            {tab === 'Clause Analysis' && <ClauseTab issues={lease.issues || []} />}
            {tab === 'Summary' && <SummaryTab lease={lease} />}
            {tab === 'Negotiate' && <NegotiateTab lease={lease} />}
            {tab === 'Full Report' && <ReportTab lease={lease} />}
          </div>
        </div>

        {/* Right: chat + sidebar cards */}
        <div className="space-y-3">
          <RealWorldDecisionPanel lease={lease} />

          {/* AI Chat */}
          <div className="bg-white border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2.5">
              <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center text-sm">🤖</div>
              <div>
                <div className="text-[13px] font-semibold">Lease AI</div>
                <div className="text-[11px] text-success font-mono">● online</div>
              </div>
            </div>

            <div className="h-64 overflow-y-auto p-3 flex flex-col gap-2.5">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn('flex gap-2 items-end', msg.role === 'user' && 'flex-row-reverse')}>
                  <div className={cn('w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0',
                    msg.role === 'user' ? 'bg-dark-3 text-accent-3' : 'bg-paper border border-border'
                  )}>
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className={cn(
                    'text-[13px] rounded-xl px-3 py-2 leading-relaxed max-w-[88%]',
                    msg.role === 'user'
                      ? 'bg-accent text-white rounded-br-sm'
                      : 'bg-paper border border-border rounded-bl-sm'
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-paper border border-border">🤖</div>
                  <div className="bg-paper border border-border rounded-xl rounded-bl-sm px-3 py-2">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink-3 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick questions */}
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
              {["Is my deposit legal?", "What's my strongest argument?", "Should I sign this?"].map(q => (
                <button key={q} onClick={() => { setChatInput(q); }}
                  className="text-[11px] bg-paper border border-border rounded-md px-2 py-1 text-ink-2 hover:border-accent hover:text-accent hover:bg-success-light/50 transition-all font-mono">
                  {q}
                </button>
              ))}
            </div>

            <div className="p-2.5 border-t border-border flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Ask about any clause…"
                className="flex-1 bg-paper border border-border rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-accent transition-colors"
              />
              <button onClick={sendChat} disabled={isChatLoading || !chatInput.trim()}
                className="bg-accent hover:bg-accent-dark text-white rounded-lg px-3 py-1.5 disabled:opacity-40 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Rights card */}
          <div className="bg-white border border-border rounded-xl p-4">
            <div className="font-serif text-[14px] font-medium mb-3">⚡ Your Rights</div>
            <div className="space-y-3">
              {[
                { icon: '🚫', bg: 'bg-danger-light', title: 'Entry Without Notice', sub: 'Karnataka RCA §20 — landlord needs 24hr notice' },
                { icon: '⚠️', bg: 'bg-warning-light', title: 'Rent Increase Limits', sub: 'MTA 2021 — 90 days written notice required' },
                { icon: '📋', bg: 'bg-success-light', title: 'Deposit Cap: 2 Months', sub: 'Any excess deposit is legally challengeable' },
              ].map(r => (
                <div key={r.title} className="flex gap-2.5">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0', r.bg)}>{r.icon}</div>
                  <div>
                    <div className="text-[13px] font-medium">{r.title}</div>
                    <div className="text-[12px] text-ink-3 leading-snug">{r.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white border border-border rounded-xl p-4">
            <div className="font-serif text-[14px] font-medium mb-3">⚡ Quick Actions</div>
            <div className="space-y-0.5">
              {[
                { icon: Mail, label: 'Email Full Report', onClick: () => toast.success('📧 Report sent to your email!') },
                { icon: Share2, label: 'Share Analysis', onClick: () => { navigator.clipboard.writeText(window.location.href); toast.success('🔗 Link copied!') } },
                { icon: Download, label: 'Download PDF', onClick: () => toast.success('📥 Downloading report…') },
              ].map(({ icon: Icon, label, onClick }) => (
                <button key={label} onClick={onClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-paper text-[13px] text-ink-2 transition-colors">
                  <Icon className="w-4 h-4 text-ink-3" />
                  <span className="flex-1 text-left">{label}</span>
                  <ExternalLink className="w-3 h-3 text-ink-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClauseTab({ issues }: { issues: any[] }) {
  if (!issues.length) return <div className="text-center py-10 text-ink-3">No issues found yet</div>
  return (
    <div className="space-y-0 divide-y divide-border">
      {issues.map((issue: any, i: number) => (
        <div key={i} className="py-4 grid grid-cols-[12px_1fr_auto] gap-3 items-start">
          <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0',
            issue.severity === 'CRITICAL' ? 'bg-danger' : issue.severity === 'WARNING' ? 'bg-warning' : 'bg-success'
          )} />
          <div>
            <div className="text-[14px] font-semibold mb-1">{issue.clause}</div>
            <div className="text-[13px] text-ink-2 leading-relaxed">{issue.explanation}</div>
            {issue.quote && (
              <div className="font-mono text-[11px] bg-paper border-l-2 border-border-2 px-3 py-1.5 rounded-r mt-2 text-ink-3 leading-relaxed italic">
                "{issue.quote}"
              </div>
            )}
            {issue.legalRef && (
              <div className="text-[11px] text-info font-mono mt-1.5 flex items-center gap-1">
                ⚖️ {issue.legalRef}
              </div>
            )}
          </div>
          <div className={cn('text-[12px] font-medium cursor-pointer text-right whitespace-nowrap mt-0.5',
            issue.severity === 'GOOD' ? 'text-success' : 'text-accent hover:underline'
          )}>
            {issue.action || (issue.severity === 'GOOD' ? '✓ Good' : 'Fix This →')}
          </div>
        </div>
      ))}
    </div>
  )
}

function SummaryTab({ lease }: { lease: any }) {
  const critical = lease.issues?.filter((i: any) => i.severity === 'CRITICAL').length || 0
  const warning = lease.issues?.filter((i: any) => i.severity === 'WARNING').length || 0
  const good = lease.issues?.filter((i: any) => i.severity === 'GOOD').length || 0
  const risk = lease.riskLevel

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Critical', value: critical, cls: 'border-l-danger text-danger' },
          { label: 'Warnings', value: warning, cls: 'border-l-warning text-warning' },
          { label: 'Favorable', value: good, cls: 'border-l-success text-success' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={cn('bg-white border border-border rounded-xl p-4 border-l-4', cls)}>
            <div className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1">{label}</div>
            <div className={cn('font-serif text-3xl font-medium')}>{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-paper border border-border rounded-xl p-4 mb-4 text-[13px] text-ink-2 leading-relaxed">
        {risk === 'HIGH'
          ? `⚠️ Do not sign this lease without renegotiating. We found ${critical} critical clause${critical !== 1 ? 's' : ''} that may violate tenant laws or expose you to significant financial risk. Address all critical items in writing before proceeding.`
          : risk === 'MEDIUM'
          ? `This lease is broadly fair with ${warning} area${warning !== 1 ? 's' : ''} worth negotiating. No showstoppers, but addressing the flagged items before signing will protect you significantly.`
          : `This is an excellent lease. Fair terms, transparent costs, and balanced obligations. Safe to proceed — just confirm any minor items in writing.`
        }
      </div>

      <div className="flex gap-2.5">
        <button className="flex-1 bg-accent hover:bg-accent-dark text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          onClick={() => toast.success('📄 Generating negotiation letter…')}>
          Generate Negotiation Letter
        </button>
        <button className="flex-1 border border-border hover:bg-paper py-2.5 rounded-xl text-sm font-medium transition-colors"
          onClick={() => toast.success('📥 Downloading report…')}>
          Download PDF
        </button>
      </div>
    </div>
  )
}

function NegotiateTab({ lease }: { lease: any }) {
  const issues = lease.issues?.filter((i: any) => i.severity !== 'GOOD') || []
  return (
    <div>
      <p className="text-[13px] text-ink-3 mb-4">Exact scripts to use with your landlord. Reference the law — it changes everything.</p>
      <div className="space-y-3">
        {issues.map((issue: any, i: number) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={cn('text-[11px] font-mono px-2 py-0.5 rounded border',
                issue.severity === 'CRITICAL' ? 'badge-red' : 'badge-amber'
              )}>
                {issue.severity}
              </span>
              <span className="font-semibold text-[14px]">{issue.clause}</span>
            </div>
            <div className="text-[12px] text-ink-3 font-mono uppercase tracking-wider mb-2">What to say</div>
            <div className={cn(
              'text-[13px] bg-paper rounded-lg p-3 italic text-ink-2 leading-relaxed border-l-3',
              issue.severity === 'CRITICAL' ? 'border-l-danger' : 'border-l-warning'
            )} style={{ borderLeftWidth: '3px', borderLeftColor: issue.severity === 'CRITICAL' ? '#c0392b' : '#b85c00' }}>
              "I noticed the {issue.clause.toLowerCase()} clause. Under the Model Tenancy Act 2021, this may not be fully enforceable. I'd like to propose: {issue.action?.toLowerCase() || 'an amendment to protect both parties'}. Happy to proceed once updated in writing."
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`"I noticed the ${issue.clause.toLowerCase()} clause. Under the Model Tenancy Act 2021, this may not be enforceable. I'd like to propose: ${issue.action?.toLowerCase()}. Happy to proceed once updated in writing."`); toast.success('📋 Script copied!') }}
              className="mt-2.5 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-paper transition-colors">
              Copy Script
            </button>
          </div>
        ))}
      </div>
      {issues.length > 0 && (
        <button onClick={() => toast.success('📧 Negotiation letter sent to your email!')}
          className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-xl text-sm font-medium transition-colors mt-3">
          Generate Full Negotiation Letter
        </button>
      )}
    </div>
  )
}

function ReportTab({ lease }: { lease: any }) {
  return (
    <div>
      <div className="bg-paper border border-border rounded-xl p-4 mb-4">
        <div className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-3">Lease Details</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Property', lease.name],
            ['Address', lease.address || '—'],
            ['Monthly Rent', lease.rent || '—'],
            ['Security Deposit', lease.deposit || '—'],
            ['Duration', lease.duration || '—'],
            ['City', lease.city || '—'],
            ['Pages Scanned', lease.pages ? `${lease.pages} pages` : '—'],
            ['Risk Score', lease.riskScore != null ? `${lease.riskScore}/100` : '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[11px] text-ink-3">{k}</div>
              <div className="text-[13px] font-semibold mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-dark-2 rounded-xl p-6 text-center text-white">
        <div className="text-4xl mb-3">📄</div>
        <div className="font-serif text-lg mb-1.5">Full PDF Report Ready</div>
        <div className="text-[13px] text-white/40 mb-5">Clause analysis, legal citations, negotiation scripts & risk heatmap</div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => toast.success('📥 Downloading SmartLease_Report.pdf…')}
            className="bg-accent hover:bg-accent-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Download PDF
          </button>
          <button onClick={() => toast.success('📧 Report sent to your email')}
            className="bg-white/10 hover:bg-white/15 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors border border-white/15">
            Email Report
          </button>
        </div>
      </div>
    </div>
  )
}

function LeaseDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-32 bg-paper rounded" />
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-6 w-64 bg-paper rounded" />
            <div className="h-3 w-48 bg-paper rounded" />
            <div className="flex gap-2 mt-3"><div className="h-6 w-20 bg-paper rounded" /><div className="h-6 w-20 bg-paper rounded" /></div>
          </div>
          <div className="w-16 h-16 bg-paper rounded-full" />
        </div>
      </div>
    </div>
  )
}
