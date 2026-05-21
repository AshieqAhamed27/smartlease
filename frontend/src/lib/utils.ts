import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

export function riskColor(risk: string) {
  if (risk === 'HIGH') return '#c0392b'
  if (risk === 'MEDIUM') return '#b85c00'
  return '#1a6b3a'
}

export function scoreColor(score: number) {
  if (score < 40) return '#c0392b'
  if (score < 70) return '#b85c00'
  return '#1a6b3a'
}

export function riskLabel(risk: string) {
  if (risk === 'HIGH') return 'High Risk'
  if (risk === 'MEDIUM') return 'Medium Risk'
  return 'Low Risk'
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
