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
import { ConnectionStatus } from './components/ConnectionStatus'
import { DecisionBanner } from './components/DecisionBanner'
import { PriceCard } from './components/PriceCard'
import { SignalCard } from './components/SignalCard'
import { CandleChart } from './components/CandleChart'
import { TickFeed } from './components/TickFeed'
import { MTFPanel } from './components/MTFPanel'
import { CapitalSettings } from './components/CapitalSettings'
import { AssetSelector } from './components/AssetSelector'
import { PositionCard } from './components/PositionCard'
import { PendingOrdersCard } from './components/PendingOrdersCard'
import { StrategiesPanel } from './components/StrategiesPanel'
import { MarketContextCard } from './components/MarketContextCard'
import { ConfirmationCard } from './components/ConfirmationCard'
import { AccountPanel } from './components/AccountPanel'
import { AccountWidget } from './components/AccountWidget'
import { FVGPanel } from './components/FVGPanel'

export default function App() {
  useWebSocket()
  const { setCurrentSymbol, currentSymbol, analysis } = useMarketStore()
  const [showDetails, setShowDetails] = useState(false)

  const sigType        = analysis?.signal.type ?? 'WAIT'
  const signalWeak     = !analysis || sigType === 'NEUTRAL' || sigType === 'WAIT' || analysis.signal.confidence < 70
  const isInvalidated  = (analysis as any)?.invalidation?.invalidated ?? false

  const btnBorder =
    sigType === 'BUY'  ? 'border-green-500/40' :
    sigType === 'SELL' ? 'border-red-500/40'   :
    'border-gray-700'

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* ── Header ── */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          {/* Logo + titre */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
              D
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-none">
                Deriv AI Trading Assistant
              </h1>
              <p className="text-gray-500 text-xs">{currentSymbol} · 1min / 5min / 15min / 1h</p>
            </div>
          </div>

          {/* Compte Deriv + Connexion */}
          <div className="flex items-center gap-3">
            <AccountWidget onOpenDetails={() => setShowDetails(true)} />
            <ConnectionStatus />
          </div>
        </div>
      </header>

      {/* ── Alerte invalidation ── */}
      {isInvalidated && (
        <div className="bg-red-600 text-white text-center py-2 text-sm font-bold animate-pulse px-4 z-20">
          🚨 SIGNAL INVALIDÉ — Conditions cassées. Ne pas entrer en position.
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">

        {/* ① Bannière de décision — toujours en premier */}
        <DecisionBanner />

        {/* ② Sélecteur actif + Capital */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AssetSelector onSelect={setCurrentSymbol} />
          <CapitalSettings />
        </div>

        {/* ③ Prix + Signal */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><PriceCard /></div>
          <div className="lg:col-span-2"><SignalCard /></div>
        </div>

        {/* ④ Graphique en bougies — principal */}
        <CandleChart />

        {/* ── Bouton détails ── */}
        <button
          onClick={() => setShowDetails(v => !v)}
          className={`w-full py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            showDetails
              ? 'bg-gray-700 border-gray-600 text-white'
              : `bg-gray-800 ${btnBorder} text-gray-300 hover:text-white`
          }`}
        >
          {showDetails
            ? '▲ Masquer l\'analyse détaillée'
            : '▼ Voir l\'analyse complète (MTF · Stratégies · FVG · Confirmation · Compte)'}
        </button>

        {/* ── Détails dépliables ── */}
        {showDetails && (
          <div className="space-y-4">

            {/* Compte Deriv */}
            <AccountPanel />

            {/* Signal faible → ordres en attente */}
            {signalWeak && <PendingOrdersCard />}

            {/* FVG — zones d'imbalance */}
            <FVGPanel />

            {/* Contexte marché + Confirmation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MarketContextCard />
              <ConfirmationCard />
            </div>

            {/* Stratégies + Plan de position */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StrategiesPanel />
              <PositionCard />
            </div>

            {/* Tableau MTF + Flux de ticks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MTFPanel />
              <TickFeed />
            </div>

          </div>
        )}

      </main>

      <footer className="text-center py-3 text-gray-700 text-xs border-t border-gray-800 mt-4">
        Deriv AI Trading Assistant · Indicatif uniquement · Pas un conseil financier
      </footer>
    </div>
  )
}
