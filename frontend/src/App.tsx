/**
 * Deriv AI Trading Assistant
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

export default function App() {
  useWebSocket()
  useNotifications()
  const { isReady, currentSymbol, analysis, currentView, setCurrentView } = useMarketStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const view    = currentView
  const setView = setCurrentView

  const isHome        = view === 'home'
  const isInvalidated = (analysis as any)?.invalidation?.invalidated ?? false

  return (
    <div className="app-bg min-h-screen">

      {/* AppLoader par-dessus sans démonter l'app — évite le reset de la vue */}
      {!isReady && <div className="fixed inset-0 z-[9999]"><AppLoader /></div>}

  const isHome        = view === 'home'
  const isInvalidated = (analysis as any)?.invalidation?.invalidated ?? false

  return (
    <div className="app-bg min-h-screen">

      {/* ── Sidebar — visible uniquement sur les vues internes ── */}
      {!isHome && (
        <Sidebar
          active={view}
          onNavigate={setView}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Zone principale ── */}
      <div className={`flex flex-col min-h-screen ${!isHome ? 'lg:pl-60' : ''}`}>

        {/* ── Header accueil ── */}
        {isHome && (
          <header
            className="fixed top-0 w-full z-50 border-b backdrop-blur-xl"
            style={{ background: 'rgba(10,10,10,0.85)', borderColor: 'rgba(60,74,66,0.3)' }}
          >
            <div className="flex justify-between items-center h-20 px-4 sm:px-8 max-w-7xl mx-auto gap-4">

              {/* Logo */}
              <button
                onClick={() => setView('home')}
                className="flex items-center gap-3 group shrink-0"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label="Accueil"
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#4edea3,#059669)', boxShadow: '0 0 16px rgba(78,222,163,0.28)', color: '#003824' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 20V14" /><path d="M12 20V4" /><path d="M18 20V10" />
                  </svg>
                </div>
                <div className="hidden sm:block leading-tight text-left">
                  <p className="font-bold text-[15px] leading-none" style={{ color: '#e5e2e1', fontFamily: 'Inter, sans-serif' }}>Deriv AI</p>
                  <p className="text-[12px] mt-0.5 leading-none" style={{ color: '#bbcabf', fontFamily: 'Inter, sans-serif' }}>Trading Assistant</p>
                </div>
              </button>

              {/* Nav centre */}
              <nav className="hidden md:flex gap-8 items-center">
                {([
                  { key: 'dashboard' as AppView, label: 'Dashboard' },
                  { key: 'analysis'  as AppView, label: 'Analysis'  },
                ] as { key: AppView; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 16, color: '#bbcabf', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e5e2e1')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#bbcabf')}
                  >
                    {label}
                  </button>
                ))}
                <a
                  href="#pricing"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, color: '#bbcabf', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#e5e2e1')}
                  onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#bbcabf')}
                >
                  Pricing
                </a>
              </nav>

              {/* CTA */}
              <button
                onClick={() => setView('dashboard')}
                className="shrink-0"
                style={{ background: '#4edea3', color: '#003824', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, boxShadow: '0 0 20px rgba(78,222,163,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(78,222,163,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(78,222,163,0.3)' }}
              >
                Ouvrir le Dashboard
              </button>
            </div>
          </header>
        )}

        {/* ── Header vues internes ── */}
        {!isHome && (
          <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0d1526]/95 backdrop-blur-xl">
            <div className="px-4 sm:px-6 h-14 flex items-center gap-4">

              {/* Burger mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors shrink-0"
                aria-label="Ouvrir le menu"
              >
                <IconMenu size={17} />
              </button>

              {/* Symbol pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#4edea3' }} />
                <span className="text-[12px] font-mono font-semibold text-zinc-300">{currentSymbol}</span>
                <span className="text-zinc-600 text-[11px] mx-0.5">·</span>
                <span className="text-[11px] text-zinc-500 font-mono">M1 M5 M15 H1</span>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                <NotificationPermission />
                <ConnectionStatus />
              </div>
            </div>
          </header>
        )}

        {/* ── Alerte invalidation ── */}
        {isInvalidated && !isHome && (
          <div className="border-b border-red-500/20 bg-red-500/[0.08] text-red-300 text-center py-2 text-[13px] font-semibold px-4 tracking-wide">
            ⚠ Signal invalidé — conditions cassées · Ne pas entrer en position
          </div>
        )}

        {/* ── Contenu ── */}
        <main className={`flex-1 w-full ${isHome ? 'pt-20' : 'px-4 sm:px-6 py-6 max-w-7xl mx-auto'}`}>
          {view === 'home'      && <HomeView onNavigate={setView} />}
          {view === 'dashboard' && <DashboardView />}
          {view === 'analysis'  && <AnalysisView />}
          {view === 'positions' && <PositionsView />}
        </main>

        {/* ── Footer vues internes ── */}
        {!isHome && (
          <footer className="border-t border-white/[0.06] px-4 sm:px-6 py-3 flex items-center justify-between mt-auto">
            <p className="text-[11px] text-zinc-600">© 2026 Deriv AI Trading Assistant</p>
            <p className="text-[11px] text-zinc-600">Indicatif uniquement · Pas un conseil financier</p>
          </footer>
        )}

      </div>
    </div>
  )
}
