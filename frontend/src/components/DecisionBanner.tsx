/**
 * Bannière de décision principale.
 * 5 états : WAIT · INSTABLE · NEUTRE · BUY/SELL EN FORMATION · BUY/SELL CONFIRMÉ
 */
import { useMarketStore } from '../store/marketStore'
import { IconArrowDown, IconArrowUp, IconStar } from './Icon'

// ── Grille prix / mise / TP / SL ──────────────────────────────────────────────
function PriceGrid({ price, stake, pos, baseAmount }: {
  price: number; stake: any; pos: any; baseAmount: number
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
      <div className="stat-cell">
        <p className="stat-label">Prix actuel</p>
        <p className="font-mono font-bold text-white text-base mt-1">{price.toFixed(4)}</p>
      </div>
      <div className="stat-cell">
        <p className="stat-label">Mise suggérée</p>
        <p className="font-mono font-bold text-white text-base mt-1">
          {stake?.enter_now ? `${stake.amount.toFixed(2)}$` : '—'}
        </p>
        {(stake?.pct_of_capital ?? 0) > 0 && (
          <p className="text-zinc-600 text-[11px] mt-0.5">{stake.pct_of_capital}% / {baseAmount}$</p>
        )}
      </div>
      {/* TP — depuis pos si disponible, sinon afficher — */}
      <div className={`rounded-xl p-3 ${
        pos ? 'bg-emerald-500/[0.07] border border-emerald-500/20' : 'stat-cell'
      }`}>
        <p className={`text-[11px] font-medium mb-1 ${
          pos ? 'text-emerald-500/80' : 'stat-label'
        }`}>Take Profit</p>
        {pos ? (
          <>
            <p className="font-mono font-bold text-emerald-300 text-base">{pos.take_profit.toFixed(4)}</p>
            <p className="text-emerald-600 text-[11px] mt-0.5">+{pos.tp_pips.toFixed(1)} pips</p>
          </>
        ) : (
          <p className="font-mono font-bold text-zinc-500 text-base">—</p>
        )}
      </div>
      {/* SL — depuis pos si disponible, sinon afficher — */}
      <div className={`rounded-xl p-3 ${
        pos ? 'bg-red-500/[0.07] border border-red-500/20' : 'stat-cell'
      }`}>
        <p className={`text-[11px] font-medium mb-1 ${
          pos ? 'text-red-500/80' : 'stat-label'
        }`}>Stop Loss</p>
        {pos ? (
          <>
            <p className="font-mono font-bold text-red-400 text-base">{pos.stop_loss.toFixed(4)}</p>
            <p className="text-red-600 text-[11px] mt-0.5">-{pos.sl_pips.toFixed(1)} pips</p>
          </>
        ) : (
          <p className="font-mono font-bold text-zinc-500 text-base">—</p>
        )}
      </div>
    </div>
  )
}

// ── FVG inline ────────────────────────────────────────────────────────────────
function FVGInfo({ analysis, price, isBuy }: { analysis: any; price: number; isBuy: boolean }) {
  const fvg = analysis?.nearest_fvg_entry
  if (!fvg) return null
  const dist      = Math.abs(fvg.midpoint - price) / price * 100
  const inside    = price >= fvg.bottom && price <= fvg.top
  const accentCol = inside ? 'text-purple-300' : (isBuy ? 'text-emerald-400/70' : 'text-red-400/70')
  const bgClass   = inside
    ? 'bg-purple-500/10 border-purple-500/30'
    : (isBuy ? 'bg-emerald-500/[0.07] border-emerald-500/20' : 'bg-red-500/[0.07] border-red-500/20')

  return (
    <div className={`mt-3 rounded-xl p-3 border ${bgClass}`}>
      <p className={`text-[11px] font-bold mb-2 ${accentCol}`}>
        {inside ? '✦ PRIX DANS LE FVG — Entrée optimale maintenant' : `FVG ${isBuy ? 'haussier' : 'baissier'} de référence`}
      </p>
      <div className="flex gap-4 flex-wrap text-xs text-zinc-500">
        <span>Zone : <span className="text-zinc-300 font-mono">{fvg.bottom.toFixed(4)}–{fvg.top.toFixed(4)}</span></span>
        <span>Idéal : <span className={`font-mono font-bold ${isBuy ? 'text-emerald-300' : 'text-red-300'}`}>{fvg.midpoint.toFixed(4)}</span></span>
        <span>Distance : <span className="text-zinc-300 font-mono">{dist.toFixed(3)}%</span></span>
        <span>Force : <span className="text-zinc-300 capitalize">{fvg.strength}</span></span>
      </div>
    </div>
  )
}

