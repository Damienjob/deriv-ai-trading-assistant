import { IconBarChart, IconBolt, IconHome, IconInfo, IconX } from './Icon'

export type AppView = 'home' | 'dashboard' | 'analysis' | 'positions'

const NAV: Array<{ key: AppView; label: string; Icon: (props: any) => any }> = [
  { key: 'home',      label: 'Accueil',   Icon: IconHome },
  { key: 'dashboard', label: 'Dashboard', Icon: IconBolt },
  { key: 'analysis',  label: 'Analyse',   Icon: IconInfo },
  { key: 'positions', label: 'Positions', Icon: IconBarChart },
]

export function Sidebar({
  active,
  onNavigate,
  isOpen,
  onClose,
}: {
  active: AppView
  onNavigate: (view: AppView) => void
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed z-50 inset-y-0 left-0 w-72 bg-zinc-950 border-r border-white/10 p-4 transform transition-transform lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400/90 to-blue-500/90 shadow-[0_10px_30px_rgba(34,211,238,0.18)] flex items-center justify-center font-black text-[11px] tracking-wide text-zinc-950 shrink-0">
              DA
            </div>
            <div className="leading-tight">
              <p className="text-white font-bold text-sm">Deriv AI</p>
              <p className="text-zinc-500 text-xs">Trading Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-9 h-9 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] text-zinc-200 flex items-center justify-center"
            aria-label="Fermer le menu"
          >
            <IconX size={18} />
          </button>
        </div>

        <nav className="mt-5 space-y-1">
          {NAV.map((item) => {
            const isActive = item.key === active
            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.key)
                  onClose()
                }}
                className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
                  isActive
                    ? 'bg-white/[0.08] border-white/10 text-white'
                    : 'bg-transparent border-transparent text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <item.Icon size={16} />
                  <span className="text-sm font-semibold">{item.label}</span>
                </span>
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
