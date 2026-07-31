import { AssetSelector } from '../components/AssetSelector'
import { CapitalSettings } from '../components/CapitalSettings'
import { DecisionBanner } from '../components/DecisionBanner'
import { PendingOrdersCard } from '../components/PendingOrdersCard'
import { PositionCard } from '../components/PositionCard'
import { PositionTracker } from '../components/PositionTracker'
import { useMarketStore } from '../store/marketStore'

export function PositionsView() {
  const { analysis, setCurrentSymbol } = useMarketStore()

  const sigType = analysis?.signal.type ?? 'WAIT'
  const signalWeak = !analysis || sigType === 'NEUTRAL' || sigType === 'WAIT' || analysis.signal.confidence < 70

  return (
    <div className="space-y-4">
      <DecisionBanner />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AssetSelector onSelect={setCurrentSymbol} />
        <CapitalSettings />
      </div>

      <PositionTracker />

      {signalWeak && <PendingOrdersCard />}

      <PositionCard />
    </div>
  )
}

