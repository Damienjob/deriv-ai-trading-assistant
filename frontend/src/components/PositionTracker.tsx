/**
 * Suivi de positions ouvertes — style tableau MT5.
 *
 * Fonctionnement :
 *  - L'utilisateur saisit ses positions ouvertes (direction, lot, prix entrée, TP optionnel)
 *  - Pour chaque position, on calcule live : P&L, TP analyse, SL analyse, recommandation
 *  - Les prix de sortie (TP/SL) sont calculés DEPUIS LE PRIX D'ENTRÉE de la position
 *    en utilisant l'ATR et la confiance du signal actuel
 */
import { useState } from 'react'
import { useMarketStore } from '../store/marketStore'
import { IconArrowDown, IconArrowUp, IconChevronDown, IconChevronUp, IconInfo, IconPlus, IconShieldAlert, IconX } from './Icon'
import {
  usePositionTracker,
  type OpenPosition,
  type PositionAnalysis,
  type TradeDirection,
} from '../store/positionTracker'

// ─────────────────────────────────────────────────────────────
// Table pip_size par symbole (synchronisée avec assets.py backend)
// ─────────────────────────────────────────────────────────────
const PIP_SIZE: Record<string, number> = {
  R_10: 0.001, R_25: 0.001, R_50: 0.01,  R_75: 0.01,  R_100: 0.01,
  '1HZ10V': 0.001, '1HZ25V': 0.001, '1HZ50V': 0.01,
  '1HZ75V': 0.01,  '1HZ100V': 0.001,
  BOOM300N: 0.01,  BOOM500: 0.01,   BOOM1000: 0.01,
  CRASH300N: 0.01, CRASH500: 0.01,  CRASH1000: 0.01,
  stpRNG: 0.1,
}
const DEFAULT_PIP_SIZE = 0.01

// ─────────────────────────────────────────────────────────────
// Calcul du TP/SL et recommandation pour une position
// ─────────────────────────────────────────────────────────────

