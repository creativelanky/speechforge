export function Spinner({ size = 20, color = '#3ECF8E' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.15" strokeWidth="2.5" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
