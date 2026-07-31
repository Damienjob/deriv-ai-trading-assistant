import type { ComponentType } from 'react'
import { useMarketStore } from '../store/marketStore'
import { IconArrowDown, IconArrowUp, IconArrowsLeftRight, IconClock, IconLock, IconRefresh } from './Icon'

const SIGNAL_CONFIG = {
  BUY: {
    color: 'text-emerald-300', bg: 'bg-emerald-500/[0.06]',
    border: 'border-emerald-500/20', accent: 'bg-emerald-500/15 border-emerald-500/25',
    chip: 'chip-success', Icon: IconArrowUp,
    glow: 'shadow-[0_0_40px_rgba(16,185,129,0.07)]',
  },
  SELL: {
    color: 'text-red-400', bg: 'bg-red-500/[0.06]',
    border: 'border-red-500/20', accent: 'bg-red-500/15 border-red-500/25',
    chip: 'chip-danger', Icon: IconArrowDown,
    glow: 'shadow-[0_0_40px_rgba(239,68,68,0.07)]',
  },
  NEUTRAL: {
    color: 'text-amber-300', bg: 'bg-amber-500/[0.04]',
    border: 'border-amber-500/15', accent: 'bg-amber-500/10 border-amber-500/20',
    chip: 'chip-warning', Icon: IconArrowsLeftRight,
    glow: '',
  },
  WAIT: {
    color: 'text-zinc-400', bg: '',
    border: 'border-white/[0.07]', accent: 'bg-white/[0.04] border-white/[0.07]',
    chip: '', Icon: IconClock,
    glow: '',
  },
} satisfies Record<string, { color: string; bg: string; border: string; accent: string; chip: string; Icon: ComponentType<any>; glow: string }>

function CountdownBar({ remaining, total }: { remaining: number; total: number }) {
  const pct   = total > 0 ? Math.max(0, (remaining / total) * 100) : 0
  const color = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full bg-white/[0.06] rounded-full h-1">
      <div className={`h-1 rounded-full transition-all duration-1000 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function SignalCard() {
  const { analysis, baseAmount } = useMarketStore()

  const sigType   = (analysis?.signal.type ?? 'WAIT') as keyof typeof SIGNAL_CONFIG
  const cfg       = SIGNAL_CONFIG[sigType]
  const signal    = analysis?.signal
  const stake     = analysis?.stake
  const regime    = analysis?.volatility
  const stability = analysis?.signal_stability

  const isLocked       = stability?.locked ?? false
  const remaining      = stability?.remaining_seconds ?? 0
  const remainingLabel = stability?.remaining_label ?? ''
  const LOCK_TOTAL     = (sigType === 'BUY' || sigType === 'SELL')
    ? ((analysis?.signal.confidence ?? 0) >= 80 ? 300 : 180) : 0

  const regimeColor =
    regime?.regime === 'unstable' ? 'text-red-400' :
    regime?.regime === 'calm'     ? 'text-emerald-400' : 'text-amber-400'

  return (
    <div className={`surface flex flex-col gap-0 h-full overflow-hidden ${cfg.bg} ${cfg.glow}`}
         style={{ borderColor: cfg.border.replace('border-','') }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <p className="section-label">Signal MTF</p>
          {(isLocked && sigType !== 'WAIT' && sigType !== 'NEUTRAL') ? (
            <span className="chip chip-success">
              <IconLock size={11} className="opacity-90" />
              Verrouillé
            </span>
          ) : (
            <span className="chip chip-accent animate-pulse">
              <IconRefresh size={11} className="opacity-90" />
              Analyse
            </span>
          )}
        </div>
        {signal && signal.confidence > 0 && (
          <span className={`chip ${cfg.chip}`}>{signal.confidence}%</span>
        )}
      </div>

      <div className="flex flex-col gap-4 px-5 py-4 flex-1">

        {/* ── Signal label + régime ── */}
        <div>
          <p className={`font-black leading-none tracking-tight ${cfg.color}`}
             style={{ fontSize: 'clamp(1.5rem, 3vw, 1.875rem)' }}>
            <span className="inline-flex items-center gap-2.5">
              <cfg.Icon size={24} />
              <span>{signal?.label ?? 'Attente'}</span>
            </span>
          </p>
          {regime && (
            <p className={`text-xs mt-1.5 font-semibold ${regimeColor}`}>
              Marché : {regime.label}
            </p>
          )}
        </div>

        {/* ── Countdown ── */}
        {isLocked && remaining > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Signal valide encore</span>
              <span className="font-mono font-bold text-white">{remainingLabel}</span>
            </div>
            <CountdownBar remaining={remaining} total={LOCK_TOTAL} />
          </div>
        )}

        {/* ── Explication non-verrouillé ── */}
        {!isLocked && sigType !== 'WAIT' && (
          <div className="rounded-xl px-3 py-2.5 border border-cyan-500/20 bg-cyan-500/[0.07]">
            <p className="text-cyan-300 text-xs leading-relaxed">
              Signal en recalcul — se verrouille à la clôture de la bougie M5 (3–5 min).
            </p>
          </div>
        )}

        {/* ── Conseil entrée ── */}
        {signal?.advice && (
          <div className={`rounded-xl px-3 py-2.5 text-sm font-semibold border ${
            stake?.enter_now
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-white/[0.03] text-zinc-400 border-white/[0.07]'
          }`}>
            {signal.advice}
          </div>
        )}

        {/* ── Mise recommandée ── */}
        {stake && (
          <div className="stat-cell">
            <p className="stat-label mb-2">Gestion du risque</p>
            {stake.enter_now ? (
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-xl text-white">
                  {stake.amount.toFixed(2)}<span className="text-zinc-500 text-sm ml-1">$</span>
                </span>
                <span className="text-zinc-500 text-xs">
                  {stake.pct_of_capital}% / {baseAmount}$
                </span>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Ne pas entrer — 0$</p>
            )}
            {stake.reason && (
              <p className="text-zinc-600 text-[11px] mt-1 leading-relaxed">{stake.reason}</p>
            )}
          </div>
        )}

        {/* ── Pourquoi ── */}
        {signal?.why && (
          <div className="rounded-xl bg-black/20 border border-white/[0.06] px-3 py-2.5">
            <p className="section-label mb-1.5">Pourquoi ?</p>
            <p className="text-zinc-300 text-xs leading-relaxed">{signal.why}</p>
          </div>
        )}

        {/* ── Raisons ── */}
        {signal?.reasons && signal.reasons.length > 0 && (
          <ul className="space-y-1">
            {signal.reasons.map((r, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-2">
                <span className={`shrink-0 mt-0.5 ${cfg.color}`}>›</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}

      </div>

      {/* ── Footer disclaimer ── */}
      <div className="px-5 py-3 border-t border-white/[0.06]">
        <p className="text-[11px] text-zinc-600">Signal M5 · Indicatif uniquement</p>
      </div>

    </div>
  )
}
