/**
 * Trading Tools
 */
import { useState, useEffect } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useMarketStore } from './store/marketStore'
import { AppLoader } from './components/AppLoader'
import { ConnectionStatus } from './components/ConnectionStatus'
import { NotificationPermission } from './components/NotificationPermission'
import { useNotifications } from './hooks/useNotifications'
import { Sidebar, type AppView } from './components/Sidebar'
import { IconMenu } from './components/Icon'
import { OfflineBanner } from './components/OfflineBanner'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { HomeView } from './views/HomeView'
import { DashboardView } from './views/DashboardView'
import { AnalysisView } from './views/AnalysisView'
import { PositionsView } from './views/PositionsView'
import { SupportView } from './views/SupportView'

type PWAInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function ThemeToggle({ theme, onToggle }: { theme: 'dark' | 'light'; onToggle: () => void }) {
  const isDark = theme === 'dark'
  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
      style={{
        background: 'var(--bg-stat)',
        border: '1px solid var(--border-base)',
        color: 'var(--text-secondary)',
      }}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
    >
      {isDark ? (
        /* Soleil */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        /* Lune */
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
    } else {
      root.classList.remove('light')
    }
    localStorage.setItem('theme', theme)
  }, [theme])
  // Appliquer immédiatement au montage pour éviter le flash
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved !== 'light') {
      document.documentElement.classList.remove('light')
    }
  }, [])
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return { theme, toggle }
}

export default function App() {
  useWebSocket()
  useNotifications()
  const { isReady, currentSymbol, analysis, currentView, setCurrentView } = useMarketStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const isOnline = useOnlineStatus()

  const view    = currentView
  const setView = setCurrentView

  const isHome        = view === 'home'
  const isInvalidated = (analysis as any)?.invalidation?.invalidated ?? false
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null)
  const [installVisible, setInstallVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as PWAInstallPrompt)
      setInstallVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setInstallVisible(false)
    console.log('PWA install outcome:', choice.outcome)
  }

  return (
    <div className="app-bg min-h-screen">

      {/* AppLoader par-dessus sans démonter l'app — évite le reset de la vue */}
      {!isReady && <div className="fixed inset-0 z-[9999]"><AppLoader /></div>}

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
            className="fixed top-0 w-full z-50 backdrop-blur-xl"
            style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-subtle)' }}
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
                  <p className="font-bold text-[15px] leading-none" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>Trading Tools</p>
                </div>
              </button>

              {/* Nav centre */}
              <nav className="hidden md:flex gap-8 items-center">
                {([
                  { key: 'dashboard' as AppView, label: 'Dashboard' },
                  { key: 'analysis'  as AppView, label: 'Analyse'   },
                ] as { key: AppView; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 16, color: 'var(--text-secondary)', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {/* CTA + toggle */}
              <div className="flex items-center gap-3 shrink-0">
                <ThemeToggle theme={theme} onToggle={toggle} />
                {installVisible && (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={installApp}
                      className="btn btn-primary py-2 px-4"
                    >
                      Installer l'app
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setView('dashboard')}
                  style={{ background: '#4edea3', color: '#003824', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, boxShadow: '0 0 20px rgba(78,222,163,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(78,222,163,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(78,222,163,0.3)' }}
                >
                  Ouvrir le Dashboard
                </button>
              </div>
            </div>
          </header>
        )}

        {/* ── Header vues internes ── */}
        {!isHome && (
          <header className="sticky top-0 z-30 backdrop-blur-xl"
            style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="px-4 sm:px-6 h-14 flex items-center gap-4">

              {/* Burger mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Ouvrir le menu"
              >
                <IconMenu size={17} />
              </button>

              {/* Symbol pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ background: 'var(--bg-stat)', border: '1px solid var(--border-base)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#4edea3' }} />
                <span className="text-[12px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{currentSymbol}</span>
                <span className="text-[11px] mx-0.5" style={{ color: 'var(--text-faint)' }}>·</span>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>M1 M5 M15 H1</span>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                <NotificationPermission />
                <ThemeToggle theme={theme} onToggle={toggle} />
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
          <OfflineBanner isOffline={!isOnline} isHome={isHome} />
          {view === 'home'      && <HomeView onNavigate={setView} />}
          {view === 'dashboard' && <DashboardView />}
          {view === 'analysis'  && <AnalysisView />}
          {view === 'positions' && <PositionsView />}
          {view === 'support'   && <SupportView />}
        </main>

        {/* ── Footer vues internes ── */}
        {!isHome && (
          <footer className="px-4 sm:px-6 py-3 flex items-center justify-between mt-auto"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>© 2026 Trading Tools</p>
            <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Indicatif uniquement · Pas un conseil financier</p>
          </footer>
        )}

      </div>
    </div>
  )
}
