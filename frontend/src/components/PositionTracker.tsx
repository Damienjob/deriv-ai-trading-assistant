/**
 * Suivi de positions — style capture (tableau + formulaire + plan de position)
 */
import { useState } from 'react'
import { useMarketStore } from '../store/marketStore'
import { IconArrowDown, IconArrowUp, IconBarChart, IconInfo, IconShieldAlert, IconX } from './Icon'
import {
  usePositionTracker,
  type OpenPosition,
  type PositionAnalysis,
  type TradeDirection,
} from '../store/positionTracker'

// ── Pip sizes ─────────────────────────────────────────────────────────────────
const PIP_SIZE: Record<string, number> = {
  R_10: 0.001, R_25: 0.001, R_50: 0.01,  R_75: 0.01,  R_100: 0.01,
  '1HZ10V': 0.001, '1HZ25V': 0.001, '1HZ50V': 0.01,
  '1HZ75V': 0.01,  '1HZ100V': 0.001,
  BOOM300N: 0.01, BOOM500: 0.01, BOOM1000: 0.01,
  CRASH300N: 0.01, CRASH500: 0.01, CRASH1000: 0.01,
  stpRNG: 0.1,
}

// ── Calcul analyse d'une position ─────────────────────────────────────────────
function computePositionAnalysis(
  pos: OpenPosition,
  currentPrice: number,
  atr: number | null,
  signalType: string,
  confidence: number,
  invalidated: boolean,
  baseAmount: number,
): PositionAnalysis {
  const atrVal   = atr ?? currentPrice * 0.001
  const pipSize  = PIP_SIZE[pos.symbol] ?? 0.01
  const rawDiff  = pos.direction === 'BUY' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice
  const pnlPips  = rawDiff / pipSize
  const pnl      = Math.round(rawDiff * pos.lot * 100) / 100

  const tpMult   = confidence >= 80 ? 2.5 : confidence >= 60 ? 1.8 : 1.2
  const slMult   = 1.5
  const tpDist   = atrVal * tpMult
  const slDist   = atrVal * slMult
  const tpAnalysis = pos.direction === 'BUY' ? pos.entryPrice + tpDist : pos.entryPrice - tpDist
  const slAnalysis = pos.direction === 'BUY' ? pos.entryPrice - slDist : pos.entryPrice + slDist

  const signalAligned = (pos.direction === 'BUY' && signalType === 'BUY') || (pos.direction === 'SELL' && signalType === 'SELL')
  const signalOpposed = (pos.direction === 'BUY' && signalType === 'SELL') || (pos.direction === 'SELL' && signalType === 'BUY')
  const lossExceedsMax  = pnl < 0 && Math.abs(pnl) >= baseAmount * 0.02
  const lossExceedsWarn = pnl < 0 && Math.abs(pnl) >= baseAmount * 0.01

  let recommendation: PositionAnalysis['recommendation']
  let recommendationLabel: string
  let recommendationColor: string
  let exitPrice: number
  let exitReason: string

  if (invalidated || lossExceedsMax) {
    recommendation = 'urgent'; recommendationLabel = 'COUPER — PERTE MAX ATTEINTE'; recommendationColor = 'text-red-400'
    exitPrice = currentPrice; exitReason = invalidated ? 'Invalidation détectée — conditions cassées' : `Perte ${Math.abs(pnl).toFixed(2)}$ dépasse 2% du capital (${(baseAmount * 0.02).toFixed(2)}$)`
  } else if (signalOpposed) {
    recommendation = 'close'; recommendationLabel = 'FERMER — SIGNAL RETOURNÉ'; recommendationColor = 'text-red-400'
    exitPrice = currentPrice; exitReason = 'Le signal a changé de direction — sortir au prix actuel'
  } else if (lossExceedsWarn && signalType === 'NEUTRAL') {
    recommendation = 'reduce'; recommendationLabel = 'ALLÉGER — PERTE CROISSANTE'; recommendationColor = 'text-amber-400'
    exitPrice = tpAnalysis; exitReason = `Perte ${Math.abs(pnl).toFixed(2)}$ dépasse 1% · Signal neutre`
  } else if (signalAligned && confidence >= 60) {
    recommendation = 'hold'; recommendationLabel = 'MAINTENIR — SIGNAL STABLE'; recommendationColor = 'text-emerald-400'
    exitPrice = tpAnalysis; exitReason = `Structure de marché ${pos.direction === 'BUY' ? 'haussière' : 'baissière'} intacte`
  } else {
    recommendation = 'hold'; recommendationLabel = 'ATTENDRE — PAS DE SIGNAL'; recommendationColor = 'text-zinc-400'
    exitPrice = tpAnalysis; exitReason = 'Pas de signal clair — maintenir la position'
  }

  return {
    id: pos.id,
    pnl: Math.round(pnl * 100) / 100,
    pnlPips: Math.round(pnlPips * 100) / 100,
    tpAnalysis: Math.round(tpAnalysis * 10000) / 10000,
    slAnalysis: Math.round(slAnalysis * 10000) / 10000,
    recommendation, recommendationLabel, recommendationColor,
    exitPrice: Math.round(exitPrice * 10000) / 10000,
    exitReason,
  }
}

