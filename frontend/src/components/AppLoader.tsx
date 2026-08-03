/**
 * Écran de chargement affiché jusqu'à ce que les bougies
 * et la première analyse soient disponibles.
 */
import { useEffect, useState } from 'react'
import { useMarketStore } from '../store/marketStore'
import { IconCheck } from './Icon'

const STEPS = [
  { label: 'Connexion au serveur',         check: (s: ReturnType<typeof useMarketStore.getState>) => s.isConnected },
  { label: 'Réception des bougies OHLC',   check: (s: ReturnType<typeof useMarketStore.getState>) => s.candlesLoaded },
  { label: 'Collecte des données marché',  check: (s: ReturnType<typeof useMarketStore.getState>) => s.ticks.length >= 1 },
  { label: 'Calcul des indicateurs MTF',   check: (s: ReturnType<typeof useMarketStore.getState>) => s.analysis != null },
]

const COLD_START_DELAY = 8_000   // après 8s sans connexion → afficher le message cold start

export function AppLoader() {
  const state = useMarketStore()
  const [dots, setDots]         = useState('')
  const [timedOut, setTimedOut]   = useState(false)
  const [coldStart, setColdStart] = useState(false)

  // Animation des points
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => clearInterval(t)
  }, [])

  // Après 8s sans connexion → prévenir que le serveur se réveille (cold start Render)
  useEffect(() => {
    if (state.isConnected) return
    const t = setTimeout(() => setColdStart(true), COLD_START_DELAY)
    return () => clearTimeout(t)
  }, [state.isConnected])

  // Timeout 60s — Render free tier peut prendre jusqu'à 50s pour se réveiller
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 60_000)
    return () => clearTimeout(t)
  }, [])

  const completedCount = STEPS.filter(s => s.check(state)).length
  const progress = Math.round((completedCount / STEPS.length) * 100)

  // Étape courante = premier non-complété
  const currentStep = STEPS.find(s => !s.check(state))

  // Timeout : afficher un message d'erreur si le backend est inaccessible
  if (timedOut && !state.isConnected) {
    return (
      <div className="app-bg flex flex-col items-center justify-center px-6 gap-6 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
            <path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Connexion impossible</h1>
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
          Le serveur est inaccessible. Vérifiez votre connexion internet ou réessayez dans quelques instants.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl font-bold text-sm"
          style={{ background: '#4edea3', color: '#003824', border: 'none', cursor: 'pointer' }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="app-bg flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'linear-gradient(135deg, #4edea3 0%, #059669 100%)',
          boxShadow: '0 0 40px rgba(78,222,163,0.30)',
          color: '#003824',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 20V14" /><path d="M12 20V4" /><path d="M18 20V10" />
        </svg>
      </div>

      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Trading Tools</h1>
      <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>
        {currentStep ? currentStep.label + dots : 'Prêt' + dots}
      </p>

      {/* Message cold start */}
      {coldStart && !state.isConnected && (
        <div className="w-full max-w-sm mb-6 px-4 py-3 rounded-xl text-center"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <p className="text-yellow-400 text-xs font-semibold">Serveur en cours de démarrage…</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Plan gratuit Render — première connexion ~20–30s</p>
        </div>
      )}

      {/* Barre de progression */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-faint)' }}>
          <span>Chargement</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-stat)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #4edea3, #059669)' }}
          />
        </div>
      </div>

      {/* Étapes */}
      <div className="w-full max-w-sm space-y-3">
        {STEPS.map((step, i) => {
          const done   = step.check(state)
          const active = !done && STEPS.slice(0, i).every(s => s.check(state))
          return (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                style={done ? {
                  background: 'rgba(78,222,163,0.2)',
                  border: '1px solid rgba(78,222,163,0.4)',
                  color: '#4edea3',
                } : active ? {
                  background: 'rgba(78,222,163,0.08)',
                  border: '1px solid rgba(78,222,163,0.25)',
                } : {
                  background: 'var(--bg-stat)',
                  border: '1px solid var(--border-base)',
                }}
              >
                {done ? <IconCheck size={11} /> : active ? (
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4edea3' }} />
                ) : null}
              </div>

              <span
                className="text-sm transition-colors duration-300"
                style={{ color: done ? '#4edea3' : active ? 'var(--text-primary)' : 'var(--text-faint)', fontWeight: active ? 500 : 400 }}
              >
                {step.label}
                {active && i === 2 && (
                  <span className="text-xs ml-1" style={{ color: '#4edea3' }}>
                    {state.ticks.length === 0 ? '(en attente...)' : '(OK)'}
                  </span>
                )}
                {active && i !== 2 && <span style={{ color: '#4edea3' }}>{dots}</span>}
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-10 text-xs" style={{ color: 'var(--text-faint)' }}>
        {state.currentSymbol} · Analyse multi-timeframe
      </p>
    </div>
  )
}
