/**
 * Bannière de décision principale — visible immédiatement.
 * Message clair : ACHETEZ / VENDEZ / NE RIEN FAIRE
 *
 * 5 états :
 *  1. WAIT            — collecte de données en cours
 *  2. INSTABLE        — volatilité extrême
 *  3. NEUTRE          — pas de signal clair
 *  4. BUY/SELL EN FORMATION — signal détecté mais 0/3 bougies confirmées
 *  5. BUY/SELL CONFIRMÉ    — signal confirmé, entrée possible
 */
import { useMarketStore } from '../store/marketStore'
import { IconArrowDown, IconArrowUp, IconStar } from './Icon'

// ─────────────────────────────────────────────────────────────
// Sous-composant : Buy Limit / Sell Limit
// ─────────────────────────────────────────────────────────────
function LimitOrderCard({
  pa,
  isBuy,
  currentPrice,
}: {
  pa: any
  isBuy: boolean
  currentPrice: number
}) {
  if (!pa?.limit_price) return null

  const color       = isBuy ? 'text-green-400' : 'text-red-400'
  const bg          = isBuy ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
  const orderType   = isBuy ? 'Buy Limit' : 'Sell Limit'
  const distPct     = Math.abs((pa.limit_price - currentPrice) / currentPrice * 100).toFixed(3)
  const isConfirmed = pa.confirmed

  return (
    <div className={`mt-3 rounded-xl border p-4 ${isConfirmed ? (isBuy ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50') : bg}`}>
      {/* Titre */}
      <div className="flex items-center justify-between mb-2">
        <p className={`text-sm font-bold ${isConfirmed ? color : 'text-gray-300'}`}>
          {isConfirmed ? `${orderType} confirmé` : `${orderType} suggéré`}
        </p>
        {pa.score > 0 && (
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
            Score : {pa.score}/100
          </span>
        )}
      </div>

      {/* Prix limite principal */}
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <p className="text-gray-500 text-xs mb-0.5">{orderType} MT5</p>
          <p className={`font-mono font-black text-2xl ${color}`}>
            {pa.limit_price.toFixed(4)}
          </p>
          <p className="text-gray-500 text-xs">{pa.limit_label}</p>
        </div>

        {pa.sl_price && (
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Stop Loss</p>
            <p className="text-red-400 font-mono font-bold text-lg">
              {pa.sl_price.toFixed(4)}
            </p>
          </div>
        )}

        <div>
          <p className="text-gray-500 text-xs mb-0.5">Distance</p>
          <p className="text-white font-mono">{distPct}%</p>
        </div>
      </div>

      {/* Pattern détecté */}
      {pa.pattern && (
        <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${
          pa.pattern.strength === 'strong' ? (isBuy ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300')
          : 'bg-gray-700 text-gray-300'
        }`}>
          <IconStar size={14} />
          <span>{pa.pattern_label}</span>
        </div>
      )}

      {/* Rationale */}
      <p className="text-gray-400 text-xs mt-2 leading-relaxed">{pa.rationale}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Sous-composant réutilisable : grille prix + mise + TP + SL
// ─────────────────────────────────────────────────────────────
function PriceGrid({
  price,
  stake,
  pos,
  baseAmount,
}: {
  price: number
  stake: any
  pos: any
  baseAmount: number
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
      <div className="rounded-xl p-3 border border-white/10 bg-white/[0.03]">
        <p className="text-zinc-400 text-xs mb-0.5">Prix actuel</p>
        <p className="text-white font-mono font-bold text-lg">{price.toFixed(4)}</p>
      </div>
      <div className="rounded-xl p-3 border border-white/10 bg-white/[0.03]">
        <p className="text-zinc-400 text-xs mb-0.5">Mise suggérée</p>
        <p className="text-white font-mono font-bold text-lg">
          {stake?.enter_now ? `${stake.amount.toFixed(2)}$` : '—'}
        </p>
        {(stake?.pct_of_capital ?? 0) > 0 && (
          <p className="text-zinc-500 text-xs">{stake.pct_of_capital}% de {baseAmount}$</p>
        )}
      </div>
      {pos && (
        <>
          <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-3">
            <p className="text-green-400 text-xs mb-0.5">Take Profit</p>
            <p className="text-green-400 font-mono font-bold text-lg">{pos.take_profit.toFixed(4)}</p>
            <p className="text-green-500/60 text-xs">+{pos.tp_pips.toFixed(1)} pips</p>
          </div>
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-xs mb-0.5">Stop Loss</p>
            <p className="text-red-400 font-mono font-bold text-lg">{pos.stop_loss.toFixed(4)}</p>
            <p className="text-red-500/60 text-xs">-{pos.sl_pips.toFixed(1)} pips</p>
          </div>
        </>
      )}
    </div>
  )
}

// Sous-composant FVG inline
function FVGInfo({ analysis, price, isBuy }: { analysis: any; price: number; isBuy: boolean }) {
  const nearestFvg = analysis?.nearest_fvg_entry
  if (!nearestFvg) return null
  const dist = Math.abs(nearestFvg.midpoint - price) / price * 100
  const insideZone = price >= nearestFvg.bottom && price <= nearestFvg.top
  const accentBuy = isBuy ? 'text-green-400/80' : 'text-red-400/80'
  const bgActive  = isBuy ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'
  return (
    <div className={`mt-3 rounded-xl p-3 border ${insideZone ? 'bg-purple-500/15 border-purple-500/40' : bgActive}`}>
      <p className={`text-xs font-bold mb-1.5 ${insideZone ? 'text-purple-400' : accentBuy}`}>
        {insideZone
          ? 'PRIX DANS LE FVG — Entrée optimale maintenant'
          : `FVG ${isBuy ? 'haussier' : 'baissier'} de référence`}
      </p>
      <div className="flex gap-4 flex-wrap text-xs">
        <span className="text-gray-400">
          Zone : <span className="text-white font-mono">{nearestFvg.bottom.toFixed(4)}–{nearestFvg.top.toFixed(4)}</span>
        </span>
        <span className="text-gray-400">
          Entrée idéale :{' '}
          <span className={`font-mono font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
            {nearestFvg.midpoint.toFixed(4)}
          </span>
        </span>
        <span className="text-gray-400">
          Distance : <span className="text-white font-mono">{dist.toFixed(3)}%</span>
        </span>
        <span className="text-gray-400">
          Force : <span className="text-white capitalize">{nearestFvg.strength}</span>
        </span>
      </div>
      {!insideZone && dist > 0.1 && (
        <p className="text-gray-500 text-xs mt-1">
          Attendre que le prix {isBuy ? 'recule' : 'remonte'} vers {nearestFvg.midpoint.toFixed(4)} pour une meilleure entrée.
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────
export function DecisionBanner() {
  const { analysis, currentTick, baseAmount } = useMarketStore()

  const sig            = analysis?.signal
  const stability      = analysis?.signal_stability
  const pos            = analysis?.position
  const stake          = analysis?.stake
  const pending        = analysis?.pending_orders ?? []
  const regime         = analysis?.volatility
  const ctx            = (analysis as any)?.context
  const confirmationOk = analysis?.confirmation_ok ?? false
  const pa             = analysis?.price_action ?? null
  const price          = currentTick?.price

  // ── 1. WAIT — données insuffisantes ──
  if (!sig || sig.type === 'WAIT' || !price) {
    return (
      <div className="surface-solid p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-cyan-400/70 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <p className="text-gray-300 font-bold text-lg">Collecte des données...</p>
            <p className="text-gray-500 text-sm">
              {stability ? `${stability.tick_count}/30 ticks reçus` : 'Connexion en cours'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── 2. MARCHÉ INSTABLE ──
  if (regime?.regime === 'unstable') {
    return (
      <div className="surface p-5 bg-red-500/5 ring-1 ring-red-500/25">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
            <span className="text-2xl font-black text-red-200">!</span>
          </div>
          <div className="flex-1">
            <p className="text-red-400 font-black text-2xl tracking-wide">NE RIEN FAIRE</p>
            <p className="text-red-300 font-semibold text-sm mt-0.5">Marché instable — volatilité trop élevée</p>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              {ctx?.phase_label ?? 'Conditions défavorables'}. Attendez que la volatilité redescende avant d'entrer.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── 3. NEUTRAL / confiance faible ──
  if (sig.type === 'NEUTRAL' || sig.confidence < 60) {
    const bestPending = pending.find((p: any) => p.estimated_confidence >= 70)
    const nearestFvg  = analysis?.nearest_fvg_entry
    return (
      <div className="surface p-5 bg-amber-500/5 ring-1 ring-amber-500/20">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <div className="w-5 h-5 border-2 border-amber-300/70 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-yellow-400 font-black text-2xl tracking-wide">NE RIEN FAIRE POUR L'INSTANT</p>
            <p className="text-yellow-300 text-sm mt-0.5">{sig.why || 'Signal insuffisant — attendre confirmation'}</p>

            {nearestFvg && (
              <div className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
                <p className="text-purple-300 text-xs font-bold mb-2">Attendez ce FVG pour entrer</p>
                <div className="flex items-center gap-4 flex-wrap text-sm">
                  <span className="text-gray-400 text-xs">
                    Direction :{' '}
                    <span className={`font-bold inline-flex items-center gap-1.5 ${nearestFvg.direction === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                      {nearestFvg.direction === 'bullish' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}
                      <span>{nearestFvg.direction === 'bullish' ? 'BUY' : 'SELL'}</span>
                    </span>
                  </span>
                  <span className="text-gray-400 text-xs">
                    Entrée : <span className="text-white font-mono font-bold">{nearestFvg.midpoint.toFixed(4)}</span>
                  </span>
                  <span className="text-gray-400 text-xs">
                    Zone : <span className="text-gray-300 font-mono">{nearestFvg.bottom.toFixed(4)}–{nearestFvg.top.toFixed(4)}</span>
                  </span>
                  <span className="text-gray-400 text-xs">
                    Force : <span className="text-white font-semibold capitalize">{nearestFvg.strength}</span>
                  </span>
                </div>
              </div>
            )}

            {bestPending && !nearestFvg && (
              <div className="mt-3 bg-gray-800/60 border border-yellow-500/20 rounded-xl p-3">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">
                  Prix cible à surveiller
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xl font-mono font-bold ${bestPending.direction === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {bestPending.target_price.toFixed(4)}
                  </span>
                  <span className="text-gray-400 text-xs">
                    Confiance : <span className="text-white font-bold">{bestPending.estimated_confidence}%</span>
                  </span>
                  <span className="text-gray-400 text-xs">
                    Distance : <span className="text-white font-mono">{bestPending.distance_pct.toFixed(3)}%</span>
                  </span>
                </div>
                {bestPending.proximity_alert && (
                  <p className="text-amber-300 text-xs font-bold mt-1 animate-pulse">Le prix s'approche</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 4 + 5 : BUY ──
  if (sig.type === 'BUY') {
    // 4. BUY EN FORMATION
    if (!confirmationOk) {
      return (
        <div className="surface p-5 bg-cyan-500/5 ring-1 ring-cyan-500/20">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <div className="w-5 h-5 border-2 border-cyan-300/70 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <p className="text-blue-300 font-black text-2xl tracking-wide">SIGNAL BUY EN FORMATION</p>
                <span className="bg-blue-500/20 border border-blue-500/40 text-blue-300 text-sm font-bold px-2.5 py-0.5 rounded-full">
                  {sig.confidence}% — pas encore confirmé
                </span>
              </div>
              <p className="text-gray-300 text-sm mt-2 leading-relaxed">{sig.why}</p>

              {/* Buy Limit — prix où placer l'ordre dans MT5 */}
              <LimitOrderCard pa={pa} isBuy={true} currentPrice={price} />

              {!pa?.limit_price && (
                <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                  <p className="text-blue-300 text-sm font-semibold">
                    Attendre un pattern de confirmation sur M5 (Engulfing, Pinbar, Marubozu).
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    La bannière passera au vert dès qu'un pattern fort est détecté sur un niveau clé.
                  </p>
                </div>
              )}

              {sig.reasons.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {sig.reasons.map((r: string, i: number) => (
                    <span key={i} className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    // 5. BUY CONFIRMÉ
    return (
      <div className="surface p-5 bg-emerald-500/5 ring-1 ring-emerald-500/25 shadow-[0_18px_50px_rgba(16,185,129,0.08)]">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
            <span className="text-green-300">
              <IconArrowUp size={30} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <p className="text-green-400 font-black text-2xl tracking-wide">VOUS POUVEZ ACHETER</p>
              <span className="bg-green-500/20 border border-green-500/40 text-green-300 text-sm font-bold px-2.5 py-0.5 rounded-full">
                {sig.confidence}% confiance
              </span>
              {stability?.locked && stability?.remaining_label && (
                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                  Signal stable {stability.remaining_label}
                </span>
              )}
            </div>
            <PriceGrid price={price} stake={stake} pos={pos} baseAmount={baseAmount} />
            <p className="text-gray-300 text-sm mt-3 leading-relaxed">{sig.why}</p>
            <FVGInfo analysis={analysis} price={price} isBuy={true} />
            {sig.reasons.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {sig.reasons.map((r: string, i: number) => (
                  <span key={i} className="bg-green-500/10 border border-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 4 + 5 : SELL ──

  // 4. SELL EN FORMATION
  if (!confirmationOk) {
    return (
      <div className="surface p-5 bg-orange-500/5 ring-1 ring-orange-500/20">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <div className="w-5 h-5 border-2 border-orange-300/70 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <p className="text-orange-300 font-black text-2xl tracking-wide">SIGNAL SELL EN FORMATION</p>
              <span className="bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-bold px-2.5 py-0.5 rounded-full">
                {sig.confidence}% — pas encore confirmé
              </span>
            </div>
            <p className="text-gray-300 text-sm mt-2 leading-relaxed">{sig.why}</p>

            {/* Sell Limit — prix où placer l'ordre dans MT5 */}
            <LimitOrderCard pa={pa} isBuy={false} currentPrice={price} />

            {!pa?.limit_price && (
              <div className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
                <p className="text-orange-300 text-sm font-semibold">
                  Attendre un pattern de confirmation sur M5 (Engulfing, Pinbar, Marubozu).
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  La bannière passera au rouge dès qu'un pattern fort est détecté sur un niveau clé.
                </p>
              </div>
            )}

            {sig.reasons.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {sig.reasons.map((r: string, i: number) => (
                  <span key={i} className="bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs px-2 py-0.5 rounded-full">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 5. SELL CONFIRMÉ
  return (
    <div className="surface p-5 bg-red-500/5 ring-1 ring-red-500/25 shadow-[0_18px_50px_rgba(239,68,68,0.08)]">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
          <span className="text-red-300">
            <IconArrowDown size={30} />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <p className="text-red-400 font-black text-2xl tracking-wide">VOUS POUVEZ VENDRE</p>
            <span className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-bold px-2.5 py-0.5 rounded-full">
              {sig.confidence}% confiance
            </span>
            {stability?.locked && stability?.remaining_label && (
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                Signal stable {stability.remaining_label}
              </span>
            )}
          </div>
          <PriceGrid price={price} stake={stake} pos={pos} baseAmount={baseAmount} />
          <p className="text-gray-300 text-sm mt-3 leading-relaxed">{sig.why}</p>
          <FVGInfo analysis={analysis} price={price} isBuy={false} />
          {sig.reasons.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {sig.reasons.map((r: string, i: number) => (
                <span key={i} className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
