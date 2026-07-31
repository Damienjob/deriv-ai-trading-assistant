/**
 * Dashboard — Deriv AI Trading Assistant
 * Layout :
 *   1. Bannière de décision (ACHETEZ / VENDEZ / NE RIEN FAIRE)
 *   2. Prix + Signal
 *   3. Graphique en bougies (Lightweight Charts) avec FVG, EMA, BB, S/R
 *   4. Détails dépliables (MTF, stratégies, FVG panel, compte...)
 */
import { useState } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useMarketStore } from './store/marketStore'
import { AppLoader } from './components/AppLoader'
import { ConnectionStatus } from './components/ConnectionStatus'
import { NotificationPermission } from './components/NotificationPermission'
import { useNotifications } from './hooks/useNotifications'
import { Sidebar, type AppView } from './components/Sidebar'
import { IconMenu } from './components/Icon'
import { HomeView } from './views/HomeView'
import { DashboardView } from './views/DashboardView'
import { AnalysisView } from './views/AnalysisView'
import { PositionsView } from './views/PositionsView'

const NAV: Array<{ key: AppView; label: string }> = [
  { key: 'home',      label: 'Accueil' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'analysis',  label: 'Analyse' },
  { key: 'positions', label: 'Positions' },
]

export default function App() {
  useWebSocket()
  useNotifications()
  const { isReady, currentSymbol, analysis } = useMarketStore()
  const [view, setView] = useState<AppView>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Afficher le loader tant que les données ne sont pas prêtes
  if (!isReady) {
    return <AppLoader />
  }

  const isInvalidated  = (analysis as any)?.invalidation?.invalidated ?? false

  return (
    <div className="app-bg">
      <Sidebar
        active={view}
        onNavigate={setView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
        <div className="app-container py-3 flex items-center justify-between gap-3">
          {/* Logo + titre */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] text-zinc-200 flex items-center justify-center"
              aria-label="Ouvrir le menu"
            >
              <IconMenu size={18} />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400/90 to-blue-500/90 shadow-[0_10px_30px_rgba(34,211,238,0.18)] flex items-center justify-center font-black text-[11px] tracking-wide text-zinc-950 shrink-0">DA</div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm leading-none">Deriv AI Trading Assistant</h1>
              <p className="text-zinc-400 text-xs">{currentSymbol} · 1min / 5min / 15min / 1h</p>
            </div>

            <nav className="hidden lg:flex items-center gap-1 ml-2">
              {NAV.map((item) => {
                const isActive = item.key === view
                return (
                  <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                      isActive
                        ? 'bg-white/[0.08] border-white/10 text-white'
                        : 'bg-transparent border-transparent text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Connexion */}
          <div className="flex items-center gap-3">
            <NotificationPermission />
            <ConnectionStatus />
          </div>
        </div>
      </header>

      {/* ── Alerte invalidation ── */}
      {isInvalidated && (
        <div className="border-b border-red-500/30 bg-red-500/10 text-red-200 text-center py-2 text-sm font-bold px-4 z-20">
          Signal invalidé — conditions cassées. Ne pas entrer en position.
        </div>
      )}

      <main className="app-container py-5">
        {view === 'home' && <HomeView onNavigate={setView} />}
        {view === 'dashboard' && <DashboardView />}
        {view === 'analysis' && <AnalysisView />}
        {view === 'positions' && <PositionsView />}
      </main>

      <footer className="text-center py-4 text-zinc-500 text-xs border-t border-white/10 mt-6">
        Deriv AI Trading Assistant · Indicatif uniquement · Pas un conseil financier
      </footer>
    </div>
  )
}
