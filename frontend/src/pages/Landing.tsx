import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  Check,
  Clock3,
  FileSearch,
  FileText,
  LockKeyhole,
  MessageSquareText,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react'

const painPoints = [
  {
    icon: <BadgeIndianRupee className="w-5 h-5" />,
    title: 'Unexpected money loss',
    problem: 'Hidden maintenance fees, penalty charges, deposit deductions, and rent increase terms can quietly add thousands to the real cost.',
    outcome: 'SmartLease separates the advertised rent from the real monthly risk before users commit.',
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: 'Unfair clauses missed under pressure',
    problem: 'Most people sign when the broker, owner, or moving deadline is pushing them to decide quickly.',
    outcome: 'The product gives a plain-language risk report users can act on in minutes.',
  },
  {
    icon: <Scale className="w-5 h-5" />,
    title: 'Legal language is hard to understand',
    problem: 'Clauses about entry rights, lock-in periods, repairs, notice, eviction, and deposits are written to sound normal.',
    outcome: 'SmartLease explains what each clause means and why it matters in real life.',
  },
  {
    icon: <MessageSquareText className="w-5 h-5" />,
    title: 'Users do not know what to say',
    problem: 'Even after finding a bad clause, renters often do not know how to negotiate without sounding aggressive.',
    outcome: 'SmartLease turns each issue into a polite message or negotiation script.',
  },
]

const solvedProblems = [
  'Flags hidden fees, vague repair duties, unfair lock-ins, one-sided penalties, and risky deposit terms.',
  'Shows a clear sign, negotiate, or avoid recommendation instead of only giving a long legal explanation.',
  'Lets families, roommates, agents, and managers compare leases by risk, not just price.',
  'Keeps lease documents private while still giving shareable reports for decision-making.',
]

const steps = [
  { label: 'Upload', text: 'Add a rental agreement as a PDF or document.' },
  { label: 'Understand', text: 'See risky clauses, hidden costs, and tenant rights in plain language.' },
  { label: 'Act', text: 'Use scripts, reports, and comparison tools before paying deposit or signing.' },
]

