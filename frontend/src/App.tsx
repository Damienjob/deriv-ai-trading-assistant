/**
 * Dashboard — Deriv AI Trading Assistant
 */
import { useState } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useMarketStore } from './store/marketStore'
import { AppLoader } from './components/AppLoader'
import { ConnectionStatus } from './components/ConnectionStatus'
import { NotificationPermission } from './components/NotificationPermission'
import { useNotifications } from './hooks/useNotifications'
import { Sidebar, type AppView } from './components/Sidebar'
import { IconBarChart, IconBolt, IconHome, IconInfo, IconMenu } from './components/Icon'

import { HomeView } from './views/HomeView'
import { DashboardView } from './views/DashboardView'
import { AnalysisView } from './views/AnalysisView'
import { PositionsView } from './views/PositionsView'

const NAV: Array<{ key: AppView; label: string; Icon: (p: any) => any; badge?: string }> = [
  { key: 'home',      label: 'Accueil',   Icon: IconHome },
  { key: 'dashboard', label: 'Dashboard', Icon: IconBolt,     badge: 'Live' },
  { key: 'analysis',  label: 'Analyse',   Icon: IconInfo },
  { key: 'positions', label: 'Positions', Icon: IconBarChart },
]

export default function App() {
  useWebSocket()
  useNotifications()
  const { isReady, currentSymbol, analysis, isConnected } = useMarketStore()
  const [view, setView] = useState<AppView>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isReady) return <AppLoader />

  const isInvalidated = (analysis as any)?.invalidation?.invalidated ?? false

  return (
    <div className="app-bg min-h-screen flex flex-col">
      <Sidebar
        active={view}
        onNavigate={setView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080b12]/80 backdrop-blur-xl">
        <div className="app-container h-14 flex items-center justify-between gap-4">

          {/* ── LEFT: burger + logo + nav ── */}
          <div className="flex items-center gap-4 min-w-0">

            {/* Burger mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
              aria-label="Ouvrir le menu"
            >
              <IconMenu size={17} />
            </button>

            {/* Logo */}
            <button
              onClick={() => setView('home')}
              className="flex items-center gap-2.5 shrink-0 group"
              aria-label="Accueil"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-[10px] tracking-widest text-zinc-950 shadow-[0_0_18px_rgba(34,211,238,0.22)] group-hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-shadow">
                  DA
                </div>
                {/* Online dot */}
                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px] border-[#080b12] transition-colors ${isConnected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-white font-bold text-[13px] leading-none tracking-tight">Deriv AI</p>
                <p className="text-zinc-500 text-[10px] leading-none mt-0.5 tracking-wide">Trading Assistant</p>
              </div>
            </button>

            {/* Divider */}
            <div className="hidden lg:block w-px h-5 bg-white/[0.08] shrink-0" />

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV.map((item) => {
                const isActive = item.key === view
                return (
                  <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    className={`
                      group relative flex items-center gap-2 px-3 py-1.5 rounded-lg
                      text-[13px] font-medium transition-all duration-150
                      ${isActive
                        ? 'text-white bg-white/[0.07]'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    <span className={`transition-colors ${isActive ? 'text-cyan-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                      <item.Icon size={14} />
                    </span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none
                        ${isActive
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-white/[0.05] text-zinc-500'
                        }`}>
                        {item.badge}
                      </span>
                    )}
                    {/* Active underline */}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-px bg-cyan-400/60 rounded-full" />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* ── RIGHT: symbol pill + notifications + status ── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Symbol + timeframes pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="text-[12px] font-mono font-semibold text-zinc-300">{currentSymbol}</span>
              <span className="text-zinc-600 text-[11px]">·</span>
              <span className="text-[11px] text-zinc-500 font-mono">M1 M5 M15 H1</span>
            </div>

            {/* Notifications */}
            <NotificationPermission />

            {/* Connection status */}
            <ConnectionStatus />
          </div>
        </div>
      </header>

      {/* ── Alerte invalidation ── */}
      {isInvalidated && (
        <div className="border-b border-red-500/20 bg-red-500/8 text-red-300 text-center py-2 text-[13px] font-semibold px-4 z-20 tracking-wide">
          ⚠ Signal invalidé — conditions cassées · Ne pas entrer en position
        </div>
      )}

      {/* ── Main content ── */}
      <main className="app-container py-6 flex-1">
        {view === 'home'      && <HomeView onNavigate={setView} />}
        {view === 'dashboard' && <DashboardView />}
        {view === 'analysis'  && <AnalysisView />}
        {view === 'positions' && <PositionsView />}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] mt-auto">
        <div className="app-container py-3 flex items-center justify-between">
          <p className="text-[11px] text-zinc-600">
            © 2026 Deriv AI Trading Assistant
          </p>
          <p className="text-[11px] text-zinc-600">
            Indicatif uniquement · Pas un conseil financier
          </p>
        </div>
      </footer>
    </div>
  )
}
