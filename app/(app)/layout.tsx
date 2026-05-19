import { Sidebar } from '@/components/ui/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#080808] relative">
      {/* Ambient gradient orbs — glass blurs these */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-56 -left-56 w-[640px] h-[640px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(62,207,142,0.08) 0%, transparent 65%)' }} />
        <div className="absolute top-1/3 -right-48 w-[540px] h-[540px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-48 left-1/3 w-[480px] h-[480px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,166,35,0.05) 0%, transparent 65%)' }} />
      </div>

      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto relative pb-28 md:pb-0">
        {children}
      </main>
    </div>
  )
}
