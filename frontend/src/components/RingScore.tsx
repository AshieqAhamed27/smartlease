import { scoreColor, riskColor } from '../lib/utils'

interface Props {
  score: number
  risk: string
  size?: number
  showLabel?: boolean
}

export function RingScore({ score, risk, size = 48, showLabel = false }: Props) {
  const col = riskColor(risk)
  const r = size / 2 - 5
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)

  return (
    <div style={{ width: size, height: size }} className="relative flex-shrink-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e8e4da"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={4}
          strokeDasharray={circ.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          strokeLinecap="round"
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ color: col }}
      >
        <span style={{ fontSize: size > 60 ? 18 : 12, fontFamily: 'Fraunces, serif', fontWeight: 700 }}>
          {score}
        </span>
        {showLabel && size > 60 && (
          <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: '#8a8680', letterSpacing: '0.5px', marginTop: 1 }}>
            /100
          </span>
        )}
      </div>
    </div>
  )
}
