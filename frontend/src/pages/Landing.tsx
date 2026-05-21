// ── Landing Page ──────────────────────────────────────────────
import { Link, useNavigate } from 'react-router-dom'
import { Check, ArrowRight, Shield, Zap, FileSearch, Scale, MessageSquare, FileDown } from 'lucide-react'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-border px-16 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-base">🏠</div>
          <span className="font-serif text-lg font-medium">SmartLease</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm text-ink-2 hover:text-ink transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-ink-2 hover:text-ink transition-colors">Pricing</a>
          <Link to="/login" className="text-sm text-ink-2 hover:text-ink transition-colors">Sign in</Link>
          <Link to="/register" className="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-all hover:-translate-y-px">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 py-24 grid grid-cols-2 gap-16 items-center">
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-5 h-px bg-accent-light" />
            <span className="text-xs font-mono uppercase tracking-widest text-accent-light">AI-Powered Lease Intelligence</span>
          </div>
          <h1 className="font-serif text-5xl font-medium leading-[1.1] tracking-tight mb-5">
            Your lease has <em className="text-accent-light not-italic">traps.</em><br />
            We find them first.
          </h1>
          <p className="text-base text-ink-2 leading-relaxed mb-8 max-w-md">
            Upload any rental agreement. SmartLease scans every clause with AI — flagging illegal terms, hidden charges, and unfair conditions before you sign a single page.
          </p>
          <div className="flex gap-3 mb-6">
            <button onClick={() => navigate('/register')}
              className="bg-accent hover:bg-accent-dark text-white font-medium px-6 py-3 rounded-xl transition-all hover:-translate-y-px flex items-center gap-2">
              Analyze My Lease Free <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/register')}
              className="border border-border hover:bg-paper text-ink-2 font-medium px-6 py-3 rounded-xl transition-colors">
              See Demo
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            {['No credit card needed', 'Results in 60 seconds', '100% private'].map(t => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-ink-3 font-mono">
                <Check className="w-3.5 h-3.5 text-accent-light" /> {t}
              </div>
            ))}
          </div>
        </div>

        {/* Demo card */}
        <div className="bg-white border border-border rounded-2xl p-6 shadow-card-lg relative">
          <div className="absolute -top-3 left-4 bg-accent text-white text-xs font-mono px-3 py-1 rounded-full">🔍 Live Analysis</div>
          {[
            { cls: 'bg-danger-light border-l-danger', icon: '🚨', title: 'Illegal Entry Clause Detected', desc: 'Landlord can enter without notice — void under Karnataka RCA §20 and MTA 2021' },
            { cls: 'bg-warning-light border-l-warning', icon: '⚠️', title: 'Hidden ₹1,500/mo Maintenance Fee', desc: 'Not in listing — ₹18,000 extra per year you\'d never see coming' },
            { cls: 'bg-success-light border-l-success', icon: '✅', title: 'Deposit Terms: Favorable', desc: 'Refund within 45 days with itemized deductions — above average' },
          ].map(item => (
            <div key={item.title} className={`${item.cls} border-l-4 rounded-lg px-4 py-3 mb-3 flex gap-3`}>
              <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <div className="font-semibold text-sm mb-0.5">{item.title}</div>
                <div className="text-xs text-ink-2 leading-snug">{item.desc}</div>
              </div>
            </div>
          ))}
          <div className="text-center pt-3 border-t border-border mt-1">
            <div className="text-xs text-ink-3 font-mono mb-1">Overall risk score</div>
            <div className="font-serif text-4xl font-bold text-danger">38 / 100</div>
            <div className="text-xs text-danger mt-1">Do NOT sign without renegotiating</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-paper border-y border-border py-20">
        <div className="max-w-5xl mx-auto px-8">
          <h2 className="font-serif text-4xl text-center mb-3 font-medium">Everything a tenant needs</h2>
          <p className="text-center text-ink-3 mb-12">From clause detection to negotiation scripts — end to end</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <FileSearch className="w-6 h-6 text-accent" />, name: 'Deep Clause Scanning', desc: 'AI reads every sentence, cross-referencing local tenancy laws to spot illegal, unfair, or exploitative clauses.' },
              { icon: <Zap className="w-6 h-6 text-accent" />, name: 'Hidden Fee Detection', desc: 'Identifies buried maintenance charges, society fees, utility pass-throughs, and penalty clauses that inflate your cost.' },
              { icon: <Shield className="w-6 h-6 text-accent" />, name: 'Tenant Rights Library', desc: 'Know your rights in your state. Every flagged clause mapped to specific sections of local tenancy law.' },
              { icon: <MessageSquare className="w-6 h-6 text-accent" />, name: 'AI Negotiation Coach', desc: 'Exact wording to use when negotiating with your landlord — polite, firm, and legally grounded.' },
              { icon: <Scale className="w-6 h-6 text-accent" />, name: 'Lease Comparison', desc: 'Compare multiple properties side by side across rent, deposit, risk score, and 20+ factors.' },
              { icon: <FileDown className="w-6 h-6 text-accent" />, name: 'Shareable PDF Reports', desc: 'Email yourself a full analysis report. Share with family, roommates, or your lawyer before deciding.' },
            ].map(f => (
              <div key={f.name} className="bg-white border border-border rounded-xl p-5 hover:border-border-2 hover:shadow-card hover:-translate-y-0.5 transition-all">
                <div className="p-2 bg-success-light rounded-lg w-fit mb-3">{f.icon}</div>
                <div className="font-serif text-base font-medium mb-2">{f.name}</div>
                <div className="text-sm text-ink-2 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 max-w-4xl mx-auto px-8">
        <h2 className="font-serif text-4xl text-center mb-3 font-medium">Simple, honest pricing</h2>
        <p className="text-center text-ink-3 mb-12">Start free. Upgrade when you need more.</p>
        <div className="grid grid-cols-3 gap-5">
          {[
            { name: 'Free', price: '₹0', period: '/month', desc: 'For occasional renters',
              features: ['2 analyses/month', 'Basic risk scoring', 'Top 5 issues', 'AI chat (10 questions)', 'Web report'],
              cta: 'Start Free', featured: false },
            { name: 'Pro', price: '₹499', period: '/month', desc: 'For active renters', trial: 'Razorpay checkout',
              features: ['10 analyses/month', 'Full clause breakdown', 'Unlimited AI chat', 'Negotiation scripts', 'PDF reports + email', 'Tenant rights library'],
              cta: 'Upgrade with Razorpay', featured: true },
            { name: 'Business', price: '₹2,499', period: '/month', desc: 'For agents & managers',
              features: ['Unlimited analyses', 'Team accounts (5 seats)', 'White-label reports', 'API access', 'Priority support'],
              cta: 'Contact Sales', featured: false },
          ].map(plan => (
            <div key={plan.name} className={`bg-white rounded-2xl p-6 border relative ${plan.featured ? 'border-accent shadow-card-lg' : 'border-border'}`}>
              {plan.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-mono px-3 py-1 rounded-full whitespace-nowrap">Most Popular</div>}
              <div className="font-serif text-lg font-medium mb-1">{plan.name}</div>
              <div className="flex items-end gap-1 mb-1"><span className="font-serif text-3xl font-bold">{plan.price}</span><span className="text-sm text-ink-3 mb-0.5">{plan.period}</span></div>
              <div className="text-xs text-ink-3 mb-3">{plan.desc}</div>
              {plan.trial && <div className="text-[11px] bg-success-light text-success border border-success-mid rounded px-2 py-1 font-mono mb-3 text-center">{plan.trial}</div>}
              <ul className="space-y-2 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex gap-2 text-sm text-ink-2"><Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <button onClick={() => navigate('/register')}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${plan.featured ? 'bg-accent hover:bg-accent-dark text-white' : 'border border-border hover:bg-paper text-ink-2'}`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white px-16 py-8 flex justify-between items-center">
        <div className="font-serif text-base text-ink-2">SmartLease © 2025</div>
        <div className="text-sm text-ink-3">Protecting renters across India, one clause at a time.</div>
        <div className="flex gap-5">
          {['Privacy', 'Terms', 'Support', 'Blog'].map(l => (
            <a key={l} href="#" className="text-xs text-ink-3 font-mono hover:text-ink-2 transition-colors">{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