// ── Limit order card ──────────────────────────────────────────────────────────
function LimitOrderCard({ pa, isBuy, currentPrice }: { pa: any; isBuy: boolean; currentPrice: number }) {
  if (!pa?.limit_price) return null
  const color     = isBuy ? 'text-emerald-300' : 'text-red-400'
  const bg        = isBuy ? 'bg-emerald-500/[0.07] border-emerald-500/25' : 'bg-red-500/[0.07] border-red-500/25'
  const orderType = isBuy ? 'Buy Limit' : 'Sell Limit'
  const distPct   = Math.abs((pa.limit_price - currentPrice) / currentPrice * 100).toFixed(3)

  return (
    <div className={`mt-3 rounded-xl border p-4 ${pa.confirmed ? (isBuy ? 'bg-emerald-900/20 border-emerald-500/40' : 'bg-red-900/20 border-red-500/40') : bg}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-[11px] font-bold uppercase tracking-wide ${color}`}>
          {pa.confirmed ? `${orderType} confirmé` : `${orderType} suggéré`}
        </p>
        {pa.score > 0 && (
          <span className="text-[11px] bg-white/[0.06] text-zinc-400 px-2 py-0.5 rounded-full border border-white/[0.08]">
            Score {pa.score}/100
          </span>
        )}
      </div>
      <div className="flex items-end gap-5 flex-wrap">
        <div>
          <p className="text-zinc-600 text-[11px] mb-0.5">{orderType} MT5</p>
          <p className={`font-mono font-black text-2xl ${color}`}>{pa.limit_price.toFixed(4)}</p>
        </div>
        {pa.sl_price && (
          <div>
            <p className="text-zinc-600 text-[11px] mb-0.5">Stop Loss</p>
            <p className="text-red-400 font-mono font-bold text-lg">{pa.sl_price.toFixed(4)}</p>
          </div>
        )}
        <div>
          <p className="text-zinc-600 text-[11px] mb-0.5">Distance</p>
          <p className="text-zinc-300 font-mono">{distPct}%</p>
        </div>
      </div>
      {pa.pattern && (
        <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${
          pa.pattern.strength === 'strong'
            ? (isBuy ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300')
            : 'bg-white/[0.06] text-zinc-400'
        }`}>
          <IconStar size={12} />
          <span>{pa.pattern_label}</span>
        </div>
      )}
      {pa.rationale && <p className="text-zinc-500 text-xs mt-2 leading-relaxed">{pa.rationale}</p>}
    </div>
  )
}

// ── Raisons chips ─────────────────────────────────────────────────────────────
function ReasonsChips({ reasons, color }: { reasons: string[]; color: string }) {
  if (!reasons.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {reasons.map((r, i) => (
        <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full border bg-white/[0.04] border-white/[0.08] ${color}`}>
          {r}
        </span>
      ))}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Composant principal
// ═════════════════════════════════════════════════════════════════════════════
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

  // ── 1. WAIT ────────────────────────────────────────────────────────────────
  if (!sig || sig.type === 'WAIT' || !price) {
    return (
      <div className="surface-solid px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
            <div className="w-4 h-4 border-2 border-cyan-400/60 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <p className="text-zinc-200 font-semibold">Collecte des données en cours…</p>
            <p className="text-zinc-500 text-sm mt-0.5">
              {stability ? `${stability.tick_count} ticks reçus` : 'Connexion au serveur'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── 2. MARCHÉ INSTABLE ────────────────────────────────────────────────────
  if (regime?.regime === 'unstable') {
    return (
      <div className="surface overflow-hidden"
           style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}>
        <div className="flex items-stretch">
          {/* Barre latérale colorée */}
          <div className="w-1 shrink-0 bg-red-500/60 rounded-l-2xl" />
          <div className="flex items-start gap-4 p-5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-red-400">!</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <p className="text-red-400 font-black text-2xl tracking-tight leading-none">NE RIEN FAIRE</p>
                <span className="chip chip-danger">Marché instable</span>
              </div>
              <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                {ctx?.phase_label ?? 'Conditions défavorables'} — volatilité trop élevée. Attendez le retour au calme.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 3. NEUTRAL ────────────────────────────────────────────────────────────
  if (sig.type === 'NEUTRAL' || sig.confidence < 60) {
    const bestPending = pending.find((p: any) => p.estimated_confidence >= 70)
    const nearestFvg  = analysis?.nearest_fvg_entry
    return (
      <div className="surface overflow-hidden"
           style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.18)' }}>
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 bg-amber-500/50 rounded-l-2xl" />
          <div className="flex items-start gap-4 p-5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <div className="w-4 h-4 border-2 border-amber-400/70 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <p className="text-amber-300 font-black text-2xl tracking-tight leading-none">PATIENTER</p>
                <span className="chip chip-warning">Signal insuffisant</span>
              </div>
              <p className="text-zinc-400 text-sm mt-1">{sig.why || "En attente d'une confirmation"}</p>

              {nearestFvg && (
                <div className="mt-3 bg-purple-500/[0.08] border border-purple-500/25 rounded-xl p-3">
                  <p className="section-label mb-2">FVG à surveiller</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className={`font-bold text-sm flex items-center gap-1.5 ${nearestFvg.direction === 'bullish' ? 'text-emerald-300' : 'text-red-400'}`}>
                      {nearestFvg.direction === 'bullish' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}
                      {nearestFvg.direction === 'bullish' ? 'BUY' : 'SELL'}
                    </span>
                    <span className="text-zinc-500 text-xs">Entrée : <span className="text-zinc-200 font-mono font-bold">{nearestFvg.midpoint.toFixed(4)}</span></span>
                    <span className="text-zinc-500 text-xs">Zone : <span className="text-zinc-300 font-mono">{nearestFvg.bottom.toFixed(4)}–{nearestFvg.top.toFixed(4)}</span></span>
                    <span className="text-zinc-500 text-xs">Force : <span className="text-zinc-300 capitalize">{nearestFvg.strength}</span></span>
                  </div>
                </div>
              )}

              {bestPending && !nearestFvg && (
                <div className="mt-3 stat-cell">
                  <p className="section-label mb-2">Prix cible à surveiller</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xl font-mono font-black ${bestPending.direction === 'BUY' ? 'text-emerald-300' : 'text-red-400'}`}>
                      {bestPending.target_price.toFixed(4)}
                    </span>
                    <span className="text-zinc-500 text-xs">Confiance : <span className="text-zinc-200 font-bold">{bestPending.estimated_confidence}%</span></span>
                    <span className="text-zinc-500 text-xs">Distance : <span className="text-zinc-200 font-mono">{bestPending.distance_pct.toFixed(3)}%</span></span>
                    {bestPending.proximity_alert && (
                      <span className="text-amber-300 text-xs font-bold animate-pulse">● Le prix s'approche</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 4 + 5 : BUY ──────────────────────────────────────────────────────────
  if (sig.type === 'BUY') {

    // 4. BUY EN FORMATION
    if (!confirmationOk) {
      return (
        <div className="surface overflow-hidden"
             style={{ background: 'rgba(34,211,238,0.03)', borderColor: 'rgba(34,211,238,0.18)' }}>
          <div className="flex items-stretch">
            <div className="w-1 shrink-0 bg-cyan-400/40 rounded-l-2xl" />
            <div className="flex items-start gap-4 p-5 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <div className="w-4 h-4 border-2 border-cyan-300/70 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <p className="text-cyan-300 font-black text-2xl tracking-tight leading-none">SIGNAL BUY EN FORMATION</p>
                  <span className="chip chip-accent">{sig.confidence}% — en attente</span>
                </div>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">{sig.why}</p>
                <PriceGrid price={price} stake={stake} pos={pos} baseAmount={baseAmount} />
                <LimitOrderCard pa={pa} isBuy currentPrice={price} />
                {!pa?.limit_price && (
                  <div className="mt-3 rounded-xl bg-cyan-500/[0.07] border border-cyan-500/20 px-4 py-3">
                    <p className="text-cyan-300 text-sm font-semibold">Attendre un pattern M5 (Engulfing, Pinbar, Marubozu)</p>
                    <p className="text-zinc-500 text-xs mt-1">La bannière passera au vert dès la confirmation.</p>
                  </div>
                )}
                <ReasonsChips reasons={sig.reasons} color="text-cyan-300" />
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 5. BUY CONFIRMÉ
    return (
      <div className="surface overflow-hidden"
           style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.22)', boxShadow: '0 0 50px rgba(16,185,129,0.06), 0 8px 32px rgba(0,0,0,0.4)' }}>
        <div className="flex items-stretch">
          <div className="w-1.5 shrink-0 bg-emerald-400/70 rounded-l-2xl" />
          <div className="flex items-start gap-4 p-5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <span className="text-emerald-300"><IconArrowUp size={26} /></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <p className="text-emerald-300 font-black tracking-tight leading-none" style={{ fontSize: 'clamp(1.5rem,3vw,1.75rem)' }}>
                  VOUS POUVEZ ACHETER
                </p>
                <span className="chip chip-success">{sig.confidence}% confiance</span>
                {stability?.locked && stability?.remaining_label && (
                  <span className="chip">{stability.remaining_label}</span>
                )}
              </div>
              <PriceGrid price={price} stake={stake} pos={pos} baseAmount={baseAmount} />
              <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{sig.why}</p>

              {/* ── Conseils position ── */}
              {pos && (
                <div className="mt-3 space-y-2">
                  {/* Buy Limit */}
                  {pos.buy_limit && (
                    <div className="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-emerald-300 text-xs font-bold uppercase tracking-wide mb-0.5">Buy Limit suggéré</p>
                        <p className="text-zinc-400 text-xs">Entrée optimale 0.3×ATR sous le prix actuel</p>
                      </div>
                      <p className="font-mono font-black text-emerald-300 text-lg shrink-0">{pos.buy_limit.toFixed(4)}</p>
                    </div>
                  )}
                  {/* Alerte perte 25% */}
                  {pos.loss_alert_price > 0 && (
                    <div className="rounded-xl bg-red-500/[0.07] border border-red-500/20 px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-red-400 text-xs font-bold uppercase tracking-wide mb-0.5">⚠ Alerte perte 25%</p>
                        <p className="text-zinc-400 text-xs">Couper la position si le prix descend à</p>
                      </div>
                      <p className="font-mono font-black text-red-400 text-lg shrink-0">{pos.loss_alert_price.toFixed(4)}</p>
                    </div>
                  )}
                  {/* Sortie anticipée */}
                  {pos.early_exit_advice && (
                    <div className="rounded-xl bg-amber-500/[0.07] border border-amber-500/20 px-4 py-3">
                      <p className="text-amber-300 text-xs font-bold uppercase tracking-wide mb-0.5">💡 Conseil sortie anticipée</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">{pos.early_exit_advice}</p>
                    </div>
                  )}
                </div>
              )}

              <FVGInfo analysis={analysis} price={price} isBuy />
              <ReasonsChips reasons={sig.reasons} color="text-emerald-300/80" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 4 + 5 : SELL ─────────────────────────────────────────────────────────

  // 4. SELL EN FORMATION
  if (!confirmationOk) {
    return (
      <div className="surface overflow-hidden"
           style={{ background: 'rgba(249,115,22,0.03)', borderColor: 'rgba(249,115,22,0.18)' }}>
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 bg-orange-400/40 rounded-l-2xl" />
          <div className="flex items-start gap-4 p-5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <div className="w-4 h-4 border-2 border-orange-300/70 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <p className="text-orange-300 font-black text-2xl tracking-tight leading-none">SIGNAL SELL EN FORMATION</p>
                <span className="chip chip-warning">{sig.confidence}% — en attente</span>
              </div>
              <p className="text-zinc-400 text-sm mt-1 leading-relaxed">{sig.why}</p>
              <PriceGrid price={price} stake={stake} pos={pos} baseAmount={baseAmount} />
              <LimitOrderCard pa={pa} isBuy={false} currentPrice={price} />
              {!pa?.limit_price && (
                <div className="mt-3 rounded-xl bg-orange-500/[0.07] border border-orange-500/20 px-4 py-3">
                  <p className="text-orange-300 text-sm font-semibold">Attendre un pattern M5 (Engulfing, Pinbar, Marubozu)</p>
                  <p className="text-zinc-500 text-xs mt-1">La bannière passera au rouge dès la confirmation.</p>
                </div>
              )}
              <ReasonsChips reasons={sig.reasons} color="text-orange-300" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 5. SELL CONFIRMÉ
  return (
    <div className="surface overflow-hidden"
         style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.22)', boxShadow: '0 0 50px rgba(239,68,68,0.06), 0 8px 32px rgba(0,0,0,0.4)' }}>
      <div className="flex items-stretch">
        <div className="w-1.5 shrink-0 bg-red-500/70 rounded-l-2xl" />
        <div className="flex items-start gap-4 p-5 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
            <span className="text-red-400"><IconArrowDown size={26} /></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <p className="text-red-400 font-black tracking-tight leading-none" style={{ fontSize: 'clamp(1.5rem,3vw,1.75rem)' }}>
                VOUS POUVEZ VENDRE
              </p>
              <span className="chip chip-danger">{sig.confidence}% confiance</span>
              {stability?.locked && stability?.remaining_label && (
                <span className="chip">{stability.remaining_label}</span>
              )}
            </div>
            <PriceGrid price={price} stake={stake} pos={pos} baseAmount={baseAmount} />
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{sig.why}</p>

            {/* ── Conseils position ── */}
            {pos && (
              <div className="mt-3 space-y-2">
                {/* Sell Limit */}
                {pos.sell_limit && (
                  <div className="rounded-xl bg-red-500/[0.07] border border-red-500/20 px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-red-400 text-xs font-bold uppercase tracking-wide mb-0.5">Sell Limit suggéré</p>
                      <p className="text-zinc-400 text-xs">Entrée optimale 0.3×ATR au-dessus du prix actuel</p>
                    </div>
                    <p className="font-mono font-black text-red-400 text-lg shrink-0">{pos.sell_limit.toFixed(4)}</p>
                  </div>
                )}
                {/* Alerte perte 25% */}
                {pos.loss_alert_price > 0 && (
                  <div className="rounded-xl bg-red-500/[0.07] border border-red-500/20 px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-red-400 text-xs font-bold uppercase tracking-wide mb-0.5">⚠ Alerte perte 25%</p>
                      <p className="text-zinc-400 text-xs">Couper la position si le prix monte à</p>
                    </div>
                    <p className="font-mono font-black text-red-400 text-lg shrink-0">{pos.loss_alert_price.toFixed(4)}</p>
                  </div>
                )}
                {/* Sortie anticipée */}
                {pos.early_exit_advice && (
                  <div className="rounded-xl bg-amber-500/[0.07] border border-amber-500/20 px-4 py-3">
                    <p className="text-amber-300 text-xs font-bold uppercase tracking-wide mb-0.5">💡 Conseil sortie anticipée</p>
                    <p className="text-zinc-400 text-xs leading-relaxed">{pos.early_exit_advice}</p>
                  </div>
                )}
              </div>
            )}

            <FVGInfo analysis={analysis} price={price} isBuy={false} />
            <ReasonsChips reasons={sig.reasons} color="text-red-400/80" />
          </div>
        </div>
      </div>
    </div>
  )
}
