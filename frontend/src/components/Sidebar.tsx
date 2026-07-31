import { IconBarChart, IconBolt, IconHome, IconInfo, IconX } from './Icon'

export type AppView = 'home' | 'dashboard' | 'analysis' | 'positions'

const NAV: Array<{ key: AppView; label: string; Icon: (props: any) => any; badge?: string }> = [
  { key: 'home',      label: 'Accueil',   Icon: IconHome },
  { key: 'dashboard', label: 'Dashboard', Icon: IconBolt,     badge: 'Live' },
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
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-72 flex flex-col
          bg-[#080b12] border-r border-white/[0.06]
          transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header du sidebar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-[11px] tracking-widest text-zinc-950 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                DA
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080b12]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Deriv AI</p>
              <p className="text-zinc-500 text-[11px] mt-0.5 leading-none">Trading Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
            aria-label="Fermer le menu"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Section label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600">Navigation</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const isActive = item.key === active
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); onClose() }}
                className={`
                  group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  text-sm font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                  }
                `}
              >
                {/* Active indicator */}
                <span className={`shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                  <item.Icon size={16} />
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                    ${isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-white/[0.06] text-zinc-500 border border-white/[0.06]'
                    }`}>
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="shrink-0 w-1 h-1 rounded-full bg-cyan-400" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Indicatif uniquement.<br />
            Pas un conseil financier.
          </p>
        </div>
      </aside>
    </>
  )
}
