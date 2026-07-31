/**
 * Carte "Ordres en attente" — style maquette premium.
 */
import { useMarketStore, type PendingOrder } from '../store/marketStore'
import { IconArrowDown, IconArrowUp, IconBell, IconCheck, IconClock, IconPin } from './Icon'

function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const color = value >= 85 ? '#4edea3' : value >= 70 ? '#fbbf24' : '#6b7280'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: '#3c4a42' }}>
          {label}
        </p>
        <span className="font-mono font-bold text-sm" style={{ color }}>{value}%</span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}, ${color}66)`, transition: 'width 0.6s ease' }}
        />
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: PendingOrder }) {
  const isBuy      = order.direction === 'BUY'
  const dirColor   = isBuy ? '#4edea3' : '#f87171'
  const dirBg      = isBuy ? 'rgba(78,222,163,0.15)'  : 'rgba(239,68,68,0.15)'
  const dirBorder  = isBuy ? 'rgba(78,222,163,0.35)'  : 'rgba(239,68,68,0.35)'
  const cardBorder = order.proximity_alert ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.08)'

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: '#161b22', border: `1px solid ${cardBorder}` }}>

      {/* ── Row 1 : header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span style={{ color: dirColor }}><IconPin size={15} /></span>
          <span className="text-zinc-100 font-bold text-sm">{order.level_label}</span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black"
            style={{ background: dirBg, color: dirColor, border: `1px solid ${dirBorder}` }}
          >
            {isBuy ? <IconArrowUp size={11} /> : <IconArrowDown size={11} />}
            {order.direction}
          </span>
        </div>
        {order.proximity_alert ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold animate-pulse"
            style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
          >
            <IconBell size={12} />
            Proche
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]" style={{ color: '#3c4a42', border: '1px solid rgba(255,255,255,0.06)' }}>
            <IconBell size={12} />
            En attente
          </span>
        )}
      </div>

      {/* ── Row 2 : prix + distance | barre confiance ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        {/* Gauche */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1" style={{ color: '#3c4a42' }}>Prix cible</p>
          <p className="font-mono font-black leading-none mb-3" style={{ fontSize: 'clamp(22px,5vw,32px)', color: dirColor }}>
            {order.target_price.toFixed(4)}
          </p>
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-0.5" style={{ color: '#3c4a42' }}>Distance</p>
          <p className="font-mono text-sm text-zinc-300 flex items-center gap-1.5 flex-wrap">
            <span style={{ color: dirColor }}>
              {isBuy ? <IconArrowDown size={13} /> : <IconArrowUp size={13} />}
            </span>
            <span className="font-semibold" style={{ color: dirColor }}>{order.distance_pct.toFixed(3)}%</span>
            <span className="text-zinc-600">({order.distance_abs.toFixed(4)})</span>
          </p>
        </div>
        {/* Droite : barre confiance */}
        <div className="pt-1">
          <ConfidenceBar
            value={order.estimated_confidence}
            label={order.proximity_alert ? 'CONFIANCE ESTIMÉE À CE NIVEAU' : 'CONFIANCE ESTIMÉE'}
          />
        </div>
      </div>

      {/* ── Row 3 : conditions | rationale ── */}
      {(order.conditions_at_target.length > 0 || order.rationale) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/[0.05]">

          {/* Conditions */}
          {order.conditions_at_target.length > 0 && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-2" style={{ color: '#3c4a42' }}>
                Conditions à ce niveau :
              </p>
              <ul className="space-y-1.5">
                {order.conditions_at_target.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5" style={{ color: dirColor }}><IconCheck size={13} /></span>
                    <span className="text-zinc-300 text-xs leading-snug">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rationale */}
          {order.rationale && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-2"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="text-zinc-600 shrink-0 mt-0.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <p className="text-zinc-400 text-xs leading-relaxed italic">{order.rationale}</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export function PendingOrdersCard() {
  const { analysis } = useMarketStore()
  const orders = analysis?.pending_orders ?? []
  const signal = analysis?.signal

  const shouldShow = !signal || signal.type === 'NEUTRAL' || signal.type === 'WAIT' || signal.confidence < 70
  if (!shouldShow) return null

  const hasProximity = orders.some(o => o.proximity_alert)

  if (orders.length === 0) {
    return (
      <div className="surface-solid px-5 py-4 flex items-center gap-3 text-zinc-500">
        <IconClock size={15} />
        <p className="text-sm">Calcul des niveaux optimaux en cours...</p>
      </div>
    )
  }

  return (
    <div className="surface-solid overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-bold text-base sm:text-lg leading-tight">
            Attendre — Prix cibles recommandés
          </h3>
          <p className="text-zinc-500 text-xs mt-1 flex items-center gap-1.5 flex-wrap">
            <span style={{ color: '#4edea3' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
            </span>
            Signal actuel &lt;&nbsp;
            <span className="text-amber-400 font-bold">70%</span>
            &nbsp;— entrez seulement à ces niveaux de précision.
          </p>
        </div>
        {hasProximity && (
          <span
            className="self-start sm:shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold animate-pulse"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
          >
            <IconBell size={13} />
            Niveau proche détecté
          </span>
        )}
      </div>

      {/* ── Cards ── */}
      <div className="p-5 space-y-4">
        {orders.map((order, i) => (
          <OrderCard key={i} order={order} />
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-3 border-t border-white/[0.06] text-center">
        <p className="text-zinc-500 text-[12px]">
          Ces niveaux sont calculés à partir des supports, résistances, Fibonacci et Bollinger Bands.
          L'alerte s'active quand le prix est à moins de{' '}
          <span className="text-emerald-400 font-bold">0.3%</span>{' '}
          du niveau cible.
        </p>
      </div>

    </div>
  )
}
