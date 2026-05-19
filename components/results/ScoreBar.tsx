'use client'

import { useEffect, useState } from 'react'
import { scoreColor } from '@/lib/utils'

interface ScoreBarProps { label: string; score: number; delay?: number }

export function ScoreBar({ label, score, delay = 0 }: ScoreBarProps) {
  const [width, setWidth] = useState(0)
  const color = scoreColor(score)

  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay + 100)
    return () => clearTimeout(t)
  }, [score, delay])

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-[#a0a0a0]">{label}</span>
        <span className="text-xs font-semibold font-mono" style={{ color }}>{score}</span>
      </div>
      <div className="h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
