/**
 * Écran de chargement affiché jusqu'à ce que les bougies
 * et la première analyse soient disponibles.
 */
import { useEffect, useState } from 'react'
import { useMarketStore } from '../store/marketStore'

const STEPS = [
  { label: 'Connexion au serveur',         check: (s: ReturnType<typeof useMarketStore.getState>) => s.isConnected },
  { label: 'Réception des bougies OHLC',   check: (s: ReturnType<typeof useMarketStore.getState>) => s.candlesLoaded },
  { label: 'Collecte des données marché',  check: (s: ReturnType<typeof useMarketStore.getState>) => s.ticks.length >= 1 },
  { label: 'Calcul des indicateurs MTF',   check: (s: ReturnType<typeof useMarketStore.getState>) => s.analysis != null },
]

export function AppLoader() {
  const state = useMarketStore()
  const [dots, setDots] = useState('')

  // Animation des points
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => clearInterval(t)
  }, [])

  const completedCount = STEPS.filter(s => s.check(state)).length
  const progress = Math.round((completedCount / STEPS.length) * 100)

  // Étape courante = premier non-complété
  const currentStep = STEPS.find(s => !s.check(state))

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-2xl mb-6 shadow-lg shadow-blue-600/30">
        D
      </div>

      <h1 className="text-xl font-bold text-white mb-1">Deriv AI Trading Assistant</h1>
      <p className="text-gray-400 text-sm mb-10">
        {currentStep ? currentStep.label + dots : 'Prêt' + dots}
      </p>

      {/* Barre de progression */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Chargement</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
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
                active ? 'bg-blue-500/20 border border-blue-500 text-blue-400' :
                         'bg-gray-800 border border-gray-700 text-gray-600'
              }`}>
                {done ? '✓' : active ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                ) : ''}
              </div>

              {/* Label */}
              <span className={`text-sm transition-colors duration-300 ${
                done   ? 'text-green-400' :
                active ? 'text-white font-medium' :
                         'text-gray-600'
              }`}>
                {step.label}
                {active && i === 2 && (
                  <span className="text-blue-400 text-xs ml-1">
                    {state.ticks.length === 0 ? '(en attente...)' : '(✓)'}
                  </span>
                )}
                {active && i !== 2 && <span className="text-blue-400">{dots}</span>}
              </span>
            </div>
          )
        })}
      </div>

      {/* Info symbole */}
      <p className="mt-10 text-xs text-gray-600">
        {state.currentSymbol} · Volatility Index
      </p>
    </div>
  )
}
