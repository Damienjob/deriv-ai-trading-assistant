import { AssetSelector } from '../components/AssetSelector'
import { CapitalSettings } from '../components/CapitalSettings'
import { CandleChart } from '../components/CandleChart'
import { DecisionBanner } from '../components/DecisionBanner'
import { PriceCard } from '../components/PriceCard'
import { SignalCard } from '../components/SignalCard'
import { useMarketStore } from '../store/marketStore'

export function DashboardView() {
  const { setCurrentSymbol } = useMarketStore()

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

      <CandleChart />
    </div>
  )
}

