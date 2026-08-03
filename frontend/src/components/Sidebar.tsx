import { IconBarChart, IconBolt, IconInfo, IconX } from './Icon'
import type { AppView } from '../store/marketStore'
export type { AppView }

const NAV: Array<{ key: AppView; label: string; Icon: (props: any) => any; badge?: string }> = [
  { key: 'dashboard', label: 'Dashboard', Icon: IconBolt,     badge: 'Live' },
  { key: 'analysis',  label: 'Analyse',   Icon: IconInfo },
  { key: 'positions', label: 'Positions', Icon: IconBarChart },
]

function SidebarContent({
  active,
  onNavigate,
  onClose,
}: {
  active: AppView
  onNavigate: (view: AppView) => void
  onClose?: () => void
}) {
  return (
    <div className="flex flex-col h-full">

      {/* ── Logo cliquable → accueil ── */}
      <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid var(--border-sidebar)' }}>
        <button
          onClick={() => { onNavigate('home'); onClose?.() }}
          className="flex items-center gap-3 group"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Accueil"
        >
          {/* Icône verte grande comme la capture */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #4edea3 0%, #059669 100%)',
              boxShadow: '0 0 20px rgba(78,222,163,0.3)',
              color: '#003824',
            }}
          >
            <IconBarChart size={20} />
          </div>
          <div className="leading-tight text-left">
            <p className="font-bold text-[15px] leading-none" style={{ color: 'var(--text-primary)' }}>Trading Tools</p>
          </div>
        </button>
        {onClose && (
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors ml-2"
            aria-label="Fermer">
            <IconX size={16} />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <div className="px-3 pt-5 pb-2">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase px-2 mb-3" style={{ color: 'var(--text-faint)' }}>
          Navigation
        </p>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const isActive = item.key === active
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); onClose?.() }}
                className={`
                  relative group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  text-sm font-medium transition-all duration-150
                `}
                style={isActive ? {
                  background: 'rgba(78,222,163,0.12)',
                  border: '1px solid rgba(78,222,163,0.2)',
                  color: '#4edea3',
                } : {
                  border: '1px solid transparent',
                  color: 'var(--text-secondary)',
                }}
              >
                <span className={`shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                  <item.Icon size={16} />
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none border
                    ${isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-white/[0.05] text-zinc-600 border-white/[0.06]'
                    }`}>
                    {item.badge}
                  </span>
                )}
                {/* Barre droite active */}
                {isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-emerald-400" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Power Mode card ── */}
      <div className="mx-3 mb-4 p-4 rounded-2xl"
        style={{ background: 'rgba(78,222,163,0.08)', border: '1px solid rgba(78,222,163,0.2)' }}>
        <p className="font-bold text-[13px] mb-1 text-emerald-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Power Mode
        </p>
        <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
          Accédez à des analyses de marché avancées et des signaux temps réel.
        </p>
        <button
          className="w-full py-2.5 rounded-xl font-bold text-sm transition-all"
          style={{ background: '#4edea3', color: '#003824', border: 'none', cursor: 'pointer', boxShadow: '0 0 12px rgba(78,222,163,0.25)' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 22px rgba(78,222,163,0.45)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 12px rgba(78,222,163,0.25)' }}
        >
          Upgrade to Pro
        </button>
      </div>

    </div>
  )
}

export function Sidebar({
  active, onNavigate, isOpen, onClose,
}: {
  active: AppView; onNavigate: (view: AppView) => void; isOpen: boolean; onClose: () => void
}) {
  return (
    <>
      {/* Desktop permanent */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 z-40"
        style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-sidebar)' }}>
        <SidebarContent active={active} onNavigate={onNavigate} />
      </aside>

      {/* Overlay mobile */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer mobile */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-60
          transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-sidebar)' }}
      >
        <SidebarContent active={active} onNavigate={onNavigate} onClose={onClose} />
      </aside>
    </>
  )
}
