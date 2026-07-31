/**
 * Liste défilante des derniers ticks reçus.
 */

import { useMarketStore } from '../store/marketStore'
import { IconArrowDown, IconArrowUp } from './Icon'

export function TickFeed() {
  const { ticks } = useMarketStore()

  const recent = [...ticks].reverse().slice(0, 12)

  return (
    <div className="surface p-4">
      <h3 className="text-zinc-200 font-semibold text-sm mb-3">Flux de prix</h3>

      {recent.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          En attente des ticks...
        </p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {recent.map((tick, i) => {
            const prev = recent[i + 1]
            const isUp = prev ? tick.price >= prev.price : true
            const time = new Date(tick.timestamp * 1000).toLocaleTimeString('fr-FR')

            return (
              <div
                key={`${tick.timestamp}-${i}`}
                className={`flex justify-between items-center py-1.5 px-3 rounded-lg text-sm ${
                  i === 0 ? 'bg-gray-700/80' : 'bg-gray-700/30'
                }`}
              >
                <span className="text-gray-400 font-mono text-xs">{time}</span>
                <span
                  className={`font-mono font-semibold ${
                    isUp ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {isUp ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}
                    <span>{tick.price.toFixed(4)}</span>
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
