'use client'

import { useEffect, useState } from 'react'
import { scoreColor } from '@/lib/utils'

interface ScoreRingProps { score: number; size?: number; strokeWidth?: number }

export function ScoreRing({ score, size = 120, strokeWidth = 5 }: ScoreRingProps) {
  const [displayed, setDisplayed] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const color = scoreColor(score)

  useEffect(() => {
    const duration = 1000
    const startTime = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * score))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score])

  const offset = circumference - (displayed / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.05s linear' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold font-mono" style={{ color }}>{displayed}</span>
        <span className="text-[10px] text-[#6b6b6b]">/ 100</span>
      </div>
    </div>
  )
}
