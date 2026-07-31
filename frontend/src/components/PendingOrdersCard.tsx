/**
 * Carte "Ordres en attente" — prix cibles avec ≥70% confiance.
 * Affiché quand le signal actuel est incertain ou < 70%.
 */
import { useMarketStore, type PendingOrder } from '../store/marketStore'
import { IconArrowDown, IconArrowUp, IconBell, IconCheck, IconClock, IconPin } from './Icon'

const DIR_CONFIG = {
  BUY:  { color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  SELL: { color: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/25' },
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 70 ? 'bg-yellow-500' : 'bg-gray-600'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-bold ${value >= 70 ? 'text-white' : 'text-gray-500'}`}>
        {value}%
      </span>
    </div>
  )
}

function OrderRow({ order }: { order: PendingOrder }) {
  const dir = DIR_CONFIG[order.direction as keyof typeof DIR_CONFIG] ?? DIR_CONFIG.BUY
  const iconColor =
    order.level_type === 'support' ? 'text-emerald-300' :
    order.level_type === 'resistance' ? 'text-red-300' :
    'text-zinc-300'

  return (
    <div className={`rounded-xl border p-4 ${
      order.proximity_alert
        ? 'border-yellow-500/50 bg-yellow-500/5 ring-1 ring-yellow-500/20'
        : `${dir.border} ${dir.bg}`
    }`}>

      {/* En-tête */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={iconColor}>
            <IconPin size={16} />
          </span>
          <span className="text-white text-sm font-semibold">{order.level_label}</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${dir.bg} ${dir.color} border ${dir.border}`}>
            <span className="inline-flex items-center gap-1.5">
              {order.direction === 'BUY'
                ? <IconArrowUp size={14} />
                : <IconArrowDown size={14} />}
              <span>{order.direction}</span>
            </span>
          </span>
        </div>
        {order.proximity_alert && (
          <span className="text-yellow-300 text-xs font-bold animate-pulse flex items-center gap-1.5">
            <IconBell size={14} />
            Proche
          </span>
        )}
      </div>

      {/* Prix cible */}
      <div className="flex items-end gap-3 mb-2">
        <div>
          <p className="text-green-400 text-xs mb-1">Prix cible</p>
          <p className={`text-2xl font-mono font-bold ${dir.color}`}>
            {order.target_price.toFixed(4)}
          </p>
        </div>
        <div className="mb-1">
          <p className="text-gray-500 text-xs">Distance</p>
          <p className="text-gray-300 text-sm font-mono">
            <span className="inline-flex items-center gap-1">
              {order.direction === 'BUY' ? <IconArrowDown size={14} /> : <IconArrowUp size={14} />}
              <span>{order.distance_pct.toFixed(3)}%</span>
            </span>
            <span className="text-gray-500 ml-1">({order.distance_abs.toFixed(4)})</span>
          </p>
        </div>
      </div>

      {/* Barre de confiance */}
      <div className="mb-3">
        <p className="text-gray-400 text-xs mb-1">Confiance estimée à ce niveau</p>
        <ConfidenceBar value={order.estimated_confidence} />
      </div>

      {/* Conditions remplies */}
      {order.conditions_at_target.length > 0 && (
        <div className="mb-3">
          <p className="text-gray-500 text-xs font-semibold mb-1">Conditions à ce niveau :</p>
          <ul className="space-y-0.5">
            {order.conditions_at_target.map((c, i) => (
              <li key={i} className={`text-xs flex gap-1.5 ${dir.color}`}>
                <span className="shrink-0">
                  <IconCheck size={14} />
                </span>
                <span className="text-gray-300">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Explication */}
      <p className="text-gray-400 text-xs leading-relaxed bg-gray-900/40 rounded-lg px-3 py-2">
        {order.rationale}
      </p>
    </div>
  )
}

export function PendingOrdersCard() {
  const { analysis } = useMarketStore()
  const orders = analysis?.pending_orders ?? []
  const signal = analysis?.signal

  // Afficher uniquement si signal incertain
  const shouldShow = (
    !signal ||
    signal.type === 'NEUTRAL' ||
    signal.type === 'WAIT' ||
    signal.confidence < 70
  )

  if (!shouldShow || orders.length === 0) {
    if (!shouldShow) return null  // signal fort → pas besoin d'ordres en attente
    return (
      <div className="surface p-5">
        <h3 className="text-zinc-200 font-semibold text-sm mb-2 flex items-center gap-2">
          <IconClock size={16} />
          Ordres en attente
        </h3>
        <p className="text-zinc-500 text-sm text-center py-4">
          Calcul des niveaux optimaux en cours...
        </p>
      </div>
    )
  }

  const hasProximity = orders.some(o => o.proximity_alert)

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm">
            Attendre — Prix cibles recommandés
          </h3>
          <p className="text-zinc-400 text-xs mt-0.5">
            Signal actuel &lt; 70% — entrez seulement à ces niveaux
          </p>
        </div>
        {hasProximity && (
          <span className="text-yellow-300 text-xs font-bold bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1 rounded-full animate-pulse">
            <span className="inline-flex items-center gap-1.5">
              <IconBell size={14} />
              Niveau proche
            </span>
          </span>
        )}
      </div>

      <div className="space-y-3">
        {orders.map((order, i) => (
          <OrderRow key={i} order={order} />
        ))}
      </div>

      <p className="text-zinc-500 text-xs mt-4 pt-3 border-t border-white/10">
        Ces niveaux sont calculés à partir des supports, résistances, Fibonacci et Bollinger Bands.
        L'alerte s'active quand le prix est à moins de 0.3% du niveau.
      </p>
    </div>
  )
}