function computePositionAnalysis(
  pos: OpenPosition,
  currentPrice: number,
  atr: number | null,
  signalType: string,
  confidence: number,
  invalidated: boolean,
  baseAmount: number,   // capital total pour calculer les seuils de perte
): PositionAnalysis {
  const atrVal = atr ?? currentPrice * 0.001  // fallback 0.1%

  // ── P&L réel Deriv Synthetics ──
  // Sur Deriv, le P&L d'un contrat = (prix_actuel - prix_entrée) × lot
  // C'est la formule MT5 : Profit = (Close - Open) × Volume (en devise du compte)
  // Le pip_size détermine la précision d'affichage, pas le calcul du P&L
  const pipSize = PIP_SIZE[pos.symbol] ?? DEFAULT_PIP_SIZE
  const rawDiff = pos.direction === 'BUY'
    ? currentPrice - pos.entryPrice
    : pos.entryPrice - currentPrice
  const pnlPips = rawDiff / pipSize                          // en pips
  const pnl     = Math.round(rawDiff * pos.lot * 100) / 100 // en $ (arrondi 2 décimales)

  // ── Seuils de protection du capital ──
  // Couper si perte > 2% du capital sur cette seule position
  // Alléger si perte > 1% du capital
  const maxLossPerPosition  = baseAmount * 0.02   // 2% du capital → couper
  const warnLossPerPosition = baseAmount * 0.01   // 1% du capital → alléger

  // Multiplicateurs selon signal + confiance
  let tpMultiplier: number
  let slMultiplier = 1.5

  if (confidence >= 80) {
    tpMultiplier = 2.5   // signal fort → laisser courir
  } else if (confidence >= 60) {
    tpMultiplier = 1.8   // signal moyen
  } else {
    tpMultiplier = 1.2   // signal faible → sécuriser tôt
  }

  const tpDistance = atrVal * tpMultiplier
  const slDistance = atrVal * slMultiplier

  const tpAnalysis = pos.direction === 'BUY'
    ? pos.entryPrice + tpDistance
    : pos.entryPrice - tpDistance

  const slAnalysis = pos.direction === 'BUY'
    ? pos.entryPrice - slDistance
    : pos.entryPrice + slDistance

  // ── Recommandation ──
  const signalAligned =
    (pos.direction === 'BUY'  && signalType === 'BUY')  ||
    (pos.direction === 'SELL' && signalType === 'SELL')

  const signalOpposed =
    (pos.direction === 'BUY'  && signalType === 'SELL') ||
    (pos.direction === 'SELL' && signalType === 'BUY')

  // Perte dépasse le seuil capital ?
  const lossExceedsMax  = pnl < 0 && Math.abs(pnl) >= maxLossPerPosition
  const lossExceedsWarn = pnl < 0 && Math.abs(pnl) >= warnLossPerPosition

  let recommendation: PositionAnalysis['recommendation']
  let recommendationLabel: string
  let recommendationColor: string
  let exitPrice: number
  let exitReason: string

  if (invalidated) {
    recommendation = 'urgent'
    recommendationLabel = 'COUPER MAINTENANT'
    recommendationColor = 'text-red-400'
    exitPrice = currentPrice
    exitReason = 'Invalidation détectée — conditions cassées'
  } else if (lossExceedsMax) {
    // Perte > 2% du capital → couper quelle que soit la direction du signal
    recommendation = 'urgent'
    recommendationLabel = 'COUPER — Perte max atteinte'
    recommendationColor = 'text-red-400'
    exitPrice = currentPrice
    exitReason = `Perte ${Math.abs(pnl).toFixed(2)}$ dépasse 2% du capital (${maxLossPerPosition.toFixed(2)}$)`
  } else if (signalOpposed) {
    recommendation = 'close'
    recommendationLabel = 'Fermer'
    recommendationColor = 'text-red-400'
    exitPrice = currentPrice
    exitReason = 'Signal retourné — sortir au prix actuel'
  } else if (lossExceedsWarn && signalType === 'NEUTRAL') {
    // Perte > 1% + signal neutre → alléger
    recommendation = 'reduce'
    recommendationLabel = 'Alléger'
    recommendationColor = 'text-yellow-400'
    exitPrice = tpAnalysis
    exitReason = `Perte ${Math.abs(pnl).toFixed(2)}$ > 1% capital · Signal neutre — réduire l'exposition`
  } else if (signalType === 'NEUTRAL' || confidence < 60) {
    if (pnl > 0) {
      recommendation = 'reduce'
      recommendationLabel = 'Alléger'
      recommendationColor = 'text-yellow-400'
      exitPrice = tpAnalysis
      exitReason = 'Signal neutre — sécuriser les gains'
    } else {
      recommendation = 'hold'
      recommendationLabel = 'Attendre'
      recommendationColor = 'text-yellow-400'
      exitPrice = tpAnalysis
      exitReason = 'En attente de confirmation — ne pas couper prématurément'
    }
  } else if (signalAligned && confidence >= 60) {
    recommendation = 'hold'
    recommendationLabel = 'Conserver'
    recommendationColor = 'text-green-400'
    exitPrice = tpAnalysis
    exitReason = `Signal aligné (${confidence}%) — laisser courir vers le TP`
  } else {
    recommendation = 'hold'
    recommendationLabel = 'Attendre'
    recommendationColor = 'text-gray-400'
    exitPrice = tpAnalysis
    exitReason = 'Pas de signal clair — maintenir la position'
  }

  return {
    id: pos.id,
    pnl: Math.round(pnl * 100) / 100,
    pnlPips: Math.round(pnlPips * 100) / 100,
    tpAnalysis: Math.round(tpAnalysis * 10000) / 10000,
    slAnalysis: Math.round(slAnalysis * 10000) / 10000,
    recommendation,
    recommendationLabel,
    recommendationColor,
    exitPrice: Math.round(exitPrice * 10000) / 10000,
    exitReason,
  }
}

// ─────────────────────────────────────────────────────────────
// Formulaire d'ajout de position
// ─────────────────────────────────────────────────────────────

