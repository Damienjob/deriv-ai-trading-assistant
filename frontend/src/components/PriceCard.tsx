/**
 * Carte principale affichant le prix actuel, la tendance et les stats.
 */

import type { ComponentType } from 'react'
import { useMarketStore } from '../store/marketStore'
import { IconArrowDown, IconArrowUp, IconArrowsLeftRight } from './Icon'

const SYMBOL_LABELS: Record<string, string> = {
  R_10:     'Volatility 10 Index',
  R_25:     'Volatility 25 Index',
  R_50:     'Volatility 50 Index',
  R_75:     'Volatility 75 Index',
  R_100:    'Volatility 100 Index',
  '1HZ10V':  'Volatility 10 (1s) Index',
  '1HZ25V':  'Volatility 25 (1s) Index',
  '1HZ50V':  'Volatility 50 (1s) Index',
  '1HZ75V':  'Volatility 75 (1s) Index',
  '1HZ100V': 'Volatility 100 (1s) Index',
}

export function PriceCard() {
  const { currentTick, ticks, currentSymbol, analysis } = useMarketStore()

  const tfM15 = analysis?.timeframes?.['15min'] ?? analysis?.timeframes?.['5min']
  const trend = tfM15?.trend
  const trendConfig: Record<string, { color: string; Icon: ComponentType<any> }> = {
    up:      { color: 'text-emerald-300', Icon: IconArrowUp },
    down:    { color: 'text-red-300',     Icon: IconArrowDown },
    neutral: { color: 'text-amber-300',   Icon: IconArrowsLeftRight },
  }
  const tc = trendConfig[trend?.direction ?? 'neutral']

  // Variation depuis le premier tick de la session
  const variation = (() => {
    if (ticks.length < 2 || !currentTick) return null
    const first = ticks[0].price
    const diff = currentTick.price - first
    const pct = (diff / first) * 100
    return { diff, pct }
  })()

  const lastTimestamp = currentTick
    ? new Date(currentTick.timestamp * 1000).toLocaleTimeString('fr-FR')
    : '--'

  return (
    <div className="surface-solid p-6">
      {/* En-tête */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-white font-bold text-xl">
            {SYMBOL_LABELS[currentSymbol] ?? currentSymbol}
          </h2>
          <p className="text-zinc-400 text-sm mt-0.5">Indice synthétique</p>
        </div>
        <span className="chip chip-accent">Live</span>
      </div>

      {/* Prix + variation */}
      <div className="flex items-end gap-4 my-4">
        <div>
          <p className="text-zinc-400 text-sm mb-1">Prix actuel</p>
          <p className="text-white text-5xl font-mono font-bold tracking-tight">
            {currentTick ? currentTick.price.toFixed(4) : '----.----'}
          </p>
        </div>
        {variation && (
          <div className="mb-1">
            <p className={`font-mono font-semibold text-lg ${variation.diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {variation.diff >= 0 ? '+' : ''}{variation.diff.toFixed(4)}
            </p>
            <p className={`font-mono text-sm ${variation.diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {variation.diff >= 0 ? '+' : ''}{variation.pct.toFixed(3)}%
            </p>
          </div>
        )}
      </div>

      {/* Stats bas */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
        <div>
          <p className="text-zinc-400 text-xs mb-1">Tendance</p>
          <p className={`font-semibold ${tc.color}`}>
            <span className="inline-flex items-center gap-1.5">
              <tc.Icon size={16} />
              <span>{trend?.label ?? 'Neutre'}</span>
            </span>
            {trend?.strength ? ` — ${trend.strength}%` : ''}
          </p>
        </div>
        <div className="text-center">
          <p className="text-zinc-400 text-xs mb-1">Dernier tick</p>
          <p className="text-zinc-300 font-mono text-sm">{lastTimestamp}</p>
        </div>
        <div className="text-right">
          <p className="text-zinc-400 text-xs mb-1">Ticks reçus</p>
          <p className="text-white font-bold text-lg">{ticks.length}</p>
        </div>
      </div>
    </div>
  )
}
