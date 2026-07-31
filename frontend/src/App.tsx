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
import { FVGPanel } from './components/FVGPanel'
import { PositionTracker } from './components/PositionTracker'
import { NotificationPermission } from './components/NotificationPermission'
import { useNotifications } from './hooks/useNotifications'

export default function App() {
  useWebSocket()
  useNotifications()
  const { isReady, setCurrentSymbol, currentSymbol, analysis } = useMarketStore()
  const [showDetails, setShowDetails] = useState(false)

  // Afficher le loader tant que les données ne sont pas prêtes
  if (!isReady) {
    return <AppLoader />
  }

  const sigType        = analysis?.signal.type ?? 'WAIT'
  const signalWeak     = !analysis || sigType === 'NEUTRAL' || sigType === 'WAIT' || analysis.signal.confidence < 70
  const isInvalidated  = (analysis as any)?.invalidation?.invalidated ?? false

  const btnBorder =
    sigType === 'BUY'  ? 'border-green-500/40' :
    sigType === 'SELL' ? 'border-red-500/40'   :
    'border-white/10'

  return (
    <div className="app-bg">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
        <div className="app-container py-3 flex items-center justify-between gap-3 flex-wrap">
          {/* Logo + titre */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400/90 to-blue-500/90 shadow-[0_10px_30px_rgba(34,211,238,0.18)] flex items-center justify-center font-black text-[11px] tracking-wide text-zinc-950 shrink-0">DA</div>
            <div>
              <h1 className="text-white font-bold text-sm leading-none">Deriv AI Trading Assistant</h1>
              <p className="text-zinc-400 text-xs">{currentSymbol} · 1min / 5min / 15min / 1h</p>
            </div>
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

      <main className="app-container py-5 space-y-4">

        {/* ① Bannière de décision — toujours en premier */}
        <DecisionBanner />

        {/* ② Suivi de positions ouvertes — visible si positions saisies */}
        <PositionTracker />

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
              ? 'bg-white/[0.06] border-white/10 text-white'
              : `bg-white/[0.04] ${btnBorder} text-zinc-300 hover:text-white hover:bg-white/[0.06]`
          }`}
        >
          {showDetails
            ? '▲ Masquer l\'analyse détaillée'
            : '▼ Voir l\'analyse complète (MTF · Stratégies · FVG · Confirmation · Compte)'}
        </button>

        {/* ── Détails dépliables ── */}
        {showDetails && (
          <div className="space-y-4">

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

      <footer className="text-center py-4 text-zinc-500 text-xs border-t border-white/10 mt-6">
        Deriv AI Trading Assistant · Indicatif uniquement · Pas un conseil financier
      </footer>
    </div>
  )
}
