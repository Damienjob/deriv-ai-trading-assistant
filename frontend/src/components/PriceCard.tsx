import type { ComponentType } from 'react'
import { useMarketStore } from '../store/marketStore'
import { IconArrowDown, IconArrowUp, IconArrowsLeftRight } from './Icon'

const SYMBOL_LABELS: Record<string, string> = {
  R_10:      'Volatility 10',
  R_25:      'Volatility 25',
  R_50:      'Volatility 50',
  R_75:      'Volatility 75',
  R_100:     'Volatility 100',
  '1HZ10V':  'Volatility 10 (1s)',
  '1HZ25V':  'Volatility 25 (1s)',
  '1HZ50V':  'Volatility 50 (1s)',
  '1HZ75V':  'Volatility 75 (1s)',
  '1HZ100V': 'Volatility 100 (1s)',
}

export function PriceCard() {
  const { currentTick, ticks, currentSymbol, analysis } = useMarketStore()

  const tfM15 = analysis?.timeframes?.['15min'] ?? analysis?.timeframes?.['5min']
  const trend = tfM15?.trend

  const trendConfig: Record<string, { color: string; bg: string; border: string; Icon: ComponentType<any> }> = {
    up:      { color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', Icon: IconArrowUp },
    down:    { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     Icon: IconArrowDown },
    neutral: { color: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   Icon: IconArrowsLeftRight },
  }
  const tc = trendConfig[trend?.direction ?? 'neutral']

  const variation = (() => {
    if (ticks.length < 2 || !currentTick) return null
    const first = ticks[0].price
    const diff  = currentTick.price - first
    const pct   = (diff / first) * 100
    return { diff, pct }
  })()

  const lastTimestamp = currentTick
    ? new Date(currentTick.timestamp * 1000).toLocaleTimeString('fr-FR')
    : '--'

  const isUp = (variation?.diff ?? 0) >= 0

  return (
    <div className="surface-solid overflow-hidden h-full">

      {/* ── Header bande colorée ── */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="section-label mb-1">Indice synthétique</p>
            <h2 className="text-white font-bold text-lg leading-tight truncate">
              {SYMBOL_LABELS[currentSymbol] ?? currentSymbol}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${tc.bg} ${tc.border} ${tc.color}`}>
              <tc.Icon size={11} />
              {trend?.label ?? 'Neutre'}
            </span>
            <span className="chip chip-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* ── Prix principal ── */}
      <div className="px-5 py-5">
        <p className="section-label mb-3">Prix actuel</p>
        <div className="flex items-end gap-4">
          <p className={`font-mono font-black tracking-tight leading-none transition-colors ${
            currentTick ? (isUp ? 'text-emerald-300' : 'text-red-400') : 'text-zinc-500'
          }`} style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
            {currentTick ? currentTick.price.toFixed(4) : '----.----'}
          </p>
          {variation && (
            <div className="mb-0.5">
              <p className={`font-mono font-bold text-base leading-none ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{variation.diff.toFixed(4)}
              </p>
              <p className={`font-mono text-xs mt-1 leading-none ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                {isUp ? '+' : ''}{variation.pct.toFixed(3)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-3">
        <div className="stat-cell">
          <p className="stat-label">Tendance</p>
          <p className={`font-semibold text-sm leading-none mt-1 flex items-center gap-1 ${tc.color}`}>
            <tc.Icon size={13} />
            {trend?.strength ? `${trend.strength}%` : '—'}
          </p>
        </div>
        <div className="stat-cell">
          <p className="stat-label">Dernier tick</p>
          <p className="stat-value text-sm mt-1">{lastTimestamp}</p>
        </div>
        <div className="stat-cell">
          <p className="stat-label">Ticks reçus</p>
          <p className="stat-value mt-1">{ticks.length.toLocaleString()}</p>
        </div>
      </div>

    </div>
  )
}
