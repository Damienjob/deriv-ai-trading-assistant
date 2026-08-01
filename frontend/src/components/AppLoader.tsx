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
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400/90 to-red-600/90 flex items-center justify-center font-black text-base text-white mb-2">!</div>
        <h1 className="text-xl font-bold text-white">Connexion impossible</h1>
        <p className="text-zinc-400 text-sm max-w-xs">
          Le serveur est inaccessible. Vérifiez votre connexion internet ou réessayez dans quelques instants.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl font-bold text-sm"
          style={{ background: '#4edea3', color: '#003824' }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="app-bg flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400/90 to-blue-500/90 flex items-center justify-center font-black text-base text-zinc-950 mb-6 shadow-[0_18px_55px_rgba(34,211,238,0.18)]">DA</div>

      <h1 className="text-xl font-bold text-white mb-1">Trading Tools</h1>
      <p className="text-zinc-400 text-sm mb-10">
        {currentStep ? currentStep.label + dots : 'Prêt' + dots}
      </p>

      {/* Message cold start */}
      {coldStart && !state.isConnected && (
        <div className="w-full max-w-sm mb-6 px-4 py-3 rounded-xl text-center"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}
        >
          <p className="text-yellow-400 text-xs font-semibold mb-0.5">⏳ Serveur en cours de démarrage…</p>
          <p className="text-zinc-500 text-xs">Plan gratuit Render — première connexion ~20–30s</p>
        </div>
      )}

      {/* Barre de progression */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>Chargement</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400/80 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Étapes */}
      <div className="w-full max-w-sm space-y-3">
        {STEPS.map((step, i) => {
          const done = step.check(state)
          const active = !done && STEPS.slice(0, i).every(s => s.check(state))
          return (
            <div key={i} className="flex items-center gap-3">
              {/* Icône */}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs transition-all duration-300 ${
                done   ? 'bg-green-500 text-white' :
                active ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300' :
                         'bg-white/[0.03] border border-white/10 text-zinc-500'
              }`}>
                {done ? <IconCheck size={14} /> : active ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
                ) : ''}
              </div>

              {/* Label */}
              <span className={`text-sm transition-colors duration-300 ${
                done   ? 'text-green-400' :
                active ? 'text-white font-medium' :
                         'text-zinc-500'
              }`}>
                {step.label}
                {active && i === 2 && (
                  <span className="text-cyan-300 text-xs ml-1">
                    {state.ticks.length === 0 ? '(en attente...)' : '(OK)'}
                  </span>
                )}
                {active && i !== 2 && <span className="text-cyan-300">{dots}</span>}
              </span>
            </div>
          )
        })}
      </div>

      {/* Info symbole */}
      <p className="mt-10 text-xs text-zinc-500">
        {state.currentSymbol} · Volatility Index
      </p>
    </div>
  )
}
