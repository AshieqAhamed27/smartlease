import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { leasesApi } from '../lib/api'
import { cn } from '../lib/utils'

interface Props { onClose: () => void }

type Step = 'upload' | 'details' | 'analyzing' | 'done' | 'error'

const ANALYSIS_STEPS = [
  'Reading document structure',
  'Extracting all clauses',
  'Cross-referencing tenancy laws',
  'Calculating risk scores',
  'Generating recommendations',
]

export function UploadModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [leaseId, setLeaseId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const qc = useQueryClient()
  const navigate = useNavigate()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0]
    if (f) {
      setFile(f)
      setName(f.name.replace(/\.[^/.]+$/, ''))
      setStep('details')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0]
      toast.error(err?.code === 'file-too-large' ? 'File must be under 20MB' : 'Only PDF and Word files are allowed')
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', name || file.name)
      if (address) fd.append('address', address)
      if (city) fd.append('city', city)
      const res = await leasesApi.upload(fd)
      return res.data
    },
    onSuccess: async (data) => {
      setLeaseId(data.lease.id)
      setStep('analyzing')
      // Animate steps, then poll for completion
      let s = 0
      const interval = setInterval(() => {
        s++
        setCurrentStep(s)
        if (s >= ANALYSIS_STEPS.length) clearInterval(interval)
      }, 900)

      // Poll for status
      const poll = setInterval(async () => {
        try {
          const res = await leasesApi.status(data.lease.id)
          if (res.data.status === 'ANALYZED') {
            clearInterval(poll)
            clearInterval(interval)
            setCurrentStep(ANALYSIS_STEPS.length)
            setStep('done')
            qc.invalidateQueries({ queryKey: ['leases'] })
          } else if (res.data.status === 'FAILED') {
            clearInterval(poll)
            clearInterval(interval)
            setErrorMsg('Analysis failed. Your credit has been refunded. Please try again.')
            setStep('error')
          }
        } catch {}
      }, 3000)

      // Timeout after 3 minutes
      setTimeout(() => {
        clearInterval(poll)
        clearInterval(interval)
        if (step === 'analyzing') {
          setStep('done') // let them view even if analysis is slow
        }
      }, 180000)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Upload failed. Please try again.'
      if (err?.response?.data?.code === 'ANALYSIS_LIMIT_REACHED') {
        setErrorMsg('You have used all analyses for this month. Please upgrade your plan.')
      } else {
        setErrorMsg(msg)
      }
      setStep('error')
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-card-lg border border-border relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-paper text-ink-3 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step indicators */}
        <div className="flex border-b border-border overflow-hidden rounded-t-3xl">
          {['Upload', 'Details', 'Analyzing', 'Done'].map((s, i) => {
            const idx = ['upload','details','analyzing','done'].indexOf(step)
            const isDone = i < idx
            const isActive = i === idx
            return (
              <div key={s} className={cn(
                'flex-1 py-2.5 text-center text-[11px] font-mono border-r border-border last:border-0',
                isDone && 'text-success bg-success-light',
                isActive && 'text-accent font-semibold bg-success-light/50',
                !isDone && !isActive && 'text-ink-4 bg-paper'
              )}>
                {isDone ? '✓ ' : ''}{s}
              </div>
            )
          })}
        </div>

        <div className="p-7">
          {/* STEP: upload */}
          {step === 'upload' && (
            <div>
              <h2 className="font-serif text-xl font-medium mb-1">Analyze a Lease</h2>
              <p className="text-sm text-ink-3 mb-5">Upload your rental agreement for instant AI analysis</p>
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                  isDragActive ? 'border-accent bg-success-light scale-[1.01]' : 'border-border-2 hover:border-accent hover:bg-success-light/30'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 text-accent mx-auto mb-3" />
                <div className="font-medium text-ink mb-1">Drop your lease here</div>
                <div className="text-sm text-ink-3">or click to browse</div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  {['PDF', 'DOC', 'DOCX', 'Max 20MB'].map(f => (
                    <span key={f} className="text-[11px] font-mono bg-paper border border-border px-2 py-1 rounded text-ink-3">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP: details */}
          {step === 'details' && file && (
            <div>
              <h2 className="font-serif text-xl font-medium mb-1">Lease Details</h2>
              <p className="text-sm text-ink-3 mb-5">Help us label this lease (optional)</p>

              <div className="flex items-center gap-3 bg-success-light border border-success-mid rounded-xl p-3 mb-5">
                <FileText className="w-5 h-5 text-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-ink-3 font-mono">{(file.size / 1024).toFixed(0)} KB</div>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <Field label="Property Name" value={name} onChange={setName} placeholder="e.g. Koramangala 2BHK" />
                <Field label="Address (optional)" value={address} onChange={setAddress} placeholder="Full property address" />
                <Field label="City (optional)" value={city} onChange={setCity} placeholder="e.g. Bengaluru" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('upload')} className="flex-1 btn-ghost py-2.5 rounded-xl text-sm font-medium">
                  Back
                </button>
                <button
                  onClick={() => uploadMutation.mutate()}
                  disabled={uploadMutation.isPending}
                  className="flex-2 flex-1 bg-accent hover:bg-accent-dark text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Analyze Now →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP: analyzing */}
          {step === 'analyzing' && (
            <div>
              <h2 className="font-serif text-xl font-medium mb-1">Analyzing your lease</h2>
              <p className="text-sm text-ink-3 mb-6">Usually takes 30–60 seconds</p>

              <div className="flex flex-col items-center py-4">
                <div className="w-14 h-14 border-3 border-border-2 border-t-accent rounded-full animate-spin mb-6" />
                <div className="w-full space-y-2">
                  {ANALYSIS_STEPS.map((s, i) => (
                    <div key={s} className={cn(
                      'flex items-center gap-3 text-sm font-mono transition-colors',
                      i < currentStep && 'text-success',
                      i === currentStep && 'text-ink',
                      i > currentStep && 'text-ink-4'
                    )}>
                      <span className="w-4 text-center flex-shrink-0">
                        {i < currentStep ? '✓' : i === currentStep ? '→' : '○'}
                      </span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-ink-4 text-center mt-4">You can close this — we'll notify you when done</p>
            </div>
          )}

          {/* STEP: done */}
          {step === 'done' && (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="font-serif text-xl font-medium mb-2">Analysis Complete!</h2>
              <p className="text-sm text-ink-3 mb-6">Your lease has been analyzed. View the full report below.</p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-ink-2 hover:bg-paper transition-colors">
                  Close
                </button>
                <button
                  onClick={() => { onClose(); if (leaseId) navigate(`/dashboard/leases/${leaseId}`) }}
                  className="flex-1 bg-accent hover:bg-accent-dark text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  View Analysis →
                </button>
              </div>
            </div>
          )}

          {/* STEP: error */}
          {step === 'error' && (
            <div className="text-center py-4">
              <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
              <h2 className="font-serif text-xl font-medium mb-2">Analysis Failed</h2>
              <p className="text-sm text-ink-3 mb-6">{errorMsg}</p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-ink-2">Close</button>
                {errorMsg.includes('upgrade') ? (
                  <button onClick={() => { onClose(); navigate('/dashboard/billing') }}
                    className="flex-1 bg-accent text-white py-2.5 rounded-xl text-sm font-medium">
                    Upgrade Plan →
                  </button>
                ) : (
                  <button onClick={() => { setStep('upload'); setFile(null); setErrorMsg('') }}
                    className="flex-1 bg-accent text-white py-2.5 rounded-xl text-sm font-medium">
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-ink-2 font-medium font-mono uppercase tracking-wider mb-1.5">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-paper focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
      />
    </div>
  )
}
