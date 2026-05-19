'use client'

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-[#3ECF8E]/50 rounded-full"
      style={{ width: 36, height: 20 }}
    >
      <span
        className="absolute inset-0 rounded-full transition-colors duration-200"
        style={{ backgroundColor: checked ? '#3ECF8E' : 'rgba(255,255,255,0.1)' }}
      />
      <span
        className="absolute bg-white rounded-full transition-transform duration-200"
        style={{
          width: 14, height: 14, top: 3, left: 3,
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  )
}
