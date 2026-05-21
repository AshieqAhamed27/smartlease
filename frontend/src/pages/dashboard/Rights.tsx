import { useState } from 'react'
import { ChevronDown, ExternalLink, MapPin } from 'lucide-react'
import { cn } from '../../lib/utils'

const RIGHTS = [
  {
    title: 'Right to Notice Before Entry',
    body: 'Landlords must give at least 24 hours written notice before entering your premises, except in genuine emergencies. Protected under the Model Tenancy Act 2021 §11 and most state rent control acts. Any clause allowing entry without notice is legally void.',
    law: 'MTA 2021 §11',
  },
  {
    title: 'Security Deposit Limits',
    body: 'Under the Model Tenancy Act 2021, security deposits are capped at 2 months rent for residential properties. Many landlords demand 6–12 months illegally. You can legally challenge and negotiate any deposit above this limit.',
    law: 'MTA 2021 §11(2)',
  },
  {
    title: 'Rent Increase Restrictions',
    body: 'Landlords cannot increase rent arbitrarily mid-tenancy. Most states require 30–90 days advance written notice. Any increase must align with registered rent or a pre-agreed annual schedule in the lease.',
    law: 'MTA 2021 §8',
  },
  {
    title: 'Right to Essential Services',
    body: 'Landlords cannot cut off water, electricity, or other essential services to force you to vacate or pay dues. This is a criminal offense under most state laws and grounds for immediate rent court action.',
    law: 'MTA 2021 §16',
  },
  {
    title: 'Protection from Illegal Eviction',
    body: 'You cannot be evicted without a court order regardless of lease terms or verbal agreements. Even after tenancy ends, you are entitled to due process. Self-help evictions — changing locks, removing possessions, harassment — are all illegal.',
    law: 'MTA 2021 §21',
  },
  {
    title: 'Habitable Premises Guarantee',
    body: 'Your landlord must maintain the property in a habitable condition: functioning plumbing, no structural hazards, weatherproofing. Major structural repairs always rest with the owner regardless of what the lease says.',
    law: 'MTA 2021 §13',
  },
  {
    title: 'Right to a Written Agreement',
    body: 'Under the Model Tenancy Act 2021, every tenancy must be covered by a written agreement submitted to the Rent Authority. Oral agreements are harder to enforce and leave you vulnerable. Always insist on a registered written lease.',
    law: 'MTA 2021 §4',
  },
  {
    title: 'Deposit Refund Timeline',
    body: 'Your landlord must refund the security deposit within the timeframe specified in the agreement (typically 30–45 days) after you vacate. They can only deduct documented repair costs with itemized receipts. Withholding without reason is illegal.',
    law: 'MTA 2021 §11(3)',
  },
]

const ILLEGAL_ACTIONS = [
  'Changing locks without a court order',
  'Cutting off electricity/water to force vacating',
  'Entering premises without prior notice',
  'Demanding deposit above 2 months rent',
  'Threatening or harassing tenants',
  'Evicting without a court order',
  'Refusing to give written receipts for rent',
  'Discriminating based on religion, caste or gender',
]

const HELP_RESOURCES = [
  { title: 'Rent Control Court', desc: 'Illegal rent hikes, eviction disputes', icon: '⚖️' },
  { title: 'District Consumer Forum', desc: 'Deposit fraud, service deficiency', icon: '🏛️' },
  { title: 'Police / NCW Helpline', desc: 'Harassment, threats, domestic abuse', icon: '🚔' },
  { title: 'Legal Aid Services', desc: 'Free legal help for below-income tenants', icon: '📋' },
]

const SOURCE_LINKS = [
  {
    title: 'Model Tenancy Act approval',
    href: 'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1723636',
  },
  {
    title: 'State adoption status',
    href: 'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1779681',
  },
  {
    title: 'PRS summary',
    href: 'https://prsindia.org/billtrack/the-model-tenancy-act-2021',
  },
]

export function RightsPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <div className="animate-fade-up max-w-2xl">
      {/* Hero */}
      <div className="bg-dark-2 rounded-2xl p-7 mb-6 relative overflow-hidden">
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-10 pointer-events-none">⚖️</div>
        <div className="font-serif text-2xl font-medium text-white mb-2">
          Know Your Rights as a Tenant in India
        </div>
        <div className="text-sm text-white/50 leading-relaxed max-w-md">
          The Model Tenancy Act 2021 and state rent control acts protect you. Here's what every renter must know before signing anything.
        </div>
      </div>

      <div className="bg-warning-light border border-warning-mid rounded-xl p-4 mb-6">
        <div className="font-semibold text-sm text-warning mb-1">State law reality check</div>
        <p className="text-sm text-ink-2 leading-relaxed">
          The Model Tenancy Act is a model framework circulated for states and union territories to adopt or adapt. Use these rights as a negotiation and evidence checklist, then verify the exact rule for your city before escalating a dispute.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {SOURCE_LINKS.map((source) => (
            <a
              key={source.href}
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono bg-white border border-warning-mid rounded-md px-2 py-1 text-warning hover:bg-warning-light"
            >
              {source.title}
              <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      </div>

      {/* Core Rights Accordion */}
      <div className="font-serif text-base font-medium mb-3">Core Tenant Rights</div>
      <div className="space-y-2 mb-7">
        {RIGHTS.map((r, i) => (
          <div key={i} className="bg-white border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-paper transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{i + 1}. {r.title}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-mono text-info bg-info-light border border-info-mid px-2 py-0.5 rounded hidden sm:block">
                  {r.law}
                </span>
                <ChevronDown className={cn('w-4 h-4 text-ink-3 transition-transform', openIdx === i && 'rotate-180')} />
              </div>
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4 text-sm text-ink-2 leading-relaxed border-t border-border pt-3">
                {r.body}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Illegal Actions */}
      <div className="font-serif text-base font-medium mb-3">Illegal Landlord Actions</div>
      <div className="grid grid-cols-2 gap-2 mb-7">
        {ILLEGAL_ACTIONS.map((a) => (
          <div key={a} className="bg-danger-light border border-danger-mid rounded-lg px-3 py-2.5 flex items-center gap-2">
            <span className="text-danger text-base flex-shrink-0">⛔</span>
            <span className="text-[13px] text-danger font-medium leading-snug">{a}</span>
          </div>
        ))}
      </div>

      {/* Help Resources */}
      <div className="font-serif text-base font-medium mb-3">Where to Get Help</div>
      <div className="grid grid-cols-2 gap-3">
        {HELP_RESOURCES.map((h) => (
          <div key={h.title} className="bg-white border border-border rounded-xl p-4 cursor-pointer hover:border-border-2 hover:shadow-card transition-all group">
            <div className="text-2xl mb-2">{h.icon}</div>
            <div className="font-semibold text-sm mb-1">{h.title}</div>
            <div className="text-xs text-ink-3 mb-3 leading-relaxed">{h.desc}</div>
            <div className="flex items-center gap-1 text-xs text-accent font-medium group-hover:underline">
              <MapPin className="w-3 h-3" /> Find Nearest →
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