// ── Formulaire nouvelle position ──────────────────────────────────────────────
function NewPositionForm({
  currentSymbol,
  analysis,
}: {
  currentSymbol: string
  analysis: any
}) {
  const { addPosition } = usePositionTracker()
  const [direction, setDirection] = useState<TradeDirection>('BUY')
  const [lot,   setLot]   = useState('0.01')
  const [entry, setEntry] = useState(analysis?.price ? String(analysis.price.toFixed(4)) : '')
  const [tp,    setTp]    = useState(analysis?.position?.take_profit ? String(analysis.position.take_profit.toFixed(2)) : '')
  const [error, setError] = useState('')

  const pos   = analysis?.position
  const sig   = analysis?.signal
  void pos?.take_profit // used for side-effect check only

  const handleAdd = () => {
    const lotVal   = parseFloat(lot)
    const entryVal = parseFloat(entry)
    if (isNaN(lotVal) || lotVal <= 0)    { setError('Lot invalide');           return }
    if (isNaN(entryVal) || entryVal <= 0) { setError("Prix d'entrée invalide"); return }
    setError('')
    addPosition({ symbol: currentSymbol, direction, lot: lotVal, entryPrice: entryVal, tpMT5: tp ? parseFloat(tp) : null })
    setEntry('')
    setTp('')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* ── Panneau gauche : formulaire ── */}
      <div className="lg:col-span-2 surface-solid p-5">
        {/* Titre + BUY/SELL toggle */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-5 h-5 rounded-full border-2 border-emerald-400 flex items-center justify-center text-[10px] font-black">+</span>
            <span className="section-label text-emerald-500 text-[11px]">SUIVI De POSITIONS</span>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
            <button
              onClick={() => setDirection('BUY')}
              className="px-5 py-2 text-sm font-bold transition-colors"
              style={direction === 'BUY'
                ? { background: '#4edea3', color: '#003824' }
                : { background: 'rgba(255,255,255,0.04)', color: '#bbcabf' }}
            >
              BUY
            </button>
            <button
              onClick={() => setDirection('SELL')}
              className="px-5 py-2 text-sm font-bold transition-colors"
              style={direction === 'SELL'
                ? { background: '#ef4444', color: '#fff' }
                : { background: 'rgba(255,255,255,0.04)', color: '#bbcabf' }}
            >
              SELL
            </button>
          </div>
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="section-label mb-1.5">Volume (lot)</p>
            <input
              type="number" min="0.01" step="0.01" value={lot}
              onChange={e => setLot(e.target.value)}
              placeholder="0.01"
              className="input-base w-full"
              aria-label="Volume en lot"
            />
          </div>
          <div>
            <p className="section-label mb-1.5">Prix d'entrée</p>
            <input
              type="number" step="0.0001" value={entry}
              onChange={e => setEntry(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder={analysis?.price ? analysis.price.toFixed(2) : '1245.80'}
              className="input-base w-full"
              aria-label="Prix d'entrée"
            />
          </div>
          <div>
            <p className="section-label mb-1.5">TP MT5 (optionnel)</p>
            <input
              type="number" step="0.0001" value={tp}
              onChange={e => setTp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder={pos?.take_profit ? pos.take_profit.toFixed(2) : '1255.00'}
              className="input-base w-full"
              aria-label="Take profit MT5"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        {/* Bouton enregistrer */}
        <button
          onClick={handleAdd}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: 'rgba(78,222,163,0.12)', border: '1px solid rgba(78,222,163,0.25)', color: '#4edea3', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,222,163,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(78,222,163,0.12)'}
        >
          <IconBarChart size={16} />
          Enregistrer la Position
        </button>
      </div>

      {/* ── Panneau droit : plan de position ── */}
      <div className="surface-solid p-5" style={{ border: '1px solid rgba(78,222,163,0.2)' }}>
        <div className="flex items-center gap-2 mb-4">
          <span style={{ color: '#4edea3' }}><IconBarChart size={15} /></span>
          <p className="section-label text-emerald-500">Plan de position</p>
        </div>

        {pos && sig ? (
          <>
            {/* Statut signal */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="section-label">Statut du signal</p>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: sig.confidence >= 75 ? 'rgba(78,222,163,0.15)' : 'rgba(251,191,36,0.15)', color: sig.confidence >= 75 ? '#4edea3' : '#fbbf24', border: `1px solid ${sig.confidence >= 75 ? 'rgba(78,222,163,0.3)' : 'rgba(251,191,36,0.3)'}` }}
                >
                  {sig.confidence >= 75 ? 'FORTE CONFIANCE' : 'CONFIANCE MOYENNE'}
                </span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{sig.why || 'Les indicateurs suggèrent une continuation.'}</p>
            </div>

            {/* TP + SL */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="stat-cell">
                <p className="stat-label mb-1">Objectif 1</p>
                <p className="font-mono font-bold text-emerald-400">{pos.take_profit.toFixed(2)}</p>
              </div>
              <div className="stat-cell">
                <p className="stat-label mb-1">Stop Loss</p>
                <p className="font-mono font-bold text-red-400">{pos.stop_loss.toFixed(2)}</p>
              </div>
            </div>

            <p className="text-zinc-600 text-[11px] flex items-center gap-1">
              <IconInfo size={12} />
              Mise à jour en temps réel
            </p>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-zinc-500 text-sm">
              {!sig || sig.type === 'WAIT' ? "En attente d'un signal..." : 'Signal insuffisant'}
            </p>
          </div>
        )}

        {/* Note disclaimer */}
        <p className="text-zinc-600 text-[11px] mt-4 pt-3 border-t border-white/[0.05] leading-relaxed">
          Les prix TP/SL et recommandations sont calculés par l'analyse MTF · Pas un conseil financier
        </p>
      </div>

    </div>
  )
}

// ── Tableau positions actives ─────────────────────────────────────────────────
function ActivePositionsTable({
  positions,
  analyses,
  onRemove,
  currentSymbol,
}: {
  positions: OpenPosition[]
  analyses: PositionAnalysis[]
  onRemove: (id: string) => void
  currentSymbol: string
}) {
  const hasUrgent = analyses.some(a => a.recommendation === 'urgent')

  return (
    <div className="surface-solid overflow-hidden" style={hasUrgent ? { borderColor: 'rgba(239,68,68,0.4)' } : {}}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <span style={{ color: '#4edea3' }}><IconBarChart size={15} /></span>
          <p className="section-label text-emerald-500">Positions actives</p>
          {positions.length > 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={hasUrgent
                ? { background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }
                : { background: 'rgba(255,255,255,0.06)', color: '#bbcabf', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {positions.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          {/* Icônes filtre / export — décoratifs */}
          <button className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center transition-colors" title="Filtre">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M7 12h10M11 18h2" /></svg>
          </button>
          <button className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center transition-colors" title="Export">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>
      </div>

      {/* Alerte urgente */}
      {hasUrgent && (
        <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 animate-pulse">
          <IconShieldAlert size={15} className="text-red-400 shrink-0" />
          <p className="text-red-300 text-sm font-semibold">Invalidation détectée — Coupez vos positions dès que possible</p>
        </div>
      )}

      {positions.length === 0 ? (
        <div className="px-5 py-10 text-center text-zinc-500 text-sm">
          Aucune position sur {currentSymbol} — utilisez le formulaire ci-dessus pour en ajouter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Actif', 'Type', 'Lot', 'Entrée', 'TP / SL', 'Profit/Perte', 'Statut', 'Recommandation', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => {
                const a      = analyses[i]
                const isBuy  = pos.direction === 'BUY'
                const isPnlPos = a.pnl >= 0
                const date   = new Date(pos.openedAt)
                const dateStr = `${date.getDate()}/${date.getMonth()+1} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`
                const isUrgent = a.recommendation === 'urgent' || a.recommendation === 'close'
                void isUrgent // used in recommendation color below

                return (
                  <tr key={pos.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    {/* Actif */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isBuy ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                          {isBuy ? <IconArrowUp size={13} className="text-emerald-400" /> : <IconArrowDown size={13} className="text-red-400" />}
                        </div>
                        <div>
                          <p className="text-zinc-200 text-sm font-semibold leading-none">{pos.symbol}</p>
                          <p className="text-zinc-500 text-[11px] mt-0.5 font-mono">{dateStr}</p>
                        </div>
                      </div>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3">
                      <span
                        className="px-3 py-1 rounded text-xs font-bold"
                        style={isBuy
                          ? { background: 'rgba(78,222,163,0.15)', color: '#4edea3', border: '1px solid rgba(78,222,163,0.3)' }
                          : { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                      >
                        {pos.direction}
                      </span>
                    </td>
                    {/* Lot */}
                    <td className="px-4 py-3 font-mono text-zinc-200 text-sm">{pos.lot.toFixed(2)}</td>
                    {/* Entrée */}
                    <td className="px-4 py-3 font-mono text-zinc-200 text-sm">{pos.entryPrice.toFixed(2)}</td>
                    {/* TP/SL */}
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-emerald-400">TP: {a.tpAnalysis.toFixed(2)}</p>
                      <p className="font-mono text-xs text-red-400">SL: {a.slAnalysis.toFixed(2)}</p>
                    </td>
                    {/* P&L */}
                    <td className="px-4 py-3">
                      <p className={`font-mono font-bold text-sm ${isPnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPnlPos ? '+' : ''}{a.pnl.toFixed(2)}$
                      </p>
                    </td>
                    {/* Statut */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        EN COURS
                      </span>
                    </td>

                    {/* Recommandation */}
                    <td className="px-4 py-3 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          a.recommendation === 'urgent' ? 'bg-red-500' :
                          a.recommendation === 'close'  ? 'bg-red-400' :
                          a.recommendation === 'reduce' ? 'bg-amber-400' :
                          a.recommendation === 'hold' && a.recommendationLabel.includes('MAINTENIR') ? 'bg-emerald-400' :
                          'bg-zinc-500'
                        }`} />
                        <p className={`text-xs font-black uppercase tracking-wide leading-none ${
                          a.recommendation === 'urgent' ? 'text-red-400' :
                          a.recommendation === 'close'  ? 'text-red-400' :
                          a.recommendation === 'reduce' ? 'text-amber-400' :
                          a.recommendation === 'hold' && a.recommendationLabel.includes('MAINTENIR') ? 'text-emerald-400' :
                          'text-zinc-400'
                        }`}>
                          {a.recommendationLabel}
                        </p>
                      </div>
                      <p className="text-zinc-400 text-[12px] leading-snug pl-[18px]">{a.exitReason}</p>
                    </td>
                    {/* Action */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onRemove(pos.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-white/[0.08]"
                        aria-label="Supprimer"
                      >
                        <IconX size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export function PositionTracker() {
  const { analysis, currentTick, currentSymbol, baseAmount } = useMarketStore()
  const { positions, removePosition } = usePositionTracker()

  const currentPrice = currentTick?.price ?? 0
  const signalType   = analysis?.signal.type ?? 'NEUTRAL'
  const confidence   = analysis?.signal.confidence ?? 0
  const invalidated  = (analysis as any)?.invalidation?.invalidated ?? false
  const atr =
    analysis?.timeframes?.['15min']?.indicators?.atr ??
    analysis?.timeframes?.['5min']?.indicators?.atr ?? null

  const activePositions = positions.filter(p => p.symbol === currentSymbol)
  const analyses = activePositions.map(pos =>
    computePositionAnalysis(pos, currentPrice, atr, signalType, confidence, invalidated, baseAmount)
  )

  return (
    <div className="space-y-4">
      <NewPositionForm currentSymbol={currentSymbol} analysis={analysis} />
      <ActivePositionsTable
        positions={activePositions}
        analyses={analyses}
        onRemove={removePosition}
        currentSymbol={currentSymbol}
      />
    </div>
  )
}