function AddPositionForm({ currentSymbol }: { currentSymbol: string }) {
  const { addPosition } = usePositionTracker()
  const [direction, setDirection] = useState<TradeDirection>('BUY')
  const [lot, setLot] = useState('0.50')
  const [entry, setEntry] = useState('')
  const [tp, setTp] = useState('')
  const [error, setError] = useState('')

  const handleAdd = () => {
    const lotVal = parseFloat(lot)
    const entryVal = parseFloat(entry)
    if (isNaN(lotVal) || lotVal <= 0) { setError('Lot invalide'); return }
    if (isNaN(entryVal) || entryVal <= 0) { setError('Prix d\'entrée invalide'); return }
    setError('')

    addPosition({
      symbol: currentSymbol,
      direction,
      lot: lotVal,
      entryPrice: entryVal,
      tpMT5: tp ? parseFloat(tp) : null,
    })
    setEntry('')
    setTp('')
  }

  return (
    <div className="bg-gray-700/40 rounded-xl p-3 space-y-3">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
        Ajouter une position
      </p>

      <div className="flex flex-wrap gap-2 items-end">
        {/* Direction */}
        <div className="flex rounded-lg overflow-hidden border border-gray-600">
          <button
            onClick={() => setDirection('BUY')}
            className={`px-4 py-2 text-sm font-bold transition-colors ${
              direction === 'BUY'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <IconArrowUp size={14} />
              <span>BUY</span>
            </span>
          </button>
          <button
            onClick={() => setDirection('SELL')}
            className={`px-4 py-2 text-sm font-bold transition-colors ${
              direction === 'SELL'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <IconArrowDown size={14} />
              <span>SELL</span>
            </span>
          </button>
        </div>

        {/* Lot */}
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Lot</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            placeholder="0.50"
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2
                       text-sm font-mono w-24 focus:outline-none focus:border-blue-500"
            aria-label="Taille du lot"
          />
        </div>

        {/* Prix d'entrée */}
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Prix d'entrée</label>
          <input
            type="number"
            step="0.0001"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="ex: 4948.403"
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2
                       text-sm font-mono w-36 focus:outline-none focus:border-blue-500"
            aria-label="Prix d'entrée de la position"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>

        {/* TP MT5 (optionnel) */}
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">TP MT5 (optionnel)</label>
          <input
            type="number"
            step="0.0001"
            value={tp}
            onChange={(e) => setTp(e.target.value)}
            placeholder="ex: 4949.644"
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2
                       text-sm font-mono w-36 focus:outline-none focus:border-gray-500"
            aria-label="Take profit défini dans MT5"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>

        {/* Bouton ajouter */}
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold
                     rounded-lg transition-colors self-end"
        >
          <span className="inline-flex items-center gap-2">
            <IconPlus size={16} />
            <span>Ajouter</span>
          </span>
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Résumé global du portefeuille
// ─────────────────────────────────────────────────────────────

function PortfolioSummary({
  analyses,
  totalLots,
}: {
  analyses: PositionAnalysis[]
  totalLots: number
}) {
  const totalPnl   = analyses.reduce((s, a) => s + a.pnl, 0)
  const toHold     = analyses.filter((a) => a.recommendation === 'hold').length
  const toReduce   = analyses.filter((a) => a.recommendation === 'reduce').length
  const toClose    = analyses.filter((a) => a.recommendation === 'close').length
  const toUrgent   = analyses.filter((a) => a.recommendation === 'urgent').length
  const pnlColor   = totalPnl >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="bg-gray-700/50 rounded-xl px-3 py-2 text-center">
        <p className="text-gray-500 text-xs">Exposition</p>
        <p className="text-white font-mono font-bold">{totalLots.toFixed(2)} lots</p>
      </div>
      <div className="bg-gray-700/50 rounded-xl px-3 py-2 text-center">
        <p className="text-gray-500 text-xs">P&L total</p>
        <p className={`font-mono font-bold ${pnlColor}`}>
          {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}$
        </p>
      </div>
      <div className="bg-gray-700/50 rounded-xl px-3 py-2 text-center">
        <p className="text-gray-500 text-xs">Conserver</p>
        <p className="text-green-400 font-bold">{toHold}</p>
      </div>
      <div className="bg-gray-700/50 rounded-xl px-3 py-2 text-center">
        <p className="text-gray-500 text-xs">Fermer / Alléger</p>
        <p className={`font-bold ${toUrgent > 0 ? 'text-red-400 animate-pulse' : toClose > 0 ? 'text-red-400' : 'text-yellow-400'}`}>
          {toUrgent > 0 ? `${toUrgent} URGENT` : `${toClose + toReduce}`}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Ligne du tableau (une position)
// ─────────────────────────────────────────────────────────────

function PositionRow({
  pos,
  analysis,
  onRemove,
}: {
  pos: OpenPosition
  analysis: PositionAnalysis
  onRemove: (id: string) => void
}) {
  const isBuy   = pos.direction === 'BUY'
  const dirColor = isBuy ? 'text-green-400' : 'text-red-400'
  const pnlColor = analysis.pnl >= 0 ? 'text-green-400' : 'text-red-400'
  const time     = new Date(pos.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  // Bordure gauche selon urgence
  const rowBorder =
    analysis.recommendation === 'urgent' ? 'border-l-2 border-l-red-500' :
    analysis.recommendation === 'close'  ? 'border-l-2 border-l-red-400' :
    analysis.recommendation === 'reduce' ? 'border-l-2 border-l-yellow-400' :
    'border-l-2 border-l-green-500/40'

  return (
    <tr className={`border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors ${rowBorder}`}>

      {/* Direction */}
      <td className="px-3 py-2.5">
        <span className={`text-sm font-bold ${dirColor} inline-flex items-center gap-1.5`}>
          {isBuy ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}
          <span>{pos.direction}</span>
        </span>
        <p className="text-gray-600 text-xs font-mono">{time}</p>
      </td>

      {/* Lot */}
      <td className="px-3 py-2.5 font-mono text-white text-sm text-center">
        {pos.lot.toFixed(2)}
      </td>

      {/* Prix d'entrée */}
      <td className="px-3 py-2.5 font-mono text-white text-sm text-right">
        {pos.entryPrice.toFixed(4)}
      </td>

      {/* P&L */}
      <td className="px-3 py-2.5 text-right">
        <span className={`font-mono font-bold text-sm ${pnlColor}`}>
          {analysis.pnl >= 0 ? '+' : ''}{analysis.pnl.toFixed(2)}$
        </span>
        <p className={`text-xs font-mono ${pnlColor} opacity-70`}>
          {analysis.pnlPips >= 0 ? '+' : ''}{analysis.pnlPips.toFixed(1)} pts
        </p>
      </td>

      {/* TP analyse */}
      <td className="px-3 py-2.5 text-right">
        <span className="text-green-400 font-mono text-sm font-semibold">
          {analysis.tpAnalysis.toFixed(4)}
        </span>
        {pos.tpMT5 && (
          <p className="text-gray-500 text-xs font-mono">MT5: {pos.tpMT5.toFixed(4)}</p>
        )}
      </td>

      {/* SL analyse */}
      <td className="px-3 py-2.5 text-right">
        <span className="text-red-400 font-mono text-sm font-semibold">
          {analysis.slAnalysis.toFixed(4)}
        </span>
      </td>

      {/* Prix de sortie recommandé */}
      <td className="px-3 py-2.5 text-right">
        <span className={`font-mono text-sm font-bold ${
          analysis.recommendation === 'urgent' || analysis.recommendation === 'close'
            ? 'text-red-400 animate-pulse'
            : 'text-blue-300'
        }`}>
          ~{analysis.exitPrice.toFixed(4)}
        </span>
      </td>

      {/* Recommandation */}
      <td className="px-3 py-2.5">
        <div>
          <span className={`text-sm font-bold ${analysis.recommendationColor}`}>
            {analysis.recommendationLabel}
          </span>
          <p className="text-gray-500 text-xs leading-tight mt-0.5 max-w-[180px]">
            {analysis.exitReason}
          </p>
        </div>
      </td>

      {/* Supprimer */}
      <td className="px-3 py-2.5 text-center">
        <button
          onClick={() => onRemove(pos.id)}
          className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
          aria-label="Supprimer la position"
          title="Supprimer"
        >
          <IconX size={16} />
        </button>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

export function PositionTracker() {
  const { analysis, currentTick, currentSymbol, baseAmount } = useMarketStore()
  const { positions, removePosition, clearAll } = usePositionTracker()
  const [collapsed, setCollapsed] = useState(false)

  const currentPrice = currentTick?.price ?? 0
  const signalType   = analysis?.signal.type ?? 'NEUTRAL'
  const confidence   = analysis?.signal.confidence ?? 0
  const invalidated  = (analysis as any)?.invalidation?.invalidated ?? false

  // ATR depuis le timeframe M15 (le plus fiable)
  const atr =
    analysis?.timeframes?.['15min']?.indicators?.atr ??
    analysis?.timeframes?.['5min']?.indicators?.atr ??
    null

  // Filtrer les positions sur l'actif affiché
  const activePositions = positions.filter((p) => p.symbol === currentSymbol)
  const otherPositions  = positions.filter((p) => p.symbol !== currentSymbol)

  // Calcul des analyses
  const analyses: PositionAnalysis[] = activePositions.map((pos) =>
    computePositionAnalysis(pos, currentPrice, atr, signalType, confidence, invalidated, baseAmount)
  )

  const totalLots = activePositions.reduce((s, p) => s + p.lot, 0)

  // Alerte urgente globale
  const hasUrgent  = analyses.some((a) => a.recommendation === 'urgent')
  const hasClose   = analyses.some((a) => a.recommendation === 'close')

  return (
    <div className={`rounded-2xl border ${
      hasUrgent ? 'border-red-500/60 bg-red-900/10' :
      hasClose  ? 'border-red-500/30 bg-gray-800' :
      'border-gray-700 bg-gray-800'
    }`}>

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <h3 className="text-gray-200 font-bold text-sm">
            📊 Suivi de Positions
          </h3>
          {activePositions.length > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              hasUrgent ? 'bg-red-500 text-white animate-pulse' :
              hasClose  ? 'bg-red-500/20 text-red-300' :
              'bg-gray-700 text-gray-300'
            }`}>
              {activePositions.length} position{activePositions.length > 1 ? 's' : ''}
            </span>
          )}
          {otherPositions.length > 0 && (
            <span className="text-xs text-gray-500">
              +{otherPositions.length} sur d'autres actifs
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activePositions.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1
                         border border-gray-700 hover:border-red-500/40 rounded-lg"
            >
              Tout effacer
            </button>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-gray-400 hover:text-white transition-colors text-sm px-2 py-1"
            aria-label={collapsed ? 'Déplier' : 'Replier'}
          >
            <span className="inline-flex items-center gap-1.5">
              {collapsed ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
              <span>{collapsed ? 'Déplier' : 'Replier'}</span>
            </span>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-4">

          {/* Alerte urgente */}
          {hasUrgent && (
            <div className="bg-red-600/20 border border-red-500/60 rounded-xl px-4 py-3 animate-pulse">
              <p className="text-red-300 font-bold text-sm inline-flex items-center gap-2">
                <IconShieldAlert size={16} />
                <span>INVALIDATION DÉTECTÉE — Coupez vos positions dès que possible</span>
              </p>
            </div>
          )}
          {!hasUrgent && hasClose && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-300 font-semibold text-sm inline-flex items-center gap-2">
                <IconInfo size={16} />
                <span>Signal retourné — Fermez les positions en sens contraire</span>
              </p>
            </div>
          )}

          {/* Résumé global */}
          {activePositions.length > 0 && (
            <PortfolioSummary analyses={analyses} totalLots={totalLots} />
          )}

          {/* Tableau des positions */}
          {activePositions.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-gray-700/60 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="px-3 py-2.5">Direction</th>
                    <th className="px-3 py-2.5 text-center">Lot</th>
                    <th className="px-3 py-2.5 text-right">Entrée</th>
                    <th className="px-3 py-2.5 text-right">P&L</th>
                    <th className="px-3 py-2.5 text-right">TP Analyse</th>
                    <th className="px-3 py-2.5 text-right">SL Analyse</th>
                    <th className="px-3 py-2.5 text-right">
                      <span className="text-blue-400">Prix de sortie</span>
                    </th>
                    <th className="px-3 py-2.5">Recommandation</th>
                    <th className="px-3 py-2.5 text-center">
                      <IconX size={14} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activePositions.map((pos, i) => (
                    <PositionRow
                      key={pos.id}
                      pos={pos}
                      analysis={analyses[i]}
                      onRemove={removePosition}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              Aucune position sur {currentSymbol} — ajoutez vos trades ouverts ci-dessous
            </div>
          )}

          {/* Formulaire d'ajout */}
          <AddPositionForm currentSymbol={currentSymbol} />

          <p className="text-gray-700 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <IconInfo size={14} />
              <span>Les prix TP/SL et recommandations sont calculés par l'analyse MTF · Pas un conseil financier</span>
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
