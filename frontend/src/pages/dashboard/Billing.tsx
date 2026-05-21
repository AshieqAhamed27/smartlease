import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, Loader2, ExternalLink, Zap, Building2 } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { billingApi } from '../../lib/api'
import { cn } from '../../lib/utils'

declare global {
  interface Window {
    Razorpay?: new (options: any) => { open: () => void }
  }
}

const loadRazorpayScript = () => new Promise<boolean>((resolve) => {
  if (window.Razorpay) {
    resolve(true)
    return
  }

  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve(true)
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: '/month',
    desc: 'For occasional renters',
    plan: 'FREE',
    features: ['2 lease analyses/month', 'Basic risk scoring', 'Top 5 issues flagged', 'AI chat (10 questions)', 'Web report'],
    cta: 'Current Plan',
    icon: '🏠',
  },
  {
    name: 'Pro',
    price: '₹499',
    period: '/month',
    desc: 'For active renters & movers',
    plan: 'PRO',
    featured: true,
    trial: 'Razorpay checkout',
    features: ['10 analyses/month', 'Full clause-by-clause breakdown', 'Unlimited AI chat', 'Negotiation scripts', 'Lease comparison (up to 5)', 'PDF reports + email delivery', 'Tenant rights library'],
    cta: 'Upgrade with Razorpay',
    icon: '⚡',
  },
  {
    name: 'Business',
    price: '₹2,499',
    period: '/month',
    desc: 'For agents & property managers',
    plan: 'BUSINESS',
    features: ['Unlimited analyses', 'Team accounts (5 seats)', 'White-label reports', 'API access', 'Priority support', 'Custom clause library'],
    cta: 'Get Business',
    icon: '🏢',
  },
]

export function BillingPage() {
  const { user, updateUser } = useAuthStore()
  const currentPlan = user?.plan || 'FREE'

  const { data: billing } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => { const res = await billingApi.info(); return res.data },
  })

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => { const res = await billingApi.invoices(); return res.data.invoices },
  })

  const checkoutMutation = useMutation({
    mutationFn: (plan: string) => billingApi.checkout(plan),
    onSuccess: async (res, plan) => {
      const { keyId, subscription, simulation, user: nextUser } = res.data

      if (simulation) {
        if (nextUser) updateUser(nextUser)
        toast.success('Subscription active')
        return
      }

      if (!subscription?.id || !keyId) {
        toast.error('Invalid Razorpay checkout response.')
        return
      }

      const loaded = await loadRazorpayScript()
      if (!loaded || !window.Razorpay) {
        toast.error('Razorpay checkout failed to load.')
        return
      }

      const checkout = new window.Razorpay({
        key: keyId,
        name: 'SmartLease',
        description: `${plan} subscription`,
        subscription_id: subscription.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await billingApi.verify({
              plan,
              razorpay_subscription_id: response.razorpay_subscription_id || subscription.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })

            if (verifyRes.data?.user) updateUser(verifyRes.data.user)
            toast.success('Subscription active')
          } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Payment verification failed.')
          }
        },
        modal: {
          ondismiss: () => toast('Checkout closed'),
        },
      })

      checkout.open()
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Could not start checkout. Please try again.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => billingApi.cancel(),
    onSuccess: () => toast.success('Cancellation scheduled'),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Could not cancel subscription.'),
  })

  return (
    <div className="animate-fade-up max-w-4xl">
      {/* Current plan banner */}
      {currentPlan !== 'FREE' && billing && (
        <div className="bg-success-light border border-success-mid rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="font-semibold text-success">{currentPlan} Plan — Active</div>
            <div className="text-sm text-ink-3 mt-0.5">
              {billing.analysesUsed}/{billing.analysesLimit} analyses used ·{' '}
              {billing.currentPeriodEnd && `Renews ${new Date(billing.currentPeriodEnd).toLocaleDateString('en-IN')}`}
              {billing.cancelAtPeriodEnd && ' · Cancels at period end'}
            </div>
          </div>
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending || billing.cancelAtPeriodEnd}
            className="flex items-center gap-1.5 text-sm border border-success-mid bg-white text-success px-4 py-2 rounded-lg hover:bg-success-light transition-colors"
          >
            {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            {billing.cancelAtPeriodEnd ? 'Cancellation Scheduled' : 'Cancel Renewal'}
          </button>
        </div>
      )}

      {/* Plan cards */}
      <h2 className="font-serif text-2xl font-medium mb-6">Choose your plan</h2>
      <div className="grid grid-cols-3 gap-4 mb-10">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.plan
          const isUpgrade = ['FREE','PRO','BUSINESS'].indexOf(plan.plan) > ['FREE','PRO','BUSINESS'].indexOf(currentPlan)

          return (
            <div key={plan.plan} className={cn(
              'bg-white border rounded-2xl p-6 relative',
              plan.featured ? 'border-accent shadow-card-lg' : 'border-border'
            )}>
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-mono px-3 py-1 rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <div className="text-2xl mb-3">{plan.icon}</div>
              <div className="font-serif text-lg font-medium mb-1">{plan.name}</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-serif text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-ink-3 mb-0.5">{plan.period}</span>
              </div>
              <div className="text-xs text-ink-3 mb-4">{plan.desc}</div>
              {plan.trial && (
                <div className="text-[11px] bg-success-light text-success border border-success-mid rounded-md px-2 py-1 font-mono mb-3 text-center">
                  {plan.trial}
                </div>
              )}
              <ul className="space-y-2 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent || checkoutMutation.isPending}
                onClick={() => {
                  if (plan.plan === 'FREE' || isCurrent) return
                  checkoutMutation.mutate(plan.plan)
                }}
                className={cn(
                  'w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
                  isCurrent
                    ? 'bg-paper text-ink-3 cursor-default border border-border'
                    : plan.featured
                    ? 'bg-accent hover:bg-accent-dark text-white hover:-translate-y-px'
                    : 'border border-border hover:bg-paper text-ink-2 hover:border-border-2'
                )}
              >
                {checkoutMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isCurrent ? 'Current Plan' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div>
          <h2 className="font-serif text-xl font-medium mb-4">Invoice History</h2>
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-paper">
                  <th className="text-left px-5 py-3 text-xs font-mono text-ink-3 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-ink-3 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-ink-3 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-paper/50 transition-colors">
                    <td className="px-5 py-3 text-ink-2">{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3 font-medium">{inv.currency} {inv.amount.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={cn('text-xs font-mono px-2 py-0.5 rounded border',
                        inv.status === 'paid' ? 'badge-green' : 'badge-amber')}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noreferrer"
                          className="text-xs text-accent hover:underline flex items-center gap-1 justify-end">
                          <ExternalLink className="w-3 h-3" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="mt-10">
        <h2 className="font-serif text-xl font-medium mb-4">Frequently Asked</h2>
        <div className="space-y-3">
          {[
            ['Can I cancel anytime?', 'Yes. Cancel renewal here and you keep access until the end of your billing period.'],
            ['What payment methods are accepted?', 'Razorpay supports UPI, cards, netbanking, and other enabled Indian payment methods.'],
            ['Do unused analyses roll over?', 'No — analyses reset monthly. Upgrade if you need more.'],
            ['Is my lease data private?', 'Yes. Your documents are encrypted at rest, never shared, and you can delete them anytime.'],
          ].map(([q, a]) => (
            <div key={q} className="bg-white border border-border rounded-xl p-4">
              <div className="font-medium text-sm mb-1">{q}</div>
              <div className="text-sm text-ink-3">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
