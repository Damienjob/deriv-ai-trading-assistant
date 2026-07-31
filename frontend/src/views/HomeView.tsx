import { AssetSelector } from '../components/AssetSelector'
import { CapitalSettings } from '../components/CapitalSettings'
import { DecisionBanner } from '../components/DecisionBanner'
import { PriceCard } from '../components/PriceCard'
import { SignalCard } from '../components/SignalCard'
import type { AppView } from '../components/Sidebar'
import { IconBarChart, IconBolt, IconInfo } from '../components/Icon'
import { useMarketStore } from '../store/marketStore'

export function HomeView({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { setCurrentSymbol, analysis } = useMarketStore()
  const sigType = analysis?.signal.type ?? 'WAIT'
  const btnBorder =
    sigType === 'BUY'  ? 'border-green-500/40' :
    sigType === 'SELL' ? 'border-red-500/40'   :
    'border-white/10'

  return (
    <div className="space-y-4">
      <DecisionBanner />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AssetSelector onSelect={setCurrentSymbol} />
        <CapitalSettings />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3"><PriceCard /></div>
        <div className="lg:col-span-2"><SignalCard /></div>
      </div>

      <div className="surface p-5">
        <p className="text-zinc-200 font-semibold text-sm mb-3">Accès rapide</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`rounded-xl border px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors ${btnBorder}`}
          >
            <span className="inline-flex items-center gap-2 text-white font-semibold text-sm">
              <IconBolt size={16} />
              <span>Dashboard</span>
            </span>
            <p className="text-zinc-500 text-xs mt-1">Graphique + prix + signal</p>
          </button>

          <button
            onClick={() => onNavigate('analysis')}
            className="rounded-xl border border-white/10 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
          >
            <span className="inline-flex items-center gap-2 text-white font-semibold text-sm">
              <IconInfo size={16} />
              <span>Analyse</span>
            </span>
            <p className="text-zinc-500 text-xs mt-1">MTF, stratégies, contexte</p>
          </button>

          <button
            onClick={() => onNavigate('positions')}
            className="rounded-xl border border-white/10 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
          >
            <span className="inline-flex items-center gap-2 text-white font-semibold text-sm">
              <IconBarChart size={16} />
              <span>Positions</span>
            </span>
            <p className="text-zinc-500 text-xs mt-1">Suivi + plan de position</p>
          </button>
        </div>
      </div>
    </div>
  )
}

