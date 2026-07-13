/**
 * Panneau Fair Value Gaps (FVG) — Smart Money Concept.
 *
 * Un FVG est une zone d'imbalance créée quand le marché se déplace
 * si vite qu'il laisse un "vide" entre 3 bougies consécutives.
 * Le marché tend à revenir combler ces zones avant de reprendre sa direction.
 *
 * Utilisation :
 *  - FVG Haussier sous le prix → zone d'achat potentielle
 *  - FVG Baissier au-dessus du prix → zone de vente potentielle
 */
import { useMarketStore, type FVGZone } from '../store/marketStore'

const STRENGTH_CONFIG = {
  strong: { label: 'Fort',   color: 'text-white',      dot: 'bg-white'       },
  medium: { label: 'Moyen',  color: 'text-gray-300',   dot: 'bg-gray-300'    },
  weak:   { label: 'Faible', color: 'text-gray-500',   dot: 'bg-gray-500'    },
}

function FVGRow({ fvg, currentPrice }: { fvg: FVGZone; currentPrice: number }) {
  const isBull   = fvg.direction === 'bullish'
  const color    = isBull ? 'text-green-400' : 'text-red-400'
  const bg       = isBull ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'
  const dist     = Math.abs(fvg.midpoint - currentPrice)
  const distPct  = (dist / currentPrice * 100).toFixed(3)
  const strCfg   = STRENGTH_CONFIG[fvg.strength]

  // Le prix est-il à l'intérieur de la zone ?
  const insideZone = currentPrice >= fvg.bottom && currentPrice <= fvg.top
  // Le prix est-il en train d'approcher la zone (< 0.2%) ?
  const approaching = !insideZone && parseFloat(distPct) < 0.2

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${bg} ${
      insideZone  ? 'ring-2 ring-purple-500/50' :
      approaching ? 'ring-1 ring-yellow-500/40' : ''
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${color}`}>
            {isBull ? '▲' : '▼'} FVG {isBull ? 'Haussier' : 'Baissier'}
          </span>
          <div className={`w-1.5 h-1.5 rounded-full ${strCfg.dot}`} title={`Force : ${strCfg.label}`} />
          <span className={`text-xs ${strCfg.color}`}>{strCfg.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {insideZone && (
            <span className="text-purple-400 text-xs font-bold animate-pulse">⚡ DANS LA ZONE</span>
          )}
          {approaching && !insideZone && (
            <span className="text-yellow-400 text-xs font-bold animate-pulse">🔔 Approche</span>
          )}
          <span className="text-gray-500 text-xs">{distPct}% de distance</span>
        </div>
      </div>

      {/* Zone haute / basse / milieu */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-500 mb-0.5">Haut</p>
          <p className={`font-mono font-semibold ${color}`}>{fvg.top.toFixed(4)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 mb-0.5">Milieu (entrée)</p>
          <p className="font-mono font-bold text-white">{fvg.midpoint.toFixed(4)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 mb-0.5">Bas</p>
          <p className={`font-mono font-semibold ${color}`}>{fvg.bottom.toFixed(4)}</p>
        </div>
      </div>

      {/* Taille de la zone */}
      <div className="flex justify-between mt-1.5 text-xs text-gray-500">
        <span>Taille : <span className="text-gray-300 font-mono">{fvg.size.toFixed(4)}</span></span>
        <span className={`font-semibold ${
          isBull ? 'text-green-400/70' : 'text-red-400/70'
        }`}>
          {isBull
            ? '→ Attendre retracement pour acheter'
            : '→ Attendre rebond pour vendre'}
        </span>
      </div>
    </div>
  )
}

export function FVGPanel() {
  const { analysis, currentTick } = useMarketStore()

  const fvgs   = analysis?.fvgs ?? []
  const nearest = analysis?.nearest_fvg_entry
  const price  = currentTick?.price ?? 0

  const bullFvgs = fvgs.filter(f => f.direction === 'bullish')
  const bearFvgs = fvgs.filter(f => f.direction === 'bearish')

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            Fair Value Gaps
            <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-normal">
              SMC
            </span>
          </h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Zones d'imbalance — le prix tend à les combler
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="bg-green-500/15 text-green-400 px-2 py-0.5 rounded font-bold">
            ▲ {bullFvgs.length}
          </span>
          <span className="bg-red-500/15 text-red-400 px-2 py-0.5 rounded font-bold">
            ▼ {bearFvgs.length}
          </span>
        </div>
      </div>

      {/* Explication rapide */}
      <div className="bg-gray-700/30 rounded-lg px-3 py-2 mb-4 text-xs text-gray-400 leading-relaxed">
        Un <span className="text-green-400 font-semibold">FVG haussier</span> sous le prix = zone d'achat potentielle si le prix recule.
        Un <span className="text-red-400 font-semibold">FVG baissier</span> au-dessus = zone de vente potentielle si le prix remonte.
        Entrez au <span className="text-white font-semibold">milieu de la zone</span>.
      </div>

      {/* FVG optimal pour le signal actuel */}
      {nearest && (
        <div className="mb-4 bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
          <p className="text-purple-400 text-xs font-bold mb-2">
            ⭐ FVG optimal pour le signal actuel
          </p>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-gray-400 text-xs">Zone</p>
              <p className="text-white font-mono font-bold">
                {nearest.bottom.toFixed(4)} – {nearest.top.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Entrée idéale</p>
              <p className="text-purple-300 font-mono font-bold text-lg">
                {nearest.midpoint.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Force</p>
              <p className={`font-semibold text-sm ${STRENGTH_CONFIG[nearest.strength].color}`}>
                {STRENGTH_CONFIG[nearest.strength].label}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Distance</p>
              <p className="text-white font-mono text-sm">
                {(Math.abs(nearest.midpoint - price) / price * 100).toFixed(3)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des FVG */}
      {fvgs.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">
          Aucun FVG détecté sur les 60 dernières bougies M15
        </p>
      ) : (
        <div className="space-y-3">
          {/* FVG haussiers */}
          {bullFvgs.length > 0 && (
            <div>
              <p className="text-green-400/70 text-xs font-semibold uppercase tracking-wide mb-2">
                Zones haussières (achat potentiel)
              </p>
              <div className="space-y-2">
                {bullFvgs.map((fvg, i) => (
                  <FVGRow key={i} fvg={fvg} currentPrice={price} />
                ))}
              </div>
            </div>
          )}

          {/* FVG baissiers */}
          {bearFvgs.length > 0 && (
            <div>
              <p className="text-red-400/70 text-xs font-semibold uppercase tracking-wide mb-2">
                Zones baissières (vente potentielle)
              </p>
              <div className="space-y-2">
                {bearFvgs.map((fvg, i) => (
                  <FVGRow key={i} fvg={fvg} currentPrice={price} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-gray-600 text-xs mt-4 pt-3 border-t border-gray-700/50">
        Calculé sur les 60 dernières bougies M15 · Zones non comblées uniquement
      </p>
    </div>
  )
}