const plans = [
  {
    name: 'Free',
    price: 'INR 0',
    period: '/month',
    desc: 'For one move or quick checks',
    features: ['2 lease analyses/month', 'Basic risk score', 'Top issues highlighted', 'Web report'],
    cta: 'Start Free',
    featured: false,
  },
  {
    name: 'Pro',
    price: 'INR 499',
    period: '/month',
    desc: 'For renters comparing homes',
    features: ['10 analyses/month', 'Full clause breakdown', 'AI chat for questions', 'Negotiation scripts', 'PDF reports'],
    cta: 'Upgrade with Razorpay',
    featured: true,
  },
  {
    name: 'Business',
    price: 'INR 2,499',
    period: '/month',
    desc: 'For agents and property teams',
    features: ['Unlimited analyses', 'Team access', 'White-label reports', 'Priority support'],
    cta: 'Contact Sales',
    featured: false,
  },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream text-ink">
      <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg font-medium">SmartLease</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#why" className="text-sm text-ink-2 transition-colors hover:text-ink">Why it matters</a>
            <a href="#solves" className="text-sm text-ink-2 transition-colors hover:text-ink">Problems solved</a>
            <a href="#pricing" className="text-sm text-ink-2 transition-colors hover:text-ink">Pricing</a>
            <Link to="/login" className="text-sm text-ink-2 transition-colors hover:text-ink">Sign in</Link>
            <Link to="/register" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-px hover:bg-accent-dark">
              Analyze Free
            </Link>
          </div>
          <button
            onClick={() => navigate('/register')}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark md:hidden"
          >
            Start
          </button>
        </div>
      </nav>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.02fr_0.98fr] md:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-info-mid bg-info-light px-3 py-1 text-xs font-medium text-info">
              <ShieldCheck className="h-3.5 w-3.5" />
              Built for renters before they sign
            </div>
            <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl lg:text-6xl">
              SmartLease
            </h1>
            <p className="mt-5 max-w-xl text-xl leading-relaxed text-ink-2">
              Know if your rental agreement is safe, costly, or unfair before you pay the deposit.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2">
              SmartLease reads the lease, explains the risk in normal language, finds hidden costs, and gives users the exact next step: sign, negotiate, or walk away.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 font-medium text-white transition-all hover:-translate-y-px hover:bg-accent-dark"
              >
                Check My Lease <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#why"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-6 py-3 font-medium text-ink-2 transition-colors hover:bg-paper"
              >
                Why Users Need It
              </a>
            </div>
            <div className="mt-7 grid max-w-xl grid-cols-1 gap-3 text-sm text-ink-2 sm:grid-cols-3">
              {['No credit card to start', 'Private document handling', 'Made for real decisions'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-card-lg">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="text-xs font-mono uppercase text-ink-3">Lease decision report</div>
                <div className="mt-1 font-serif text-xl font-medium">2BHK Indiranagar Lease</div>
              </div>
              <div className="rounded-lg border border-danger-mid bg-danger-light px-3 py-2 text-right">
                <div className="text-[11px] font-mono uppercase text-danger">Risk</div>
                <div className="font-serif text-2xl font-bold text-danger">38</div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                ['Critical', 'Owner entry without notice', 'Can violate privacy and create safety issues. Ask for 24-hour written notice except emergencies.', 'danger'],
                ['Warning', 'Maintenance fee not capped', 'Monthly cost can increase after signing. Ask for a fixed amount in writing.', 'warning'],
                ['Good', 'Deposit return timeline present', 'Refund window and itemized deductions are defined.', 'success'],
              ].map(([tag, title, text, tone]) => (
                <div
                  key={title}
                  className={[
                    'rounded-xl border p-4',
                    tone === 'danger' && 'border-danger-mid bg-danger-light',
                    tone === 'warning' && 'border-warning-mid bg-warning-light',
                    tone === 'success' && 'border-success-mid bg-success-light',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="font-medium">{title}</div>
                    <span className="rounded-md bg-white/80 px-2 py-1 text-[11px] font-mono text-ink-2">{tag}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-ink-2">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-info-mid bg-info-light p-4">
              <div className="mb-1 flex items-center gap-2 text-info">
                <MessageSquareText className="h-4 w-4" />
                <span className="font-medium">Suggested message</span>
              </div>
              <p className="text-sm leading-relaxed text-ink-2">
                Please add a clear notice period for property entry and cap monthly maintenance at the agreed amount before I proceed.
              </p>
            </div>
          </div>
        </section>

        <section id="why" className="border-y border-border bg-white py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <div className="mb-3 text-sm font-medium uppercase text-accent">Why users need this</div>
              <h2 className="font-serif text-3xl font-medium leading-tight sm:text-4xl">
                A bad lease can become a monthly problem, not a one-time mistake.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-2">
                Renters often discover the real terms after they have paid the token, moved in, or argued over deposit deductions. SmartLease helps them understand the agreement before the expensive part begins.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {painPoints.map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-cream p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                    {item.icon}
                  </div>
                  <h3 className="font-serif text-lg font-medium">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-2">{item.problem}</p>
                  <div className="mt-4 rounded-lg border border-success-mid bg-success-light px-3 py-2 text-sm leading-relaxed text-success">
                    {item.outcome}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="solves" className="bg-paper py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="mb-3 text-sm font-medium uppercase text-accent">Problems SmartLease solves</div>
              <h2 className="font-serif text-3xl font-medium leading-tight sm:text-4xl">
                It turns a confusing document into a clear decision.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-2">
                The goal is not to replace a lawyer. The goal is to help users spot obvious risk, ask better questions, and avoid signing blindly.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {solvedProblems.map((problem) => (
                <div key={problem} className="rounded-xl border border-border bg-white p-5">
                  <Check className="mb-4 h-5 w-5 text-success" />
                  <p className="text-sm leading-relaxed text-ink-2">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.label} className="border-l-4 border-accent bg-cream p-5">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-white font-mono text-sm text-accent">
                    {index + 1}
                  </div>
                  <h3 className="font-serif text-lg font-medium">{step.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {[
                { icon: <FileSearch className="h-5 w-5" />, label: 'Clause risk' },
                { icon: <Clock3 className="h-5 w-5" />, label: 'Fast review' },
                { icon: <Users className="h-5 w-5" />, label: 'Shared decisions' },
                { icon: <LockKeyhole className="h-5 w-5" />, label: 'Private files' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border bg-white p-4">
                  <div className="text-accent">{item.icon}</div>
                  <span className="text-sm font-medium text-ink-2">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-border bg-cream py-16">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="text-center">
              <div className="mb-3 text-sm font-medium uppercase text-accent">Pricing</div>
              <h2 className="font-serif text-3xl font-medium sm:text-4xl">Start with the next lease.</h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-ink-2">
                Use the free plan to test the product, then upgrade when comparing homes or reviewing leases for others.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={[
                    'relative rounded-2xl border bg-white p-6',
                    plan.featured ? 'border-accent shadow-card-lg' : 'border-border',
                  ].join(' ')}
                >
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-mono text-white">
                      Most useful
                    </div>
                  )}
                  <div className="font-serif text-lg font-medium">{plan.name}</div>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="font-serif text-3xl font-bold">{plan.price}</span>
                    <span className="mb-0.5 text-sm text-ink-3">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-3">{plan.desc}</p>
                  <ul className="mt-5 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm text-ink-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/register')}
                    className={[
                      'mt-6 w-full rounded-xl py-2.5 text-sm font-medium transition-all',
                      plan.featured
                        ? 'bg-accent text-white hover:-translate-y-px hover:bg-accent-dark'
                        : 'border border-border text-ink-2 hover:bg-paper',
                    ].join(' ')}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-ink-3 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="font-serif text-base text-ink-2">SmartLease</div>
          <div>Helping renters understand risk before money changes hands.</div>
          <div className="flex gap-5">
            {['Privacy', 'Terms', 'Support'].map((item) => (
              <a key={item} href="#" className="font-mono text-xs transition-colors hover:text-ink-2">{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
