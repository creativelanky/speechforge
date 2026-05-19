'use client'

import { useEffect, useRef } from 'react'

interface WaveformProps {
  active: boolean
  color?: string
}

export function Waveform({ active, color = '#E8590C' }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const phaseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const BAR_COUNT = 32
    const BAR_WIDTH = 3
    const GAP = 2

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      phaseRef.current += active ? 0.15 : 0.04

      for (let i = 0; i < BAR_COUNT; i++) {
        const center = BAR_COUNT / 2
        const distFromCenter = Math.abs(i - center) / center

        let amp: number
        if (active) {
          amp = (Math.sin(phaseRef.current + i * 0.4) * 0.5 + 0.5) * (1 - distFromCenter * 0.5)
          amp = amp * 0.7 + 0.15
        } else {
          amp = (Math.sin(phaseRef.current * 0.5 + i * 0.3) * 0.5 + 0.5) * (1 - distFromCenter * 0.6) * 0.15 + 0.05
        }

        const barH = amp * H
        const x = i * (BAR_WIDTH + GAP)
        const y = (H - barH) / 2

        ctx.fillStyle = active ? color : 'rgba(120,120,128,0.3)'
        ctx.beginPath()
        ctx.roundRect(x, y, BAR_WIDTH, barH, 1.5)
        ctx.fill()
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [active, color])

  return (
    <canvas
      ref={canvasRef}
      width={(32 * (3 + 2)) - 2}
      height={36}
      className="block"
    />
  )
}
