import { ConfirmationCard } from '../components/ConfirmationCard'
import { DecisionBanner } from '../components/DecisionBanner'
import { FVGPanel } from '../components/FVGPanel'
import { MarketContextCard } from '../components/MarketContextCard'
import { MTFPanel } from '../components/MTFPanel'
import { PendingOrdersCard } from '../components/PendingOrdersCard'
import { PriceCard } from '../components/PriceCard'
import { SignalCard } from '../components/SignalCard'
import { StrategiesPanel } from '../components/StrategiesPanel'
import { TickFeed } from '../components/TickFeed'
import { useMarketStore } from '../store/marketStore'

export function AnalysisView() {
  const { analysis } = useMarketStore()

  const sigType = analysis?.signal.type ?? 'WAIT'
  const signalWeak = !analysis || sigType === 'NEUTRAL' || sigType === 'WAIT' || analysis.signal.confidence < 70

  return (
    <div className="space-y-4">
      <DecisionBanner />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3"><PriceCard /></div>
        <div className="lg:col-span-2"><SignalCard /></div>
      </div>

      {signalWeak && <PendingOrdersCard />}

      <FVGPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarketContextCard />
        <ConfirmationCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StrategiesPanel />
        <MTFPanel />
      </div>

      <TickFeed />
    </div>
  )
}

